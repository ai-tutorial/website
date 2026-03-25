/**
 * CodeEditor component for embedding interactive code examples in StackBlitz
 *
 * @param {Object} props - Component props
 * @param {string} [props.file='src/hello_world.ts'] - Path to the file to display
 * @param {string|Object} [props.lines] - Line numbers to highlight (e.g., "10-20" or {start: 10, end: 20})
 * @param {string} [props.title='Code Example'] - Title for the code editor
 * @param {string} [props.repo='ai-tutorial/typescript-examples'] - GitHub repository path
 * @param {string} [props.height='650px'] - Height of the iframe
 * @param {string} props.functionName - Required. Name of the function being demonstrated (for documentation purposes)
 */
export const CodeEditor = ({
  file = 'src/hello_world.ts',
  lines,
  title = 'Code Example',
  repo = 'ai-tutorial/typescript-examples',
  height = '650px',
  functionName,
  theme: userTheme
}) => {
  // Constants must be inside the component — snippets are eval'd, not imported as modules
  const STORAGE_KEY = 'openai_api_key';
  const GEMINI_STORAGE_KEY = 'gemini_api_key';
  const PROVIDER_STORAGE_KEY = 'llm_playground_provider';

  // Validate required parameter
  if (!functionName) {
    console.warn('CodeEditor: functionName parameter is required');
  }
  const hasCreatedEnvRef = useRef(false);
  const vmRef = useRef(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [detectedTheme, setDetectedTheme] = useState('dark');

  // Theme detection logic
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setDetectedTheme(isDark ? 'dark' : 'light');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const theme = userTheme || detectedTheme;

  /**
   * Helper functions for managing OpenAI API key in localStorage
   * Note: Communication with StackBlitz is handled directly via SDK in CodeEmbed component
   */
  const [selectedProvider, setSelectedProvider] = useState(() => {
    if (typeof window === 'undefined') return 'gemini';
    return localStorage.getItem(PROVIDER_STORAGE_KEY) || 'gemini';
  });

  /**
   * Check if API key is configured
   * @returns {boolean} True if API key exists in localStorage
   */
  const isApiKeyConfigured = () => {
    const openaiKey = localStorage.getItem(STORAGE_KEY);
    const geminiKey = localStorage.getItem(GEMINI_STORAGE_KEY);
    return (openaiKey !== null && openaiKey.trim().length > 0) ||
           (geminiKey !== null && geminiKey.trim().length > 0);
  };

  /**
   * Dispatch custom event when API key changes
   * Components can listen to this event with: window.addEventListener('apiKeyChanged', handler)
   */
  const dispatchApiKeyChanged = () => {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('apiKeyChanged', {
        detail: { configured: isApiKeyConfigured() }
      }));
    }
  };

  /**
   * Save the OpenAI API key to localStorage
   * @param {string} apiKey - The OpenAI API key to save
   * @returns {boolean} True if the key was saved successfully
   */
  const saveApiKey = (apiKey) => {
    if (apiKey && apiKey.trim()) {
      const trimmedKey = apiKey.trim();
      localStorage.setItem(STORAGE_KEY, trimmedKey);

      // Dispatch custom event for components to listen to
      dispatchApiKeyChanged();

      return true;
    }
    return false;
  };

  /**
   * Create or update .env file in StackBlitz VM
   */
  const buildEnvContent = () => {
    const openaiKey = localStorage.getItem(STORAGE_KEY)?.trim();
    const geminiKey = localStorage.getItem(GEMINI_STORAGE_KEY)?.trim();

    if (!openaiKey && !geminiKey) {
      return `OPENAI_MODEL=gpt-4.1-nano
OPENAI_API_KEY=sk-mock-key-1234567890abcdef
GEMINI_MODEL=gemini-2.5-flash-lite
GOOGLE_GENERATIVE_AI_API_KEY=
AI_PROVIDER=openai
# API key not found in browser storage
# To configure your API key:
# 1. For Gemini (free): Go to https://aistudio.google.com/apikey
# 2. For OpenAI: Go to https://platform.openai.com/api-keys
# 3. Enter it in the configuration form above this editor
# 4. The .env file will be automatically updated with your key`;
    }

    const envLines = ['# Using the API key(s) you configured. This file will be created when the dialog is loaded.'];
    if (openaiKey) {
      envLines.push(`OPENAI_MODEL=gpt-4.1-nano`);
      envLines.push(`OPENAI_API_KEY=${openaiKey}`);
    }
    if (geminiKey) {
      envLines.push(`GEMINI_MODEL=gemini-2.5-flash-lite`);
      envLines.push(`GOOGLE_GENERATIVE_AI_API_KEY=${geminiKey}`);
    }
    envLines.push(`AI_PROVIDER=${geminiKey ? 'gemini' : 'openai'}`);
    return envLines.join('\n');
  };

  const updateEnvFile = async (vm) => {
    if (!vm) return;

    try {
      await vm.applyFsDiff({
        create: {
          'env/.env': buildEnvContent(),
          'env/run.conf': `file=${file}`
        },
        destroy: []
      });
      hasCreatedEnvRef.current = true;
    } catch (error) {
      console.error('Failed to write env files:', error);
      hasCreatedEnvRef.current = false;
    }
  };

  // Check if API key is configured on mount and listen for changes
  useEffect(() => {
    if (!isApiKeyConfigured()) {
      setShowApiKeyDialog(true);
    }

    // Listen for API key changes from other widgets on the same page
    const handleApiKeyChanged = () => {
      if (isApiKeyConfigured()) {
        setShowApiKeyDialog(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('apiKeyChanged', handleApiKeyChanged);

      return () => {
        window.removeEventListener('apiKeyChanged', handleApiKeyChanged);
      };
    }
  }, []);

  /**
   * Validate OpenAI API key by making a test request
   * @param {string} key - The API key to validate
   * @returns {Promise<{valid: boolean, error?: string}>} Validation result
   */
  const validateApiKey = async (key, provider) => {
    try {
      const url = provider === 'gemini'
        ? 'https://generativelanguage.googleapis.com/v1beta/models?key=' + encodeURIComponent(key.trim())
        : 'https://api.openai.com/v1/models';
      const headers = provider === 'gemini'
        ? { 'Content-Type': 'application/json' }
        : { 'Authorization': `Bearer ${key.trim()}`, 'Content-Type': 'application/json' };

      const response = await fetch(url, { method: 'GET', headers });

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key. Please check your key and try again.' };
      } else if (response.status === 429) {
        return { valid: false, error: 'Rate limit exceeded. Please try again later.' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: errorData.error?.message || `API request failed with status ${response.status}`
        };
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        return { valid: false, error: 'Network error. Please check your connection and try again.' };
      }
      return { valid: false, error: err.message || 'Failed to validate API key. Please try again.' };
    }
  };

  // Handle skip configuration
  const handleSkipConfiguration = () => {
    const skipKey = 'sk-<configure-your-key>';
    saveApiKey(skipKey);
    setShowApiKeyDialog(false);
  };

  // Handle API key form submission
  const handleApiKeySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    if (!apiKey || !apiKey.trim()) {
      setError(`Please enter your ${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`);
      setIsSubmitting(false);
      return;
    }

    // Basic format validation
    const trimmedKey = apiKey.trim();
    if (selectedProvider === 'openai' && !trimmedKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys should start with "sk-"');
      setIsSubmitting(false);
      return;
    }

    // Validate the API key
    setIsValidating(true);
    setError('');
    const validation = await validateApiKey(trimmedKey, selectedProvider);
    setIsValidating(false);

    if (!validation.valid) {
      setError(validation.error || 'Invalid API key. Please check your key and try again.');
      setIsSubmitting(false);
      return;
    }

    // Key is valid, save it
    try {
      const storageKey = selectedProvider === 'gemini' ? GEMINI_STORAGE_KEY : STORAGE_KEY;
      localStorage.setItem(storageKey, trimmedKey);
      localStorage.setItem(PROVIDER_STORAGE_KEY, selectedProvider);
      dispatchApiKeyChanged();
      setSuccess(true);
      setApiKey('');

      // Reload the page after a short delay to show success message
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to save API key. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Get the base file path (without line numbers) for execution
  const baseFilePath = file || 'src/hello_world.ts';

  // Build the file path with optional line numbers for display
  let filePath = baseFilePath;
  if (typeof lines === 'string' && lines.trim()) {
    const lineParts = lines.split('-');
    if (lineParts.length === 2) {
      filePath = `${filePath}:L${lineParts[0].trim()}-L${lineParts[1].trim()}`;
    } else {
      filePath = `${filePath}:L${lineParts[0].trim()}`;
    }
  } else if (typeof lines === 'object' && lines.start !== undefined) {
    filePath = lines.end !== undefined
      ? `${filePath}:L${lines.start}-L${lines.end}`
      : `${filePath}:L${lines.start}`;
  }

  // Build StackBlitz iframe URL
  const stackblitzUrl = `https://stackblitz.com/github/${repo}?file=${encodeURIComponent(filePath)}&embed=1&view=editor&theme=${theme}`;

  // Load SDK dynamically
  const loadSDK = () => {
    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.StackBlitzSDK || window.stackblitzSDK) {
        resolve(window.StackBlitzSDK || window.stackblitzSDK);
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[data-stackblitz-sdk]')) {
        // Wait for it to load
        const checkInterval = setInterval(() => {
          if (window.StackBlitzSDK || window.stackblitzSDK) {
            clearInterval(checkInterval);
            resolve(window.StackBlitzSDK || window.stackblitzSDK);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('SDK loading timeout'));
        }, 10000);
        return;
      }

      // Load the SDK script
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@stackblitz/sdk/bundles/sdk.umd.js';
      script.async = true;
      script.setAttribute('data-stackblitz-sdk', 'true');
      script.onload = () => {
        const sdk = window.StackBlitzSDK || window.stackblitzSDK;
        if (sdk) {
          resolve(sdk);
        } else {
          reject(new Error('SDK loaded but not available on window'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load StackBlitz SDK'));
      };
      document.head.appendChild(script);
    });
  };

  const LOAD_TIMEOUT_MS = 10000;
  const iframeElRef = useRef(null);
  const reloadCountRef = useRef(0);
  const handleRetry = () => {
    vmRef.current = null;
    hasCreatedEnvRef.current = false;
    reloadCountRef.current = 0;
    setIsStuck(false);
    setIframeKey(prev => prev + 1);
  };

  // Callback ref to track the iframe element for SDK connect
  const iframeRef = (iframe) => {
    iframeElRef.current = iframe;
  };

  // Connect to the StackBlitz VM via SDK
  const connectToVM = async (iframe) => {
    const sdk = await loadSDK();
    return sdk.connect(iframe);
  };

  // Handle iframe load event — called via onLoad prop to avoid race conditions.
  // On success: connect SDK, write env files, done — no reload needed.
  // On connection failure: two reloads to recover corrupted FS.
  // Known issues:
  //   https://github.com/stackblitz/core/issues/2849
  //   https://github.com/stackblitz/core/issues/2847
  //   https://github.com/stackblitz/webcontainer-core/issues/2075
  const handleIframeLoad = async () => {
    const iframe = iframeElRef.current;
    if (!iframe) return;

    // After first iframe refresh — try to connect, then reveal
    if (reloadCountRef.current > 0) {
      try {
        const vm = await connectToVM(iframe);
        vmRef.current = vm;
        await updateEnvFile(vm);
      } catch (_) {
        // Best effort
      }
      return;
    }

    // Initial load — connect with timeout
    try {
      if (vmRef.current) return;

      const vm = await Promise.race([
        connectToVM(iframe),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('connect timeout')), LOAD_TIMEOUT_MS)
        )
      ]);

      vmRef.current = vm;
      await updateEnvFile(vm);
    } catch (error) {
      console.error('Failed to connect to StackBlitz VM:', error);
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'load_refresh_error', {
          event_category: 'stackblitz',
          event_label: file,
          error_message: error.message,
        });
      }
      // Connection failed — refresh iframe once to recover
      reloadCountRef.current = 1;
      setTimeout(() => {
        setIframeKey(prev => prev + 1);
      }, 2000);
    }
  };

  // Safari is not supported by StackBlitz WebContainers
  const isSafari = typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isSafari) {
    return (
      <div
        className="code-editor-dialog-container"
        style={{ height: height }}
      >
        <div className="code-editor-dialog-box">
          <h2 className="code-editor-dialog-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Browser Not Supported
          </h2>
          <p className="code-editor-dialog-description">
            The interactive code editor is not supported on Safari. Please use <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Firefox</strong> to run the examples.
          </p>
        </div>
      </div>
    );
  }

  // Show API key configuration dialog if not configured
  if (showApiKeyDialog) {
    return (
      <div
        className="code-editor-dialog-container"
        style={{ height: height }}
      >
        <div className="code-editor-dialog-box">
          <h2 className="code-editor-dialog-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Configure API Key
          </h2>

          <p className="code-editor-dialog-description">
            All interactive examples execute entirely within your browser environment, ensuring complete security and privacy.
            Your API key is stored locally in your browser's storage and is never transmitted to external servers.
          </p>

          <div className="llm-provider-tabs" style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => { setSelectedProvider('gemini'); setError(''); setApiKey(''); }}
              className={`llm-provider-tab ${selectedProvider === 'gemini' ? 'llm-provider-tab-active' : ''}`}
            >
              Gemini <span className="llm-provider-tab-badge">Free</span>
            </button>
            <button
              type="button"
              onClick={() => { setSelectedProvider('openai'); setError(''); setApiKey(''); }}
              className={`llm-provider-tab ${selectedProvider === 'openai' ? 'llm-provider-tab-active' : ''}`}
            >
              OpenAI
            </button>
          </div>

          {selectedProvider === 'gemini' && (
            <div className="llm-gemini-recommendation" style={{ marginBottom: '16px' }}>
              Gemini offers a generous free tier — great for learning! Get your free API key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="code-editor-link"
              >
                aistudio.google.com/apikey
              </a>
            </div>
          )}

          {selectedProvider === 'openai' && (
            <div className="code-editor-info-box">
              <p className="code-editor-info-box-title">
                Don't have an API key?
              </p>
              <p className="code-editor-info-box-text">
                Get one at{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="code-editor-link"
                >
                  platform.openai.com/api-keys
                </a>
              </p>
            </div>
          )}

          <form onSubmit={handleApiKeySubmit}>
            <div className="code-editor-form-group">
              <label
                htmlFor="api-key-input"
                className="code-editor-label"
              >
                {selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key
              </label>
              <input
                id="api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                  setSuccess(false);
                }}
                placeholder={selectedProvider === 'openai' ? 'sk-...' : 'Gemini API Key'}
                disabled={isSubmitting}
                className={`code-editor-input ${error ? 'code-editor-input-error' : ''}`}
              />
            </div>

            {isValidating && (
              <div className="code-editor-message code-editor-message-info">
                <span className="code-editor-message-icon">⏳</span>
                <span>Validating API key...</span>
              </div>
            )}

            {error && !isValidating && (
              <div className="code-editor-message code-editor-message-error">
                <span className="code-editor-message-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="code-editor-message code-editor-message-success">
                <span className="code-editor-message-icon">✓</span>
                <span>API key saved successfully! Loading editor...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isValidating || !apiKey.trim()}
              className="code-editor-button"
            >
              {isValidating ? 'Validating...' : isSubmitting ? 'Saving...' : 'Save API Key'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSkipConfiguration}
            disabled={isSubmitting || isValidating}
            className="code-editor-button-secondary"
          >
            Skip Configuration
          </button>

          <div className="code-editor-footer">
            <p className="code-editor-footer-text">
              Alternatively, you may checkout the source code from{' '}
              <a
                href="https://github.com/ai-tutorial/typescript-examples"
                target="_blank"
                rel="noopener noreferrer"
                className="code-editor-link code-editor-link-break"
              >
                https://github.com/ai-tutorial/typescript-examples
              </a>
              {' '}and run the examples locally.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const toggleMaximize = () => setIsMaximized(!isMaximized);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div
      className={`code-editor-wrapper ${isMaximized ? 'maximized' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      data-theme={theme}
    >
      {!isMaximized && (
        <div className="code-editor-header">
          <div className="code-editor-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            {title}
          </div>
          <div className="code-editor-controls">
            <button
              className="code-editor-collapse-button"
              onClick={toggleCollapse}
              title={isCollapsed ? "Expand" : "Collapse"}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isCollapsed
                  ? <polyline points="6 9 12 15 18 9" />
                  : <polyline points="6 15 12 9 18 15" />
                }
              </svg>
            </button>
            <button
              className="code-editor-maximize-button"
              onClick={toggleMaximize}
              title="Maximize (Focus Mode)"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isMaximized && (
        <button
          className="code-editor-maximize-button floating-minimize"
          onClick={toggleMaximize}
          title="Minimize"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="M14 10l7-7" /><path d="M3 21l7-7" />
          </svg>
        </button>
      )}

      {!isCollapsed && (
        <div style={{ position: 'relative', height: isMaximized ? 'auto' : height, flex: isMaximized ? 1 : 'none' }}>
          <iframe
            key={iframeKey}
            ref={iframeRef}
            onLoad={handleIframeLoad}
            src={stackblitzUrl}
            className="code-editor-iframe"
            style={{ height: '100%', flex: isMaximized ? 1 : 'none' }}
            title={title || 'Code Example'}
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; xr-spatial-tracking"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          />

          {isStuck && (
            <div className="code-editor-stuck-overlay">
              <div className="code-editor-stuck-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <p>StackBlitz is taking too long to load. This can happen when the repository was recently updated.</p>
                <button
                  type="button"
                  className="code-editor-button"
                  onClick={handleRetry}
                  style={{ marginTop: '8px' }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

