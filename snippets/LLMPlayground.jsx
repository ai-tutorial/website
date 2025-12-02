import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * LLMPlayground component for interactive LLM testing
 * 
 * @param {Object} props - Component props
 * @param {string} [props.defaultInput=''] - Default input text
 * @param {string} [props.defaultModel='gpt-4o-mini'] - Default model
 * @param {number} [props.defaultTemperature=0.7] - Default temperature
 * @param {string} [props.height='600px'] - Height of the component
 * @param {boolean} [props.keepOutput=false] - If true, append new responses instead of overwriting
 */
export const LLMPlayground = ({
  defaultInput = '',
  defaultModel = 'gpt-4o-mini',
  defaultTemperature = 0.7,
  height = '600px',
  keepOutput = false
}) => {
  // Constants
  const STORAGE_KEY = 'openai_api_key';
  const SETTINGS_PANEL_KEY = 'llm_playground_settings_open';
  const SETTINGS_PANEL_WIDTH = 220;
  
  // Available models
  const models = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  // State
  const [input, setInput] = useState(defaultInput);
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemperature);
  const [apiKey, setApiKey] = useState('');
  const [responseCount, setResponseCount] = useState(0);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Load settings panel state from localStorage
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(SETTINGS_PANEL_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  // Save settings panel state to localStorage when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SETTINGS_PANEL_KEY, String(isSettingsOpen));
  }, [isSettingsOpen]);

  // Inject CSS animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Handle API key configuration
  const handleApiKeySubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSavingKey(true);
    setError('');

    if (!apiKeyInput.trim()) {
      setError('Please enter your OpenAI API key');
      setIsSavingKey(false);
      return;
    }

    const trimmedKey = apiKeyInput.trim();
    if (!trimmedKey.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI API keys should start with "sk-"');
      setIsSavingKey(false);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, trimmedKey);
      setApiKey(trimmedKey);
      setApiKeyInput('');
    } catch (err) {
      setError('Failed to save API key. Please try again.');
    } finally {
      setIsSavingKey(false);
    }
  }, [apiKeyInput]);

  // Filter out comment lines (starting with //) from the input
  const filterComments = useCallback((text) => {
    return text
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n')
      .trim();
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }
    
    if (!input.trim() || !apiKey || isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');
    
    if (!keepOutput) {
      setOutput('');
      setResponseCount(0);
    }

    // Filter out comment lines before sending to API
    const filteredInput = filterComments(input);
    
    if (!filteredInput) {
      setError('Please enter a prompt (comments are not sent to the API)');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: filteredInput }],
          temperature,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to get response from OpenAI`);
      }

      const data = await response.json();
      const newResponse = data.choices[0]?.message?.content || 'No response generated';
      
      if (keepOutput && output) {
        const nextCount = responseCount + 1;
        setResponseCount(nextCount);
        setOutput(prev => prev + `\n\nResponse ${nextCount}: ` + newResponse);
      } else {
        setResponseCount(1);
        const prefix = keepOutput ? 'Response 1: ' : '';
        setOutput(prefix + newResponse);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  }, [input, apiKey, isLoading, keepOutput, output, responseCount]);

  // Parse responses for display
  const parsedResponses = useMemo(() => {
    if (!output || !keepOutput || !output.includes('Response ')) {
      return null;
    }

    const responses = [];
    const regex = /Response (\d+):\s*([\s\S]*?)(?=\n\nResponse \d+:|$)/g;
    let match;

    while ((match = regex.exec(output)) !== null) {
      const number = parseInt(match[1], 10);
      const content = match[2].trim();
      if (content) {
        responses.push({ number, content });
      }
    }

    if (responses.length === 0 && output.startsWith('Response 1:')) {
      const firstMatch = output.match(/Response 1:\s*(.*)/s);
      if (firstMatch) {
        responses.push({ number: 1, content: firstMatch[1].trim() });
      }
    }

    return responses.length > 0 ? responses : null;
  }, [output, keepOutput]);

  // Shared styles
  const styles = {
    sectionLabel: {
      marginBottom: '6px',
      color: '#a3a3a3',
      fontSize: '10px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    textareaBase: {
      flex: 1,
      width: '100%',
      backgroundColor: '#1a1a1a',
      border: '1px solid #262626',
      borderRadius: '6px',
      padding: '10px',
      fontSize: '0.8em',
      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontWeight: 'normal',
      fontFeatureSettings: 'normal',
      fontVariationSettings: 'normal',
      lineHeight: '18px',
      letterSpacing: '0px',
      resize: 'none',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
    },
    textareaEnabled: {
      color: '#f5f5f5',
    },
    textareaDisabled: {
      color: '#525252',
      cursor: 'not-allowed',
    },
    errorMessage: {
      padding: '8px 10px',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '6px',
      color: '#f87171',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    responseBox: {
      color: '#e5e5e5',
      fontSize: '0.8em',
      fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontWeight: 'normal',
      fontFeatureSettings: 'normal',
      fontVariationSettings: 'normal',
      lineHeight: '18px',
      letterSpacing: '0px',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      padding: '12px',
      backgroundColor: '#1a1a1a',
      borderRadius: '6px',
      border: '1px solid #262626',
    },
  };

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: '#0f0f0f',
        borderRadius: '12px',
        border: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Main content area */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Settings toggle button */}
        {apiKey && (
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          style={{
            position: 'absolute',
            top: '12px',
            right: isSettingsOpen ? `${SETTINGS_PANEL_WIDTH}px` : '12px',
            zIndex: 10,
            background: isSettingsOpen ? '#2a2a2a' : 'rgba(26, 26, 26, 0.9)',
            border: '1px solid #2a2a2a',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d4d4d4',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#2a2a2a';
            e.target.style.borderColor = '#3a3a3a';
          }}
          onMouseLeave={(e) => {
            if (!isSettingsOpen) {
              e.target.style.backgroundColor = 'rgba(26, 26, 26, 0.9)';
              e.target.style.borderColor = '#2a2a2a';
            }
          }}
          aria-label="Toggle settings"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isSettingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            {isSettingsOpen ? (
              <polyline points="9 18 15 12 9 6"></polyline>
            ) : (
              <polyline points="15 18 9 12 15 6"></polyline>
            )}
          </svg>
        </button>
        )}

        {/* Main input/output area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Input section */}
          <div
            style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              overflow: 'hidden',
              borderBottom: '1px solid #1a1a1a',
              backgroundColor: '#0f0f0f',
            }}
          >
            {!apiKey ? (
              // API Key Configuration Form
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '16px',
                  border: '2px solid #f59e0b',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.05)',
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3
                    style={{
                      margin: '0 0 8px 0',
                      color: '#f5f5f5',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>Configure Open API Key to make the most of the tutorial</span>
                  </h3>
                  <p
                    style={{
                      margin: '0',
                      color: '#a3a3a3',
                      fontSize: '11px',
                      lineHeight: '1.5',
                    }}
                  >
                    Your API key is stored locally in your browser's storage and is never transmitted to external servers.{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      Don't have an API key? Get one here
                    </a>
                  </p>
                </div>
                
                <form onSubmit={handleApiKeySubmit}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <input
                        id="api-key-input"
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => {
                          setApiKeyInput(e.target.value);
                          setError('');
                        }}
                        placeholder="OpenAI API Key (sk-...)"
                        disabled={isSavingKey}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: '#1a1a1a',
                          color: '#f5f5f5',
                          border: error ? '1px solid #ef4444' : '1px solid #262626',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontFamily: 'Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace',
                          fontWeight: 'normal',
                          fontFeatureSettings: '"liga" 0, "calt" 0',
                          lineHeight: '18px',
                          letterSpacing: '0px',
                          boxSizing: 'border-box',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                          if (!error) {
                            e.target.style.borderColor = '#3b82f6';
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = error ? '#ef4444' : '#262626';
                        }}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isSavingKey || !apiKeyInput.trim()}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: isSavingKey || !apiKeyInput.trim() ? '#1a1a1a' : '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: isSavingKey || !apiKeyInput.trim() ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          height: '36px',
                        }}
                      >
                        {isSavingKey ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div style={{ ...styles.errorMessage, marginBottom: '10px', padding: '6px 8px', fontSize: '11px' }}>
                      {error}
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <>
                <label style={styles.sectionLabel}>Prompt</label>
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                  }}
                >
                  {/* Background layer with syntax highlighting */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      pointerEvents: 'none',
                      ...styles.textareaBase,
                      ...styles.textareaEnabled,
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      overflow: 'hidden',
                      zIndex: 0,
                    }}
                  >
                    {input ? (
                      input.split('\n').map((line, idx) => {
                        const isComment = line.trim().startsWith('//');
                        return (
                          <span
                            key={idx}
                            style={{
                              color: isComment ? '#6a9955' : '#f5f5f5',
                              fontStyle: isComment ? 'italic' : 'normal',
                            }}
                          >
                            {line || '\u00A0'}
                            {idx < input.split('\n').length - 1 && '\n'}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ color: '#525252', fontStyle: 'italic' }}>
                        Enter your prompt here... (Cmd/Ctrl + Enter to submit)
                      </span>
                    )}
                  </div>
                  {/* Editable textarea overlay */}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder=""
                    disabled={isLoading}
                    style={{
                      ...styles.textareaBase,
                      ...styles.textareaEnabled,
                      position: 'relative',
                      zIndex: 1,
                      color: 'transparent',
                      caretColor: '#f5f5f5',
                      backgroundColor: 'transparent',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      // Update background border
                      const bg = e.target.previousElementSibling;
                      if (bg) {
                        bg.style.borderColor = '#3b82f6';
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'transparent';
                      e.target.style.boxShadow = 'none';
                      // Update background border
                      const bg = e.target.previousElementSibling;
                      if (bg) {
                        bg.style.borderColor = '#262626';
                      }
                    }}
                  />
                </div>
                {error && (
                  <div style={{ ...styles.errorMessage, marginTop: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Response section */}
          <div
            style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              backgroundColor: '#0f0f0f',
              overflowY: 'auto',
              borderBottom: '1px solid #1a1a1a',
            }}
          >
            {!apiKey ? (
              // Show Prompt section when API key is not configured
              <>
                <label style={styles.sectionLabel}>Prompt</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your prompt here... (Configure API key to enable)"
                  disabled={true}
                  style={{
                    ...styles.textareaBase,
                    ...styles.textareaDisabled,
                  }}
                />
              </>
            ) : (
              // Show Response section when API key is configured
              <>
                <label style={styles.sectionLabel}>Response</label>
                {output ? (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      overflowY: 'auto',
                    }}
                  >
                    {parsedResponses ? (
                      parsedResponses.map((response, idx) => (
                        <div key={idx} style={styles.responseBox}>
                          <strong style={{ color: '#a3a3a3', marginBottom: '8px', display: 'block' }}>
                            Response {response.number}:
                          </strong>
                          {response.content}
                        </div>
                      ))
                    ) : (
                      <div style={styles.responseBox}>{output}</div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      color: '#525252',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '12px',
                      backgroundColor: '#1a1a1a',
                      borderRadius: '6px',
                      border: '1px solid #262626',
                    }}
                  >
                    {isLoading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                        </svg>
                        Generating response...
                      </span>
                    ) : (
                      'Response will appear here'
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit button section */}
          {apiKey && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#151515',
                borderTop: '1px solid #1a1a1a',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim() || !apiKey}
                style={{
                  padding: '6px 16px',
                  backgroundColor: isLoading || !input.trim() || !apiKey ? '#1a1a1a' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isLoading || !input.trim() || !apiKey ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading || !input.trim() || !apiKey ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.2)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && input.trim() && apiKey) {
                    e.target.style.backgroundColor = '#2563eb';
                    e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && input.trim() && apiKey) {
                    e.target.style.backgroundColor = '#3b82f6';
                    e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
                onMouseDown={(e) => {
                  if (!isLoading && input.trim() && apiKey) {
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Settings Panel */}
        {apiKey && isSettingsOpen && (
          <div
            style={{
              width: `${SETTINGS_PANEL_WIDTH}px`,
              borderLeft: '1px solid #1a1a1a',
              backgroundColor: '#151515',
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h4
                style={{
                  margin: '0 0 12px 0',
                  color: '#f5f5f5',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Settings
              </h4>
            </div>

            {/* Model Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  color: '#a3a3a3',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#1a1a1a',
                  color: '#f5f5f5',
                  border: '1px solid #262626',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#262626';
                  e.target.style.boxShadow = 'none';
                }}
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value} style={{ backgroundColor: '#1a1a1a' }}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature Control */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label
                  style={{
                    color: '#a3a3a3',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  Temperature
                </label>
                <span
                  style={{
                    color: '#737373',
                    fontSize: '12px',
                          fontFamily: 'Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace',
                          fontWeight: 'normal',
                          fontFeatureSettings: '"liga" 0, "calt" 0',
                          lineHeight: '18px',
                          letterSpacing: '0px',
                    fontWeight: 600,
                    backgroundColor: '#1a1a1a',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: '1px solid #262626',
                  }}
                >
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '11px',
                  color: '#525252',
                }}
              >
                <span>0.0</span>
                <span>1.0</span>
                <span>2.0</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with API key status */}
      <div
        style={{
          padding: '4px 12px',
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #2d2d2d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '8px',
          fontSize: '11px',
          color: '#999',
        }}
      >
        <span>Open API Key Status:</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'default',
          }}
          title={apiKey ? 'API Key configured' : 'API Key not configured'}
        >
          {apiKey ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="15"></line>
              <line x1="15" y1="9" x2="9" y2="15"></line>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
