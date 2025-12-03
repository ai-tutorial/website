import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

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
  forceSettingsOpen = false
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

  // ==================== STYLES ====================
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
  const textareaBackgroundRef = useRef(null);
  const advancedTextareaRefs = useRef({});
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
    // One line = line-height (20px) + padding top (6px) + padding bottom (6px) = 32px
    // But we need to ensure it's exactly one line when empty
    const minHeight = 32;
    const newHeight = Math.max(scrollHeight, minHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Auto-resize chat mode textarea and sync background
  useEffect(() => {
    if (textareaRef.current) {
      // Set height to 0 first to get accurate scrollHeight
      textareaRef.current.style.height = '0px';
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 32; // One line: 20px line-height + 6px top + 6px bottom
      const newHeight = Math.max(scrollHeight, minHeight);
      textareaRef.current.style.height = `${newHeight}px`;
      
      // Sync background div height with textarea
      if (textareaBackgroundRef.current) {
        textareaBackgroundRef.current.style.height = `${newHeight}px`;
        textareaBackgroundRef.current.style.minHeight = `${newHeight}px`;
      }
    }
  }, [input]);

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
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: '8px',
          padding: '0 12px',
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            padding: '8px 12px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            backgroundColor: isUser ? '#005c4b' : '#202c33',
            color: '#e9edef',
            fontSize: '14px',
            lineHeight: '1.4',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          opacity: isPlaceholder ? 0.7 : 1,
          border: isPlaceholder ? '1px dashed rgba(255, 255, 255, 0.3)' : 'none',
        }}
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
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          backgroundColor: '#0b141a',
          paddingTop: '12px',
          paddingBottom: '12px',
        }}
      >
        {hasPlaceholderMessages && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              marginLeft: '12px',
              marginRight: '12px',
              fontSize: '12px',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>This is a sample conversation. Click the send button to make a real API call.</span>
          </div>
        )}
        {allMessages.length === 0 && placeholderMessages.length === 0 && !isLoading && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8696a0',
              fontSize: '14px',
              fontStyle: 'italic',
            }}
          >
            Start a conversation with OpenAI LLM using the API key you provided!
          </div>
        )}
        {placeholderMessages.map((msg, idx) => renderChatMessage(msg, `placeholder-${idx}`, true))}
        {allMessages.map((msg, idx) => renderChatMessage(msg, `real-${idx}`, false))}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '8px',
              padding: '0 12px',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '18px 18px 18px 4px',
                backgroundColor: '#202c33',
                color: '#8696a0',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56"></path>
              </svg>
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  const renderApiKeyForm = () => (
    <div
      style={{
        marginBottom: '12px',
        padding: '12px',
        border: '2px solid #f59e0b',
        borderRadius: '8px',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
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
          <span>Configure OpenAI API Key to make the most of the tutorial</span>
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
              onBlur={(e) => {
                e.target.style.borderColor = error ? '#ef4444' : '#262626';
              }}
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
  );

  const renderChatInput = () => {
    const commonTextStyles = {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px',
      lineHeight: '20px',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontVariant: 'normal',
      fontStretch: 'normal',
      fontFeatureSettings: 'normal',
      fontVariationSettings: 'normal',
      letterSpacing: 'normal',
      textAlign: 'left',
      textDecoration: 'none',
      textTransform: 'none',
      textIndent: '0',
      textShadow: 'none',
    };

    const commonLayoutStyles = {
      padding: '6px 16px',
      margin: '0',
      border: 'none',
      boxSizing: 'border-box',
    };

    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '32px',
          maxHeight: '120px',
          backgroundColor: '#2a3942',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          ref={textareaBackgroundRef}
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'hidden',
            zIndex: 1,
            minHeight: '32px',
            height: 'auto',
            ...commonTextStyles,
            ...commonLayoutStyles,
          }}
        >
          {input ? (
            input.split('\n').map((line, idx) => {
              const isComment = line.trim().startsWith('//');
              return (
                <span
                  key={idx}
                  style={{
                    color: isComment ? '#6a9955' : '#e9edef',
                    fontStyle: isComment ? 'italic' : 'normal',
                  }}
                >
                  {line || '\u00A0'}
                  {idx < input.split('\n').length - 1 && '\n'}
                </span>
              );
            })
          ) : (
            <span style={{ color: '#8696a0', fontStyle: 'normal' }}>
              Type a message
            </span>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResizeTextarea(e.target);
            // Sync background div height
            if (textareaBackgroundRef.current) {
              const scrollHeight = e.target.scrollHeight;
              const height = Math.max(scrollHeight, 32);
              const maxHeight = Math.min(height, 120);
              textareaBackgroundRef.current.style.height = `${maxHeight}px`;
              textareaBackgroundRef.current.style.minHeight = `${maxHeight}px`;
            }
          }}
          placeholder=""
          disabled={isLoading}
          style={{
            position: 'relative',
            zIndex: 2,
            color: 'transparent',
            caretColor: '#e9edef',
            backgroundColor: 'transparent',
            outline: 'none',
            overflowY: 'auto',
            resize: 'none',
            minHeight: '32px',
            maxHeight: '120px',
            height: '32px',
            width: '100%',
            verticalAlign: 'top',
            overflow: 'hidden',
            ...commonTextStyles,
            ...commonLayoutStyles,
          }}
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
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      {messages.map((message, index) => (
        <div 
          key={index} 
          style={{ 
            position: 'relative',
            backgroundColor: '#151515',
            border: '1px solid #262626',
            borderRadius: '6px',
            padding: '8px',
            transition: 'border-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3a3a3a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#262626';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
              <span style={{ 
                fontSize: '9px', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                color: '#737373',
                minWidth: '50px'
              }}>
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
                style={{
                  padding: '3px 6px',
                  backgroundColor: message.role === 'system' ? 'rgba(59, 130, 246, 0.1)' : 
                                  message.role === 'user' ? 'rgba(34, 197, 94, 0.1)' : 
                                  'rgba(168, 85, 247, 0.1)',
                  color: message.role === 'system' ? '#60a5fa' : 
                         message.role === 'user' ? '#4ade80' : 
                         '#a78bfa',
                  border: `1px solid ${message.role === 'system' ? 'rgba(59, 130, 246, 0.3)' : 
                                        message.role === 'user' ? 'rgba(34, 197, 94, 0.3)' : 
                                        'rgba(168, 85, 247, 0.3)'}`,
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s ease',
                }}
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
              style={{
                padding: '2px 6px',
                backgroundColor: messages.length <= 1 ? '#1a1a1a' : 'rgba(239, 68, 68, 0.1)',
                color: messages.length <= 1 ? '#525252' : '#f87171',
                border: `1px solid ${messages.length <= 1 ? '#262626' : 'rgba(239, 68, 68, 0.3)'}`,
                borderRadius: '4px',
                fontSize: '10px',
                cursor: messages.length <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '20px',
                height: '20px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && messages.length > 1) {
                  e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && messages.length > 1) {
                  e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }
              }}
              title="Remove message"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
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
            style={{
              ...styles.textareaBase,
              ...styles.textareaEnabled,
              minHeight: '60px',
              padding: '8px',
              fontSize: '0.75em',
              lineHeight: '16px',
              overflowY: 'hidden',
              resize: 'none',
              height: 'auto',
            }}
          />
        </div>
      ))}
      
      <button
        type="button"
        onClick={() => {
          setMessages([...messages, { role: 'user', content: '' }]);
        }}
        disabled={isLoading}
        style={{
          padding: '6px 10px',
          backgroundColor: '#1a1a1a',
          color: '#a3a3a3',
          border: '1px dashed #262626',
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          transition: 'all 0.2s ease',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#262626';
          e.target.style.borderColor = '#3b82f6';
          e.target.style.color = '#60a5fa';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#1a1a1a';
          e.target.style.borderColor = '#262626';
          e.target.style.color = '#a3a3a3';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Message
      </button>
    </div>
  );

  const renderTabs = () => (
    <>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', borderBottom: '1px solid #1a1a1a' }}>
        {[
          { key: TABS.RESPONSE, label: 'Response' },
          { key: TABS.REQUEST, label: 'API Request JSON' },
          { key: TABS.API_RESPONSE, label: 'API Response JSON' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === tab.key ? '#1a1a1a' : 'transparent',
              color: activeTab === tab.key ? '#f5f5f5' : '#737373',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              borderRadius: '4px 4px 0 0',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {activeTab === TABS.RESPONSE && (
          <>
            {output ? (
              <div style={styles.responseBox}>{output}</div>
            ) : isLoading ? (
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
                  minHeight: '100px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                  </svg>
                  Generating response...
                </span>
              </div>
            ) : response ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <label style={styles.sectionLabel}>Response (Expected response, press submit to get actual response)</label>
                <div style={{ ...styles.responseBox, color: '#a3a3a3', fontStyle: 'italic' }}>
                  {response}
                </div>
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
                  minHeight: '100px',
                }}
              >
                Response will appear here
              </div>
            )}
          </>
        )}
        
        {activeTab === TABS.REQUEST && (
          <div
            style={{
              ...styles.textareaBase,
              ...styles.textareaEnabled,
              minHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              padding: '12px',
              fontSize: '0.7em',
              lineHeight: '16px',
              backgroundColor: '#0f0f0f',
              border: '1px solid #1a1a1a',
            }}
          >
            {lastSentJson ? JSON.stringify(lastSentJson, null, 2) : (
              <span style={{ color: '#525252', fontStyle: 'italic' }}>
                No request data. Submit a request to see the JSON.
              </span>
            )}
          </div>
        )}
        
        {activeTab === TABS.API_RESPONSE && (
          <div
            style={{
              ...styles.textareaBase,
              ...styles.textareaEnabled,
              minHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              padding: '12px',
              fontSize: '0.7em',
              lineHeight: '16px',
              backgroundColor: '#0f0f0f',
              border: '1px solid #1a1a1a',
            }}
          >
            {lastResponseJson ? JSON.stringify(lastResponseJson, null, 2) : (
              <span style={{ color: '#525252', fontStyle: 'italic' }}>
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
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: mode === 'chat' ? '#0b141a' : '#0f0f0f',
        borderRadius: '12px',
        border: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: mode === 'chat' ? 'system-ui, -apple-system, sans-serif' : 'Menlo, "Cascadia Code", Consolas, "Liberation Mono", monospace',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {mode === 'chat' ? (
            <>
              {/* Chat messages area */}
              {renderChatInterface()}
              
              {/* API Key form - shown above input if not configured */}
              {!apiKey && (
                <div style={{ padding: '12px', borderTop: '1px solid #1a1a1a' }}>
                  {renderApiKeyForm()}
                </div>
              )}
              
              {/* Error message */}
              {error && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #1a1a1a' }}>
                  <div style={styles.errorMessage}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                  </div>
                </div>
              )}
              
              {/* Input area at bottom */}
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#0b141a',
                  borderTop: '1px solid #202c33',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: 1 }}>
                  {renderChatInput()}
                </div>
                {apiKey && (
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !isFormValid}
                    style={{
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      minHeight: '32px',
                      padding: '0',
                      margin: '0',
                      backgroundColor: isLoading || !isFormValid ? '#8696a0' : '#00a884',
                      border: 'none',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isLoading || !isFormValid ? 'not-allowed' : 'pointer',
                      transition: 'background-color 0.2s ease',
                      flexShrink: 0,
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && isFormValid) {
                        e.target.style.backgroundColor = '#06cf9c';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading && isFormValid) {
                        e.target.style.backgroundColor = '#00a884';
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!isLoading && isFormValid) {
                        e.target.style.transform = 'scale(0.95)';
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!isLoading && isFormValid) {
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="#000" 
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ animation: 'spin 1s linear infinite' }}
                      >
                        <path d="M21 12a9 9 0 11-6.219-8.56"></path>
                      </svg>
                    ) : (
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="#000"
                        style={{ 
                          display: 'block',
                          margin: '0 auto',
                        }}
                      >
                        <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Advanced mode - keep existing layout */}
              <div
                style={{
                  flex: (hasSubmitted || (response && response.trim())) ? '0 0 auto' : '1 1 100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px',
                  overflow: 'hidden',
                  borderBottom: (hasSubmitted || (response && response.trim())) ? '1px solid #1a1a1a' : 'none',
                  backgroundColor: '#0f0f0f',
                  minHeight: (hasSubmitted || (response && response.trim())) ? 'auto' : 'auto',
                }}
              >
                {renderAdvancedInput()}
                {!apiKey && renderApiKeyForm()}
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
              </div>

              {(hasSubmitted || (response && response.trim())) && (
                <div
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    backgroundColor: '#0f0f0f',
                    borderBottom: '1px solid #1a1a1a',
                    minHeight: '200px',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                  }}
                >
                  {!apiKey && !(response && response.trim()) ? (
                    <>
                      <label style={styles.sectionLabel}>Prompt</label>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter your prompt here... (Configure API key to enable)"
                        disabled={true}
                        style={{
                          ...styles.textareaBase,
                          ...styles.textareaDisabled,
                        }}
                      />
                    </>
                  ) : (
                    renderTabs()
                  )}
                </div>
              )}

              {(apiKey || (response && response.trim())) && (
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#151515',
                    borderTop: '1px solid #1a1a1a',
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  {apiKey ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !isFormValid}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: isLoading || !isFormValid ? '#1a1a1a' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isLoading || !isFormValid ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isLoading || !isFormValid ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.2)',
                        letterSpacing: '-0.01em',
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading && isFormValid) {
                          e.target.style.backgroundColor = '#2563eb';
                          e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
                          e.target.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading && isFormValid) {
                          e.target.style.backgroundColor = '#3b82f6';
                          e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                          e.target.style.transform = 'translateY(0)';
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!isLoading && isFormValid) {
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
                  ) : (
                    <div style={{ fontSize: '11px', color: '#737373', fontStyle: 'italic' }}>
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
                onBlur={(e) => {
                  e.target.style.borderColor = '#262626';
                  e.target.style.boxShadow = 'none';
                }}
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value} style={{ backgroundColor: '#1a1a1a' }}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

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

      <div
        style={{
          padding: '4px 12px',
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #2d2d2d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: '11px',
          color: '#999',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>OpenAI key status:</span>
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
        {apiKey && (
          <button
            onClick={() => {
              if (!forceSettingsOpen) {
                setIsSettingsOpen(!isSettingsOpen);
              }
            }}
            disabled={forceSettingsOpen}
            style={{
              background: isSettingsOpen ? '#2a2a2a' : 'transparent',
              border: '1px solid #2a2a2a',
              cursor: forceSettingsOpen ? 'not-allowed' : 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: '#d4d4d4',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              fontSize: '11px',
              opacity: forceSettingsOpen ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!forceSettingsOpen) {
                e.target.style.backgroundColor = '#2a2a2a';
                e.target.style.borderColor = '#3a3a3a';
              }
            }}
            onMouseLeave={(e) => {
              if (!forceSettingsOpen) {
                e.target.style.backgroundColor = isSettingsOpen ? '#2a2a2a' : 'transparent';
                e.target.style.borderColor = '#2a2a2a';
              }
            }}
            aria-label="Toggle settings"
          >
            <svg
              width="12"
              height="12"
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
                <polyline points="18 15 12 9 6 15"></polyline>
              ) : (
                <polyline points="6 9 12 15 18 9"></polyline>
              )}
            </svg>
            <span>Settings</span>
          </button>
        )}
      </div>
    </div>
  );
};
