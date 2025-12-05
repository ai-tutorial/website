import { useState, useEffect, useMemo, useCallback, useRef } from '/snippets/react';

/**
 * LLMPlayground component for interactive LLM testing
 * 
 * @param {Object} props - Component props
 * @param {string} [props.defaultInput=''] - Default input text
 * @param {string} [props.defaultModel='gpt-4o-mini'] - Default model
 * @param {number} [props.defaultTemperature=0.7] - Default temperature
 * @param {string} [props.height='600px'] - Height of the component
 * @param {boolean} [props.keepInput=false] - If true, keep input after submission
 * @param {string} [props.defaultMode='chat'] - 'chat' or 'advanced'
 * @param {Array} [props.defaultMessages=[]] - Array of {role, content} for advanced mode
 * @param {string} [props.response=''] - Sample response to show when no output yet (requires defaultInput)
 * @param {boolean} [props.forceSettingsOpen=false] - If true, force settings panel to be open
 */
export const LLMPlayground = ({
  defaultInput = '',
  defaultModel = 'gpt-4o-mini',
  defaultTemperature = 0.7,
  height = '600px',
  keepInput = false,
  defaultMode = 'chat',
  defaultMessages = [],

  response = '',
  forceSettingsOpen = false,
  title,
  theme: userTheme
}) => {
  // ==================== CONSTANTS ====================
  const STORAGE_KEY = 'openai_api_key';
  const SETTINGS_PANEL_KEY = 'llm_playground_settings_open';
  const SETTINGS_PANEL_WIDTH = 220;
  const API_URL = 'https://api.openai.com/v1/chat/completions';
  const MAX_TOKENS = 2000;

  const MODELS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ];

  const TABS = {
    RESPONSE: 'response',
    REQUEST: 'request',
    API_RESPONSE: 'apiResponse'
  };

  // ==================== ICON HELPERS ====================
  const IconWarningSun = ({ size = 14, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );

  const IconLoadingSpinner = ({ size = 14, className = '', strokeColor = 'currentColor', strokeWidth = '2', strokeLinecap = 'butt' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      className={className}
    >
      <path d="M21 12a9 9 0 11-6.219-8.56"></path>
    </svg>
  );

  const IconWarningTriangle = ({ size = 16, strokeColor = '#f59e0b', className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );

  const IconClose = ({ size = 10, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  const IconPlus = ({ size = 12, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );

  const IconError = ({ size = 14, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );

  const IconSend = ({ size = 16, fillColor = '#000', className = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fillColor}
      className={className}
    >
      <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
    </svg>
  );

  const IconCheckmark = ({ size = 14, strokeColor = '#22c55e', className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" className={className}>
      <polyline points="9 11 12 14 22 4"></polyline>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
  );

  const IconXStatus = ({ size = 14, strokeColor = '#ef4444', className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="9" x2="15" y2="15"></line>
      <line x1="15" y1="9" x2="9" y2="15"></line>
    </svg>
  );

  const IconChevron = ({ size = 12, isOpen = false, className = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {isOpen ? (
        <polyline points="18 15 12 9 6 15"></polyline>
      ) : (
        <polyline points="6 9 12 15 18 9"></polyline>
      )}
    </svg>
  );

  // ==================== STYLES ====================
  // Styles are now in style.css - using CSS classes instead

  // ==================== STATE ====================
  const isAdvancedMode = defaultMode === 'advanced' || (defaultMessages && defaultMessages.length > 0);
  const mode = isAdvancedMode ? 'advanced' : 'chat';

  const [input, setInput] = useState(defaultInput);
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState(defaultModel);
  const [temperature, setTemperature] = useState(defaultTemperature);
  const [apiKey, setApiKey] = useState('');
  const [responseCount, setResponseCount] = useState(0);
  const responseCountRef = useRef(0);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const textareaRef = useRef(null);
  const advancedTextareaRefs = useRef({});
  const responseAreaRef = useRef(null);
  const [messages, setMessages] = useState(() => {
    if (defaultMessages && defaultMessages.length > 0) {
      return defaultMessages;
    }
    return [
      { role: 'system', content: '' },
      { role: 'user', content: '' }
    ];
  });
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const isInitialMount = useRef(true);
  const [lastSentJson, setLastSentJson] = useState(null);
  const [lastResponseJson, setLastResponseJson] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.RESPONSE);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
    if (forceSettingsOpen) return true;
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(SETTINGS_PANEL_KEY);
    return stored !== null ? stored === 'true' : true;
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const toggleMaximize = () => setIsMaximized(!isMaximized);

  const headerTitle = title || (defaultMode === 'advanced' ? 'Advanced Playground' : 'LLM Playground');

  // ==================== THEME DETECTION ====================
  const [detectedTheme, setDetectedTheme] = useState('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setDetectedTheme(isDark ? 'dark' : 'light');
    };

    // Initial check
    checkTheme();

    // Observer for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const theme = userTheme || detectedTheme;

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedKey = localStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (forceSettingsOpen) {
      setIsSettingsOpen(true);
      return;
    }
    localStorage.setItem(SETTINGS_PANEL_KEY, String(isSettingsOpen));
  }, [isSettingsOpen, forceSettingsOpen]);

  // Sync ref with state
  useEffect(() => {
    responseCountRef.current = responseCount;
  }, [responseCount]);

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

  // ==================== HELPER FUNCTIONS ====================
  const filterComments = useCallback((text) => {
    return text
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .join('\n')
      .trim();
  }, []);

  const autoResizeTextarea = useCallback((textarea) => {
    if (!textarea) return;
    // Reset height to get accurate scrollHeight
    textarea.style.height = '0px';
    const scrollHeight = textarea.scrollHeight;
    // One line = line-height (20px) + padding top (14px) + padding bottom (14px) = 48px
    // But we need to ensure it's exactly one line when empty
    const minHeight = 48;
    const maxHeight = 240; // Max height to allow scrolling for long text
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Auto-resize chat mode textarea
  useEffect(() => {
    if (textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [input, autoResizeTextarea]);

  // Scroll to bottom when new messages are added (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (messagesEndRef.current && conversationHistory.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [conversationHistory, isLoading]);

  // Auto-resize advanced mode textareas
  useEffect(() => {
    Object.values(advancedTextareaRefs.current).forEach((textarea) => {
      if (textarea) {
        autoResizeTextarea(textarea);
      }
    });
  }, [messages, autoResizeTextarea]);

  // Scroll to response area when submission completes in advanced mode
  useEffect(() => {
    if (mode === 'advanced' && hasSubmitted && responseAreaRef.current && !isLoading) {
      setTimeout(() => {
        if (responseAreaRef.current) {
          responseAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [hasSubmitted, output, mode, isLoading]);

  const constructAdvancedMessages = useCallback(() => {
    return messages.filter(msg => msg.content.trim().length > 0);
  }, [messages]);

  const isFormValid = useMemo(() => {
    if (!apiKey) return false;
    if (mode === 'chat') {
      return input.trim().length > 0;
    } else {
      return messages.some(msg => msg.content.trim().length > 0);
    }
  }, [mode, apiKey, input, messages]);

  // ==================== HANDLERS ====================
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

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    if (!apiKey || isLoading || !isFormValid) {
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSubmitted(true);

    if (mode === 'advanced') {
      setLastResponseJson(null);
      setActiveTab(TABS.RESPONSE);
    }

    let requestMessages = [];
    let userMessageContent = '';

    if (mode === 'chat') {
      const filteredInput = filterComments(input);
      if (!filteredInput) {
        setError('Please enter a prompt (comments are not sent to the API)');
        setIsLoading(false);
        return;
      }
      userMessageContent = filteredInput;
      requestMessages = [{ role: 'user', content: filteredInput }];

      // Add user message to conversation history
      setConversationHistory(prev => [...prev, { role: 'user', content: filteredInput }]);

      // Clear input if keepInput is false
      if (!keepInput) {
        setInput('');
      }
    } else {
      const advancedMessages = constructAdvancedMessages();
      if (advancedMessages.length === 0) {
        setError('Please fill in at least one field in Advanced mode');
        setIsLoading(false);
        return;
      }
      requestMessages = advancedMessages;
    }

    const jsonPayload = {
      model,
      messages: requestMessages,
      temperature,
      max_tokens: MAX_TOKENS
    };

    setLastSentJson(jsonPayload);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(jsonPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to get response from OpenAI`);
      }

      const data = await response.json();
      const newResponse = data.choices[0]?.message?.content || 'No response generated';

      if (mode === 'advanced') {
        setLastResponseJson(data);
        setOutput(newResponse);
      } else {
        // Chat mode: add assistant response to conversation history
        setConversationHistory(prev => [...prev, { role: 'assistant', content: newResponse }]);
        setOutput(newResponse);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing your request');
      // Remove the user message from history if there was an error
      if (mode === 'chat') {
        setConversationHistory(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, input, apiKey, isLoading, keepInput, constructAdvancedMessages, filterComments, isFormValid]);

  // Removed handleKeyDown - Enter should add new line, submit only via play button

  // ==================== RENDER HELPERS ====================
  const renderChatMessage = (message, index, isPlaceholder = false) => {
    const isUser = message.role === 'user';
    return (
      <div
        key={index}
        className={isUser ? 'llm-chat-message llm-chat-message-user' : 'llm-chat-message llm-chat-message-assistant'}
      >
        <div
          className={`llm-chat-bubble ${isUser ? 'llm-chat-bubble-user' : 'llm-chat-bubble-assistant'} ${isPlaceholder ? 'llm-chat-bubble-placeholder' : ''}`}
        >
          {message.content}
        </div>
      </div>
    );
  };

  const renderChatInterface = () => {
    const allMessages = [...conversationHistory];
    const placeholderMessages = [];

    // If there's a response and no conversation yet, show both input and response
    // response requires defaultInput to be present - if response exists but no defaultInput, don't show placeholder messages
    if (response && !hasSubmitted && conversationHistory.length === 0) {
      // defaultInput is mandatory when response is provided
      if (defaultInput && defaultInput.trim()) {
        const filteredInput = filterComments(defaultInput);
        if (filteredInput) {
          placeholderMessages.push({ role: 'user', content: filteredInput, isPlaceholder: true });
          // Only show response if we have a valid input
          placeholderMessages.push({ role: 'assistant', content: response, isPlaceholder: true });
        }
      }
      // If response is provided but no defaultInput, the response won't be shown (as per requirement)
    }

    const hasPlaceholderMessages = placeholderMessages.length > 0;

    return (
      <div className="llm-chat-interface">
        {hasPlaceholderMessages && (
          <div className="llm-warning-banner">
            <IconWarningSun size={14} />
            <span>This is a sample conversation. Click the send button to make a real API call.</span>
          </div>
        )}
        {allMessages.length === 0 && placeholderMessages.length === 0 && !isLoading && (
          <div className="llm-chat-empty-state">
            Start a conversation with OpenAI LLM using the API key you provided!
          </div>
        )}
        {placeholderMessages.map((msg, idx) => renderChatMessage(msg, `placeholder-${idx}`, true))}
        {allMessages.map((msg, idx) => renderChatMessage(msg, `real-${idx}`, false))}
        {isLoading && (
          <div className="llm-chat-loading">
            <div className="llm-chat-loading-bubble">
              <IconLoadingSpinner size={14} className="llm-chat-loading-spinner" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  const renderApiKeyForm = () => (
    <div className="llm-api-key-form">
      <div className="llm-api-key-form-section">
        <h3 className="llm-api-key-form-title">
          <IconWarningTriangle size={16} strokeColor="#f59e0b" />
          <span>Configure OpenAI API Key to make the most of the tutorial</span>
        </h3>
        <p className="llm-api-key-form-description">
          Your API key is stored locally in your browser's storage and is never transmitted to external servers.{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="llm-api-key-form-link"
          >
            Don't have an API key? Get one here
          </a>
        </p>
      </div>

      <form onSubmit={handleApiKeySubmit}>
        <div className="llm-form-group">
          <div className="llm-form-row">
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
              className={error ? 'llm-api-key-input llm-api-key-input-error' : 'llm-api-key-input'}
              onBlur={(e) => {
                e.target.style.borderColor = error ? 'var(--llm-accent-red)' : 'var(--llm-border-color)';
              }}
            />
            <button
              type="submit"
              disabled={isSavingKey || !apiKeyInput.trim()}
              className="llm-api-key-save-button"
            >
              {isSavingKey ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {error && (
          <div className="llm-error-message llm-error-message-small">
            {error}
          </div>
        )}
      </form>
    </div>
  );

  const renderChatInput = () => {
    return (
      <div className="llm-chat-input-container">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResizeTextarea(e.target);
          }}
          placeholder="Type a message"
          disabled={isLoading}
          className="llm-chat-input-textarea"
          onBlur={(e) => {
            const container = e.target.parentElement;
            if (container) {
              container.style.borderColor = '#2a3942';
              container.style.backgroundColor = '#2a3942';
            }
          }}
        />
      </div>
    );
  };

  const renderAdvancedInput = () => (
    <div className="llm-advanced-input-container">
      {messages.map((message, index) => (
        <div
          key={index}
          className="llm-advanced-message-box"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--llm-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--llm-border-color)';
          }}
        >
          <div className="llm-advanced-message-header">
            <div className="llm-advanced-message-header-row">
              <span className="llm-advanced-message-number">
                #{index + 1}
              </span>
              <select
                value={message.role}
                onChange={(e) => {
                  const newMessages = [...messages];
                  newMessages[index].role = e.target.value;
                  setMessages(newMessages);
                }}
                disabled={isLoading}
                className={`llm-advanced-role-select ${message.role === 'system' ? 'llm-advanced-role-select-system' :
                  message.role === 'user' ? 'llm-advanced-role-select-user' :
                    'llm-advanced-role-select-assistant'
                  }`}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const newMessages = messages.filter((_, i) => i !== index);
                setMessages(newMessages.length > 0 ? newMessages : [{ role: 'system', content: '' }]);
              }}
              disabled={isLoading || messages.length <= 1}
              className="llm-advanced-remove-button"
              title="Remove message"
            >
              <IconClose size={10} />
            </button>
          </div>
          <textarea
            ref={(el) => {
              if (el) {
                advancedTextareaRefs.current[index] = el;
              }
            }}
            value={message.content}
            onChange={(e) => {
              const newMessages = [...messages];
              newMessages[index].content = e.target.value;
              setMessages(newMessages);
              autoResizeTextarea(e.target);
            }}
            placeholder={`Enter ${message.role} message content...`}
            disabled={isLoading}
            className="llm-textarea-base llm-textarea-enabled llm-advanced-textarea"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          setMessages([...messages, { role: 'user', content: '' }]);
        }}
        disabled={isLoading}
        className="llm-advanced-add-button"
      >
        <IconPlus size={12} />
        Add Message
      </button>
    </div>
  );

  const renderTabs = () => (
    <>
      <div className="llm-tabs-container">
        {[
          { key: TABS.RESPONSE, label: 'Response' },
          { key: TABS.REQUEST, label: 'API Request JSON' },
          { key: TABS.API_RESPONSE, label: 'API Response JSON' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? 'llm-tab-button llm-tab-button-active' : 'llm-tab-button'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="llm-tabs-content">
        {activeTab === TABS.RESPONSE && (
          <>
            {output ? (
              <div className="llm-response-box">{output}</div>
            ) : isLoading ? (
              <div className="llm-tab-loading">
                <span className="llm-tab-loading-content">
                  <IconLoadingSpinner size={14} className="llm-chat-loading-spinner" />
                  Generating response...
                </span>
              </div>
            ) : response ? (
              <div className="llm-response-section">
                <label className="llm-section-label">Response (Expected response, press submit to get actual response)</label>
                <div className="llm-response-box llm-response-box-placeholder">
                  {response}
                </div>
              </div>
            ) : (
              <div className="llm-tab-empty">
                Response will appear here
              </div>
            )}
          </>
        )}

        {activeTab === TABS.REQUEST && (
          <div
            className="llm-textarea-base llm-textarea-enabled llm-json-viewer"
          >
            {lastSentJson ? JSON.stringify(lastSentJson, null, 2) : (
              <span className="llm-json-viewer-empty">
                No request data. Submit a request to see the JSON.
              </span>
            )}
          </div>
        )}

        {activeTab === TABS.API_RESPONSE && (
          <div
            className="llm-textarea-base llm-textarea-enabled llm-json-viewer"
          >
            {lastResponseJson ? JSON.stringify(lastResponseJson, null, 2) : (
              <span className="llm-json-viewer-empty">
                No response data. Submit a request to see the API response JSON.
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  const renderChatResponse = () => {
    // Chat interface is now integrated into the main layout
    return null;
  };

  // ==================== MAIN RENDER ====================
  return (
    <div className={`code-editor-wrapper ${isMaximized ? 'maximized' : ''}`} data-theme={theme}>
      {!isMaximized && (
        <div className="code-editor-header">
          <div className="code-editor-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {headerTitle}
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

      <div
        className={mode === 'chat' ? 'llm-playground-container llm-playground-container-chat llm-playground-container-base' : 'llm-playground-container llm-playground-container-base'}
        style={{
          height: isMaximized ? 'auto' : height,
          flex: isMaximized ? 1 : 'none',
          borderTopLeftRadius: isMaximized ? '12px' : '0',
          borderTopRightRadius: isMaximized ? '12px' : '0',
          borderTop: isMaximized ? '1px solid var(--llm-border-color)' : 'none'
        }}
      >
        <div className="llm-playground-main">
          <div className="llm-playground-content">
            {mode === 'chat' ? (
              <>
                {/* API Key form - shown first if not configured */}
                {!apiKey && (
                  <div className="llm-api-key-form-wrapper">
                    {renderApiKeyForm()}
                  </div>
                )}

                {/* Chat messages area */}
                {renderChatInterface()}

                {/* Error message */}
                {error && (
                  <div className="llm-error-wrapper">
                    <div className="llm-error-message">
                      <IconError size={14} />
                      {error}
                    </div>
                  </div>
                )}

                {/* Input area at bottom */}
                <div className="llm-playground-input-area">
                  <div className="llm-chat-input-wrapper">
                    {renderChatInput()}
                  </div>
                  {apiKey && (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !isFormValid}
                      className="llm-chat-send-button"
                      aria-label="Send message"
                    >
                      {isLoading ? (
                        <IconLoadingSpinner size={16} strokeColor="#000" strokeWidth="2.5" strokeLinecap="round" className="llm-chat-send-spinner" />
                      ) : (
                        <IconSend size={16} fillColor="#000" className="llm-chat-send-icon" />
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Advanced mode - keep existing layout */}
                <div
                  className="llm-playground-advanced-input-area"
                  style={{
                    flex: (hasSubmitted || (response && response.trim())) ? '0 0 auto' : '1 1 100%',
                    borderBottom: (hasSubmitted || (response && response.trim())) ? '1px solid var(--llm-bg-secondary)' : 'none',
                  }}
                >
                  {renderAdvancedInput()}
                  {!apiKey && renderApiKeyForm()}
                  {error && (
                    <div className="llm-error-message llm-error-message-top">
                      <IconError size={14} />
                      {error}
                    </div>
                  )}
                </div>

                {(hasSubmitted || (response && response.trim())) && (
                  <div ref={responseAreaRef} className="llm-playground-response-area">
                    {!apiKey && !(response && response.trim()) ? (
                      <>
                        <label className="llm-section-label">Prompt</label>
                        <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Enter your prompt here... (Configure API key to enable)"
                          disabled={true}
                          className="llm-textarea-base llm-textarea-disabled"
                        />
                      </>
                    ) : (
                      renderTabs()
                    )}
                  </div>
                )}

                {(apiKey || (response && response.trim())) && (
                  <div className="llm-playground-actions-area">
                    {apiKey ? (
                      <button
                        onClick={handleSubmit}
                        disabled={isLoading || !isFormValid}
                        className="llm-submit-button"
                      >
                        {isLoading ? (
                          <span className="llm-submit-button-loading">
                            <IconLoadingSpinner size={12} className="llm-submit-button-loading-spinner" />
                            Processing...
                          </span>
                        ) : (
                          'Submit'
                        )}
                      </button>
                    ) : (
                      <div className="llm-config-message">
                        Configure API key above to submit and get actual response
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {apiKey && isSettingsOpen && (
            <div
              className="llm-settings-panel"
              style={{
                width: `${SETTINGS_PANEL_WIDTH}px`,
              }}
            >
              <div>
                <h4 className="llm-settings-title">
                  Settings
                </h4>
              </div>

              <div>
                <label className="llm-settings-label">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isLoading}
                  className="llm-settings-select"
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--llm-border-color)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {MODELS.map((m) => (
                    <option key={m.value} value={m.value} className="llm-settings-option">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="llm-settings-range-container">
                  <label className="llm-settings-label">
                    Temperature
                  </label>
                  <span className="llm-settings-range-value">
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
                  className="llm-settings-range"
                />
                <div className="llm-settings-range-labels">
                  <span>0.0</span>
                  <span>1.0</span>
                  <span>2.0</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="llm-footer">
          <div className="llm-footer-status-container">
            <span>OpenAI key status:</span>
            <div
              className="llm-footer-status-icon"
              title={apiKey ? 'API Key configured' : 'API Key not configured'}
            >
              {apiKey ? (
                <IconCheckmark size={14} strokeColor="#22c55e" />
              ) : (
                <IconXStatus size={14} strokeColor="#ef4444" />
              )}
            </div>
          </div>
          {apiKey && (
            <button
              onClick={() => {
                if (!forceSettingsOpen) {
                  setIsSettingsOpen(!isSettingsOpen);
                }
              }}
              disabled={forceSettingsOpen}
              className={isSettingsOpen ? 'llm-footer-toggle-button llm-footer-toggle-button-active' : 'llm-footer-toggle-button'}
              aria-label="Toggle settings"
            >
              <IconChevron
                size={12}
                isOpen={isSettingsOpen}
                className={isSettingsOpen ? 'llm-footer-toggle-icon llm-footer-toggle-icon-open' : 'llm-footer-toggle-icon'}
              />
              <span>Settings</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
