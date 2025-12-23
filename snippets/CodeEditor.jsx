
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
  // Validate required parameter
  if (!functionName) {
    console.warn('CodeEditor: functionName parameter is required');
  }
  const hasCreatedEnvRef = useRef(false);
  const vmRef = useRef(null);
  const [isMaximized, setIsMaximized] = useState(false);
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
  const STORAGE_KEY = 'openai_api_key';

  /**
   * Check if API key is configured
   * @returns {boolean} True if API key exists in localStorage
   */
  const isApiKeyConfigured = () => {
    const key = localStorage.getItem(STORAGE_KEY);
    return key !== null && key.trim().length > 0;
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
   * Get the OpenAI API key from localStorage
   * @returns {string|null} The stored API key or null if not found
   */
  const getApiKey = () => {
    return localStorage.getItem(STORAGE_KEY);
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
  const updateEnvFile = async (vm) => {
    if (!vm) {
      return;
    }

    try {
      // Use isApiKeyConfigured to check if key is properly configured
      const configured = isApiKeyConfigured();
      let envContent;

      if (configured) {
        // Get the stored key and use it
        const apiKey = getApiKey();
        if (!apiKey) {
          return;
        }
        envContent = `# Using the API key you configured. This file will be created when the dialog is loaded.
OPENAI_MODEL=gpt-4o-mini
OPENAI_API_KEY=${apiKey.trim()}`;
      } else {
        // Use mock key if not configured
        envContent = `OPENAI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-mock-key-1234567890abcdef
# API key not found in browser storage
# To configure your API key:
# 1. Go to https://platform.openai.com/api-keys
# 2. Create a new API key
# 3. Enter it in the configuration form above this editor
# 4. The .env file will be automatically updated with your key`;
      }

      // Create run.conf with the file name in env directory
      const baseFilePath = file || 'src/hello_world.ts';
      const configContent = `file=${baseFilePath}`;

      await vm.applyFsDiff({
        create: {
          'env/.env': envContent,
          'env/run.conf': configContent
        },
        destroy: []
      });
      hasCreatedEnvRef.current = true;
    } catch (error) {
      hasCreatedEnvRef.current = false; // Allow retry on error
    }
  };

  // Check if API key is configured on mount and listen for changes
  useEffect(() => {
    if (!isApiKeyConfigured()) {
      setShowApiKeyDialog(true);
    }

    // Listen for API key changes to update .env file
    const handleApiKeyChanged = () => {
      // If API key was just configured and VM is available, update .env file
      if (isApiKeyConfigured() && vmRef.current) {
        hasCreatedEnvRef.current = false; // Reset flag to allow update
        updateEnvFile(vmRef.current);
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
  const validateApiKey = async (key) => {
    try {
      // Make a lightweight request to validate the key
      // Using the models endpoint as it's simple and doesn't consume credits
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { valid: true };
      } else if (response.status === 401) {
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
      // Network errors or other issues
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
      setError('Please enter your OpenAI API key');
      setIsSubmitting(false);
      return;
    }

    // Basic format validation
    const trimmedKey = apiKey.trim();
    if (!trimmedKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys should start with "sk-"');
      setIsSubmitting(false);
      return;
    }

    // Validate the API key with OpenAI
    setIsValidating(true);
    setError(''); // Clear any previous errors
    const validation = await validateApiKey(trimmedKey);
    setIsValidating(false);

    if (!validation.valid) {
      setError(validation.error || 'Invalid API key. Please check your key and try again.');
      setIsSubmitting(false);
      return;
    }

    // Key is valid, save it
    try {
      const saved = saveApiKey(trimmedKey);
      if (saved) {
        setSuccess(true);
        setApiKey('');

        // Reload the page after a short delay to show success message
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError('Failed to save API key. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to save API key. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Get the base file path (without line numbers) for execution
  const baseFilePath = file || 'src/hello_world.ts';

  // Build the file path with optional line numbers for display
  let filePath = baseFilePath;
  if (lines) {
    if (typeof lines === 'string' && lines.trim()) {
      const lineParts = lines.split('-');
      if (lineParts.length === 2) {
        filePath = `${filePath}:L${lineParts[0].trim()}-L${lineParts[1].trim()}`;
      } else if (lineParts[0] && lineParts[0].trim()) {
        filePath = `${filePath}:L${lineParts[0].trim()}`;
      }
    } else if (lines && typeof lines === 'object' && lines.start !== undefined) {
      if (lines.end !== undefined) {
        filePath = `${filePath}:L${lines.start}-L${lines.end}`;
      } else {
        filePath = `${filePath}:L${lines.start}`;
      }
    }
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

  // ==================== STYLES ====================
  // Styles are now in style.css - using CSS classes instead

  // Callback ref to handle iframe mounting
  const iframeRef = (iframe) => {
    if (!iframe) {
      return;
    }

    const handleLoad = async () => {
      try {
        // Load SDK and connect to VM
        const sdk = await loadSDK();

        // Prevent multiple connections
        if (vmRef.current) {
          return;
        }

        const vm = await sdk.connect(iframe);
        vmRef.current = vm;

        // Create .env file once VM is connected
        if (!hasCreatedEnvRef.current && vm) {
          await updateEnvFile(vm);
        }
      } catch (error) {
        console.error('Failed to connect to StackBlitz VM:', error);
        // Connection failed, will retry on next iframe load or API key change
      }
    };

    iframe.addEventListener('load', handleLoad);
    // Note: Event listener cleanup is handled automatically when iframe element is removed by React
  };

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
            Configure OpenAI API Key
          </h2>

          <p className="code-editor-dialog-description">
            All interactive examples execute entirely within your browser environment, ensuring complete security and privacy.
            Your API key is stored locally in your browser's storage and is never transmitted to external servers.
          </p>

          <div className="code-editor-info-box">
            <p className="code-editor-info-box-title">
              Don't have an API key?.
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

          <form onSubmit={handleApiKeySubmit}>
            <div className="code-editor-form-group">
              <label
                htmlFor="api-key-input"
                className="code-editor-label"
              >
                OpenAI API Key
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
                placeholder="sk-..."
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

  return (
    <div
      className={`code-editor-wrapper ${isMaximized ? 'maximized' : ''}`}
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

      <iframe
        ref={iframeRef}
        src={stackblitzUrl}
        className="code-editor-iframe"
        style={{ height: isMaximized ? 'auto' : height, flex: isMaximized ? 1 : 'none' }}
        title={title || 'Code Example'}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
      />
    </div>
  );
};

