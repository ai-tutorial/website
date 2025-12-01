export const IFrameCodeEmbed = ({ 
  file = 'src/hello_world.ts', 
  lines, 
  title = 'Code Example',
  repo = 'veigap/ai-example-wip',
  height = '650px'
}) => {
  const hasCreatedEnvRef = useRef(false);
  const vmRef = useRef(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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
   * Remove the OpenAI API key from localStorage
   */
  const removeApiKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    dispatchApiKeyChanged();
  };

  /**
   * Create or update .env file in StackBlitz VM
   */
  const updateEnvFile = async (vm) => {
    if (!vm) {
      return;
    }

    try {
      // Get the base file path (without line numbers)
      const baseFilePath = file || 'src/hello_world.ts';
      
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
OPENAI_API_KEY=${apiKey.trim()}`;
      } else {
        // Use mock key if not configured
        envContent = `OPENAI_API_KEY=sk-mock-key-1234567890abcdef
# API key not found in browser storage
# To configure your API key:
# 1. Go to https://platform.openai.com/api-keys
# 2. Create a new API key
# 3. Enter it in the configuration form above this editor
# 4. The .env file will be automatically updated with your key`;
      }

      // Create script.conf with the file name in .api-tutorial directory
      const configContent = `file=${baseFilePath}`;

      await vm.applyFsDiff({
        create: {
          '.env': envContent,
          '.api-tutorial/script.conf': configContent
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
    setError('Validating API key...');
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
        
        // Hide dialog and show iframe after a brief delay
        setTimeout(() => {
          setShowApiKeyDialog(false);
        }, 500);
      } else {
        setError('Failed to save API key. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save API key. Please try again.');
    } finally {
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
  const stackblitzUrl = `https://stackblitz.com/github/${repo}?file=${encodeURIComponent(filePath)}&embed=1&view=editor`;

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

  // Callback ref to handle iframe mounting
  const iframeRef = (iframe) => {
    if (!iframe) {
      return;
    }

    const handleLoad = async () => {
      // Wait for iframe to be ready
      setTimeout(async () => {
        try {
          // Load SDK and connect to VM
          const sdk = await loadSDK();
          
          // Prevent multiple connections
          if (vmRef.current) {
            return;
          }

          const vm = await sdk.connect(iframe);
          vmRef.current = vm;
          
          // Wait for VM to be fully ready before creating .env file
          setTimeout(async () => {
            if (!hasCreatedEnvRef.current && vm) {
              await updateEnvFile(vm);
            }
          }, 2000);
        } catch (error) {
          // Connection failed, will retry on next iframe load or API key change
        }
      }, 2000);
    };

    iframe.addEventListener('load', handleLoad);
    
    // If iframe is already loaded, connect immediately
    try {
      if (iframe.contentDocument?.readyState === 'complete') {
        handleLoad();
      }
    } catch (e) {
      // CORS: Cannot access iframe.contentDocument, wait for load event
    }
  };

  // Show API key configuration dialog if not configured
  if (showApiKeyDialog) {
    return (
      <div
        style={{
          width: '100%',
          height: height,
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#f8fafc',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '1rem',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1a202c',
            }}
          >
            Configure OpenAI API Key
          </h2>
          
          <p
            style={{
              marginBottom: '1.5rem',
              color: '#4a5568',
              lineHeight: '1.6',
            }}
          >
            To run the interactive examples, you need to configure your OpenAI API key. 
            Your key will be stored locally in your browser and sent to the StackBlitz editor.
          </p>

          <form onSubmit={handleApiKeySubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="api-key-input"
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#2d3748',
                }}
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
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: error ? '1px solid #e53e3e' : '1px solid #cbd5e0',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  backgroundColor: '#fed7d7',
                  border: '1px solid #fc8181',
                  borderRadius: '4px',
                  color: '#c53030',
                  fontSize: '0.875rem',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  backgroundColor: '#c6f6d5',
                  border: '1px solid #68d391',
                  borderRadius: '4px',
                  color: '#22543d',
                  fontSize: '0.875rem',
                }}
              >
                ✓ API key saved successfully! Loading editor...
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isValidating || !apiKey.trim()}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: 500,
                color: 'white',
                backgroundColor: isSubmitting || isValidating || !apiKey.trim() ? '#a0aec0' : '#3182ce',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting || isValidating || !apiKey.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {isValidating ? 'Validating...' : isSubmitting ? 'Saving...' : 'Save API Key'}
            </button>
          </form>

          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              fontSize: '0.75rem',
              color: '#718096',
            }}
          >
            <p style={{ margin: 0, marginBottom: '0.5rem' }}>
              <strong>Don't have an API key?</strong>
            </p>
            <p style={{ margin: 0 }}>
              Get one at{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3182ce', textDecoration: 'none' }}
              >
                platform.openai.com/api-keys
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={stackblitzUrl}
      style={{
        width: '100%',
        height: height,
        border: '0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
      title={title || 'Code Example'}
      allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
      sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
    />
  );
};

