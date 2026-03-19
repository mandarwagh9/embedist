import { useState, useRef, useEffect } from 'react';
import { useAI } from '../../hooks/useAI';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAIStore } from '../../stores/aiStore';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { ModeToggle } from './ModeToggle';
import { SYSTEM_PROMPTS } from '../../lib/ai-prompts';
import type { AIMode } from '../../lib/ai-prompts';
import './AIChatPanel.css';

function AIChatPanelContent() {
  const {
    mode,
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    switchMode,
    hasActiveProvider,
  } = useAI();
  
  const getOtherModesWithMessages = useAIStore((state) => state.getOtherModesWithMessages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const defaultBoard = useSettingsStore((state) => state.build.defaultBoard);
  const modeConfig = SYSTEM_PROMPTS[mode];
  const otherModes = getOtherModesWithMessages();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !hasActiveProvider) return;

    const userMessage = input.trim();
    setInput('');

    try {
      await sendMessage(userMessage, defaultBoard);
    } catch (err) {
      console.error('[AIChatPanel] Submit error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    if (messages.length > 0) {
      clearMessages();
    }
  };

  const handleSwitchToMode = (targetMode: AIMode) => {
    switchMode(targetMode);
  };

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ));
  };

  const modeLabels: Record<AIMode, string> = {
    chat: 'Chat',
    plan: 'Plan',
    debug: 'Debug',
  };

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
          <span className="ai-provider-name">{modeConfig.name}</span>
          {messages.length > 0 && (
            <span className="ai-message-count">{messages.length}</span>
          )}
        </div>
        
        <ModeToggle mode={mode} onModeChange={switchMode} />
        
        <button className="ai-clear" onClick={handleClear} title="Clear chat" disabled={messages.length === 0}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
          </svg>
        </button>
      </div>

      {otherModes.length > 0 && messages.length === 0 && (
        <div className="ai-mode-banner">
          {otherModes.map((item: { mode: AIMode; count: number }) => (
            <button
              key={item.mode}
              className="ai-mode-banner-item"
              data-mode={item.mode}
              onClick={() => handleSwitchToMode(item.mode)}
            >
              <span className="ai-mode-banner-label">{modeLabels[item.mode]}</span>
              <span className="ai-mode-banner-count">{item.count} message{item.count !== 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
      )}

      <div className="ai-messages">
        {!hasActiveProvider ? (
          <div className="ai-empty">
            <div className="ai-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </div>
            <p className="ai-empty-title">No AI Provider</p>
            <p className="ai-empty-text">
              Please configure an AI provider in Settings.<br/>
              Press Ctrl+, to open Settings.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="ai-empty" data-mode={mode}>
            <div className="ai-empty-icon" data-mode={mode}>
              {mode === 'chat' && (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              )}
              {mode === 'plan' && (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h6"/>
                </svg>
              )}
              {mode === 'debug' && (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                </svg>
              )}
            </div>
            <p className="ai-empty-title">{modeConfig.emptyState.title}</p>
            <p className="ai-empty-text">{modeConfig.emptyState.description}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message ${msg.role} ${msg.role === 'system' ? 'system' : ''}`}>
                <div className="ai-message-avatar">
                  {msg.role === 'user' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ) : msg.role === 'system' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                      <path d="M2 17L12 22L22 17"/>
                    </svg>
                  )}
                </div>
                <div className="ai-message-content">
                  <p>{formatMessageContent(msg.content)}</p>
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
          placeholder={hasActiveProvider ? `Ask about your ${mode === 'plan' ? 'project' : mode === 'debug' ? 'issue' : 'code'}...` : 'Configure AI provider in Settings...'}
          rows={1}
          disabled={isLoading || !hasActiveProvider}
        />
        <button
          type="submit"
          className="ai-send"
          disabled={!input.trim() || isLoading || !hasActiveProvider}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}

function AIFallback() {
  return (
    <div className="ai-chat-panel">
      <div className="ai-messages">
        <div className="ai-empty">
          <div className="ai-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
              <path d="M2 17L12 22L22 17"/>
              <path d="M2 12L12 17L22 12"/>
            </svg>
          </div>
          <p className="ai-empty-title">AI Unavailable</p>
          <p className="ai-empty-text">
            AI features failed to load.<br/>
            Try restarting the application.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AIChatPanel() {
  return (
    <ErrorBoundary fallback={<AIFallback />}>
      <AIChatPanelContent />
    </ErrorBoundary>
  );
}
