import { useState, useEffect } from 'react';

/**
 * LLMPlayground component for interactive LLM testing
 * 
 * @param {Object} props - Component props
 * @param {string} [props.defaultInput=''] - Default input text
 * @param {string} [props.defaultModel='gpt-4o-mini'] - Default model
 * @param {number} [props.defaultTemperature=0.7] - Default temperature
 * @param {string} [props.height='600px'] - Height of the component
 */
export const LLMPlayground = ({
  defaultInput = '',
  defaultModel = 'gpt-4o-mini',
  defaultTemperature = 0.7,
  height = '600px'
}) => {
  const [input, setInput] = useState(defaultInput);
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [model, setModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemperature);
  const [apiKey, setApiKey] = useState('');

  const STORAGE_KEY = 'openai_api_key';

  // Available models
  const models = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey && storedKey.startsWith('sk-')) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    if (!input.trim()) {
      setError('Please enter some text');
      return;
    }

    if (!apiKey || !apiKey.startsWith('sk-')) {
      setError('Please configure your OpenAI API key first');
      return;
    }

    setIsLoading(true);
    setError('');
    setOutput('');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: input
            }
          ],
          temperature: temperature,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response from OpenAI');
      }

      const data = await response.json();
      setOutput(data.choices[0]?.message?.content || 'No response generated');
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

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
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div
        style={{
          width: '100%',
          height: height,
          backgroundColor: '#0f0f0f',
          borderRadius: '12px',
          border: '1px solid #2a2a2a',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
        {/* Settings button - floating */}
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          style={{
            position: 'absolute',
            top: '12px',
            right: isSettingsOpen ? '220px' : '12px',
            zIndex: 10,
            background: isSettingsOpen ? '#2a2a2a' : 'rgba(26, 26, 26, 0.9)',
            border: '1px solid #2a2a2a',
            cursor: 'pointer',
            padding: '6px 6px',
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
            <label
              style={{
                marginBottom: '6px',
                color: '#a3a3a3',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Input
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Enter your prompt here... (Cmd/Ctrl + Enter to submit)"
              disabled={isLoading}
              style={{
                flex: 1,
                width: '100%',
                backgroundColor: '#1a1a1a',
                color: '#f5f5f5',
                border: '1px solid #262626',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                lineHeight: '1.5',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#262626';
                e.target.style.boxShadow = 'none';
              }}
            />
            
            {error && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
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
            <label
              style={{
                marginBottom: '6px',
                color: '#a3a3a3',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Response
            </label>
            {output ? (
              <div
                style={{
                  color: '#e5e5e5',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '6px',
                  border: '1px solid #262626',
                }}
              >
                {output}
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
          </div>

          {/* Submit button section */}
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
              disabled={isLoading || !input.trim()}
              style={{
                padding: '6px 16px',
                backgroundColor: isLoading || !input.trim() ? '#1a1a1a' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLoading || !input.trim() ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.2)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim()) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && input.trim()) {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
              onMouseDown={(e) => {
                if (!isLoading && input.trim()) {
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
        </div>

        {/* Collapsible Settings Panel */}
        {isSettingsOpen && (
          <div
            style={{
              width: '220px',
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
                  fontFamily: 'inherit',
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
                    fontFamily: 'monospace',
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

            {/* API Key Status */}
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
                API Key Status
              </label>
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: apiKey ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${apiKey ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: apiKey ? '#4ade80' : '#f87171',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 500,
                }}
              >
                {apiKey ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Configured
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Not configured
                  </>
                )}
              </div>
              {!apiKey && (
                <p
                  style={{
                    marginTop: '8px',
                    fontSize: '10px',
                    color: '#525252',
                    lineHeight: '1.4',
                  }}
                >
                  Configure your API key in the CodeEditor component or set it in localStorage with key: <code style={{ color: '#737373', backgroundColor: '#1a1a1a', padding: '2px 4px', borderRadius: '4px', fontSize: '9px' }}>openai_api_key</code>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

