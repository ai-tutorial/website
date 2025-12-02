import { useRef, useState, useEffect } from 'react';

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
  functionName
}) => {
  // Validate required parameter
  if (!functionName) {
    console.warn('CodeEditor: functionName parameter is required');
  }
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
        setShowApiKeyDialog(false);
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
        style={{
          width: '100%',
          height: height,
          border: 'none',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#0f0f0f',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#1a1a1a',
            padding: '2.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
            border: '2px solid #f59e0b',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '1.25rem',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#f5f5f5',
              letterSpacing: '-0.025em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Configure OpenAI API Key
          </h2>
          
          <p
            style={{
              marginBottom: '1rem',
              color: '#a3a3a3',
              lineHeight: '1.7',
              fontSize: '0.875rem',
            }}
          >
            All interactive examples execute entirely within your browser environment, ensuring complete security and privacy. 
            Your API key is stored locally in your browser's storage and is never transmitted to external servers.
          </p>

          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.25rem',
              backgroundColor: '#151515',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              color: '#a3a3a3',
              lineHeight: '1.6',
              border: '1px solid #262626',
            }}
          >
            <p style={{ margin: 0, marginBottom: '0.5rem', fontWeight: 600, color: '#d4d4d4' }}>
              Don't have an API key?. 
            </p>
            <p style={{ margin: 0 }}>
              Get one at{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none',
                  fontWeight: 500,
                  borderBottom: '1px solid transparent',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderBottomColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
              >
                platform.openai.com/api-keys
              </a>
            </p>
          </div>

          <form onSubmit={handleApiKeySubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="api-key-input"
                style={{
                  display: 'block',
                  marginBottom: '0.625rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#d4d4d4',
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
                  padding: '0.875rem',
                  fontSize: '0.8125rem',
                  backgroundColor: '#0f0f0f',
                  color: '#f5f5f5',
                  border: error ? '2px solid #ef4444' : '2px solid #262626',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? '#ef4444' : '#262626';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '0.875rem 1rem',
                  marginBottom: '1.25rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '0.875rem 1rem',
                  marginBottom: '1.25rem',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  color: '#4ade80',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1rem' }}>✓</span>
                <span>API key saved successfully! Loading editor...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isValidating || !apiKey.trim()}
              style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'white',
                backgroundColor: isSubmitting || isValidating || !apiKey.trim() ? '#1a1a1a' : '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitting || isValidating || !apiKey.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                marginBottom: '0.875rem',
                boxShadow: isSubmitting || isValidating || !apiKey.trim() ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isValidating && apiKey.trim()) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && !isValidating && apiKey.trim()) {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }
              }}
            >
              {isValidating ? 'Validating...' : isSubmitting ? 'Saving...' : 'Save API Key'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleSkipConfiguration}
            disabled={isSubmitting || isValidating}
            style={{
              width: '100%',
              padding: '0.625rem 1rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#737373',
              backgroundColor: 'transparent',
              border: '1px solid #262626',
              borderRadius: '6px',
              cursor: isSubmitting || isValidating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && !isValidating) {
                e.target.style.backgroundColor = '#151515';
                e.target.style.borderColor = '#404040';
                e.target.style.color = '#a3a3a3';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting && !isValidating) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = '#262626';
                e.target.style.color = '#737373';
              }
            }}
          >
            Skip Configuration
          </button>

          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #262626',
              fontSize: '0.75rem',
              color: '#737373',
              lineHeight: '1.6',
            }}
          >
            <p style={{ margin: 0 }}>
              Alternatively, you may checkout the source code from{' '}
              <a
                href="https://github.com/ai-tutorial/typescript-examples"
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none',
                  fontWeight: 500,
                  borderBottom: '1px solid transparent',
                  transition: 'border-color 0.2s',
                  wordBreak: 'break-all',
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderBottomColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderBottomColor = 'transparent';
                }}
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

