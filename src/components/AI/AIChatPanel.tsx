import { useState, useRef, useEffect } from 'react';
import { useAIStore } from '../../stores/aiStore';
import './AIChatPanel.css';

export function AIChatPanel() {
  const { messages, isLoading, addMessage, setLoading, activeProvider, providers } = useAIStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    setLoading(true);

    // Simulate AI response (replace with actual API call later)
    setTimeout(() => {
      const responses = [
        "I've analyzed your code. The issue is likely related to the I2C pin configuration. On ESP32, the default SDA is GPIO21 and SCL is GPIO22.",
        "Looking at your build output, I see a memory warning. Consider using `PROGMEM` for constant data to reduce RAM usage.",
        "The upload timeout error typically occurs when the board is not in flashing mode. Hold the BOOT button while pressing EN/RST.",
        "Your sensor isn't responding because the I2C address may be incorrect. Try running an I2C scanner to find the correct address.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addMessage({ role: 'assistant', content: randomResponse });
      setLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentProvider = providers.find(p => p.id === activeProvider);

  return (
    <div className="ai-chat-panel">
      <div className="ai-header">
        <div className="ai-provider">
          <span className="ai-provider-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
              <path d="M2 17L12 22L22 17"/>
              <path d="M2 12L12 17L22 12"/>
            </svg>
          </span>
          <span className="ai-provider-name">{currentProvider?.name || 'Select Provider'}</span>
        </div>
        <button className="ai-clear" onClick={() => useAIStore.getState().clearMessages()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
          </svg>
        </button>
      </div>

      <div className="ai-messages">
        {messages.length === 0 ? (
          <div className="ai-empty">
            <div className="ai-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </div>
            <p className="ai-empty-title">AI Assistant</p>
            <p className="ai-empty-text">
              Ask me anything about your embedded code.<br/>
              I can help with debugging, pin configuration, and more.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message ${msg.role}`}>
                <div className="ai-message-avatar">
                  {msg.role === 'user' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                      <path d="M2 17L12 22L22 17"/>
                    </svg>
                  )}
                </div>
                <div className="ai-message-content">
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="ai-message assistant">
                <div className="ai-message-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  </svg>
                </div>
                <div className="ai-message-content">
                  <div className="ai-loading">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="ai-input-area" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your code..."
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="ai-send"
          disabled={!input.trim() || isLoading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
