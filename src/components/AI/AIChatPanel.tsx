import { useState, useRef, useEffect, useCallback } from 'react';
import { useAI } from '../../hooks/useAI';
import { useAgent } from '../../hooks/useAgent';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAIStore } from '../../stores/aiStore';

import { ErrorBoundary } from '../Common/ErrorBoundary';
import { ModeToggle } from './ModeToggle';
import { PlanToolbar, PlanEditPanel, PlanPhaseIndicator, PlanExplorerPanel } from './PlanPanel';
import { AgentToolbar } from './AgentToolbar';
import { AgentActivityPanel } from './AgentActivityPanel';
import { MessageBubble } from './MessageBubble';
import { PromptSuggestions } from './PromptSuggestions';
import { StreamingIndicator } from './StreamingIndicator';
import { ToolPermissionDialog } from '../Common/ToolPermissionDialog';
import { FileReferencePicker } from './FileReferencePicker';
import { SYSTEM_PROMPTS } from '../../lib/ai-prompts';
import type { AIMode } from '../../lib/ai-prompts';
import type { FileNode } from '../../types';
import './AIChatPanel.css';

const MODE_COLORS: Record<AIMode, string> = {
  chat: 'var(--accent)',
  plan: 'var(--info)',
  debug: 'var(--warning)',
  agent: '#A78BFA',
};
import './MessageBubble.css';
import './PromptSuggestions.css';
import './StreamingIndicator.css';
import './AgentToolbar.css';
import './AgentActivityPanel.css';
import './ToolCallBlock.css';
import './FileReferencePicker.css';
import './PlanPanel/PlanPhaseIndicator.css';

const MODE_LABELS: Record<AIMode, string> = {
  chat: 'Chat',
  plan: 'Plan',
  debug: 'Debug',
  agent: 'Agent',
};

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

  const {
    planContent,
    isEditingPlan,
    setPlanPhase,
    setPlanContent,
    setIsEditingPlan,
    agentStatus,
    agentTask,
    agentActivityLog,
    addMessage,
    clearActivityLog,
    setAgentTask,
    setAgentStatus,
    isStreaming,
    streamingContent,
    setMessageFeedback,
    activeProvider,
  } = useAIStore();

  const {
    startAgentTask,
    cancelAgentTask,
  } = useAgent();

  const NON_TOOL_PROVIDERS = ['deepseek', 'ollama', 'google'];
  const showToolWarning = mode === 'agent' && hasActiveProvider && NON_TOOL_PROVIDERS.includes(activeProvider);

  const PROVIDER_NAMES: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google Gemini',
    deepseek: 'DeepSeek',
    ollama: 'Ollama',
  };
  const providerLabel = PROVIDER_NAMES[activeProvider] || activeProvider;

  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [filePickerQuery, setFilePickerQuery] = useState('');
  const [filePickerAtPos, setFilePickerAtPos] = useState(0);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activityPanelCollapsed, setActivityPanelCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const defaultBoard = useSettingsStore((state) => state.build.defaultBoard);
  const defaultImplMode = useSettingsStore((state) => state.defaultImplementationMode);
  const modeConfig = SYSTEM_PROMPTS[mode];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      setShowSuggestions(false);
    }
  }, [messages.length]);

  useEffect(() => {
    if (messages.length === 0) {
      setPlanPhase('explore');
      setPlanContent('');
      setShowSuggestions(true);
    }
  }, [mode, messages.length, setPlanPhase, setPlanContent]);

  useEffect(() => {
    if (mode !== 'agent') return;
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.mode === 'agent') {
      setPlanContent(lastMsg.content);
      if (lastMsg.content.toLowerCase().includes('approve')) {
        setPlanPhase('ready');
      } else if (lastMsg.content.includes('?')) {
        setPlanPhase('clarify');
      }
    }
  }, [messages, mode, setPlanContent, setPlanPhase]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !hasActiveProvider) return;

    const userMessage = input.trim();
    setInput('');
    setHistoryIndex(-1);
    setCommandHistory(prev => [userMessage, ...prev].slice(0, 50));
    setShowSuggestions(false);

    if (mode === 'agent') {
      addMessage({ role: 'user', content: userMessage });
      startAgentTask(userMessage);
      return;
    }

    try {
      await sendMessage(userMessage, defaultBoard);
    } catch (err) {
      console.error('[AIChatPanel] Submit error:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filePickerOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setFilePickerOpen(false);
        return;
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'ArrowUp' && !input) {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
    if (e.key === 'ArrowDown' && historyIndex > 0) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex]);
    }
    if (e.key === 'ArrowDown' && historyIndex === 0) {
      e.preventDefault();
      setHistoryIndex(-1);
      setInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ' || textBeforeCursor[atIndex - 1] === '\n')) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!query.includes(' ')) {
        setFilePickerQuery(query);
        setFilePickerAtPos(atIndex);
        setFilePickerOpen(true);
        return;
      }
    }
    setFilePickerOpen(false);
  };

  const handleFileSelect = (file: FileNode) => {
    const before = input.slice(0, filePickerAtPos);
    const after = input.slice(filePickerAtPos + filePickerQuery.length + 1);
    const newText = `${before}@${file.name} ${after}`;
    setInput(newText);
    setFilePickerOpen(false);
    inputRef.current?.focus();
  };

  const handleStop = () => {
    cancelAgentTask();
  };

  const handleRetry = useCallback(() => {
    if (messages.length < 2) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    const userMsg = messages[messages.length - 2];
    if (userMsg.role !== 'user') return;
    const updatedMessages = messages.slice(0, -1);
    useAIStore.setState({ messages: updatedMessages });
    setTimeout(() => {
      sendMessage(userMsg.content, defaultBoard);
    }, 50);
  }, [messages, sendMessage, defaultBoard]);

  const handleFeedback = useCallback((id: string, feedback: 'positive' | 'negative' | undefined) => {
    setMessageFeedback(id, feedback);
  }, [setMessageFeedback]);

  const handleClear = () => {
    if (messages.length > 0) {
      clearMessages();
      setPlanPhase('explore');
      setPlanContent('');
      setShowSuggestions(true);
    }
  };

  const handleApprovePlan = () => {
    const planText = planContent || (messages.length > 0 ? messages[messages.length - 1].content : '') || '';
    if (!planText) return;

    const targetMode = defaultImplMode;
    setPlanPhase('explore');
    setPlanContent('');

    if (targetMode === 'agent') {
      clearActivityLog();
      setAgentTask(null);
      setAgentStatus('idle');
    }

    switchMode(targetMode);
    setTransitionMsg(`Switched to ${MODE_LABELS[targetMode]} Mode — plan approved`);
    setTimeout(() => setTransitionMsg(null), 2500);
    setTimeout(() => {
      useAIStore.getState().addMessage({
        role: 'system',
        content: `## Plan to Implement\n\n${planText}\n\n---\n*Please implement the plan above.*`,
      });
      if (targetMode === 'agent') {
        startAgentTask('Please implement the plan above.');
      } else {
        useAIStore.getState().addMessage({
          role: 'user',
          content: 'Please implement the plan above.',
        });
      }
      inputRef.current?.focus();
    }, 50);
  };

  const handleDiscardPlan = () => {
    clearMessages();
    setPlanPhase('explore');
    setPlanContent('');
  };

  const handleSuggestionSelect = (prompt: string) => {
    setInput(prompt);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const showInput = mode !== 'agent' || agentStatus === 'idle' || agentStatus === 'done';
  const showAgentToolbar = mode === 'agent' && hasActiveProvider;
  const showActivityPanel = mode === 'agent' && hasActiveProvider;

  return (
    <div className="ai-chat-panel">
      <div className="ai-header">
        <div className="ai-provider">
          <span className="ai-provider-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </span>
          <span className="ai-provider-name">{modeConfig.name}</span>
          {messages.length > 0 && (
            <span className="ai-message-count">{messages.length}</span>
          )}
        </div>

        <ModeToggle mode={mode} onModeChange={switchMode} />

        <div className="ai-header-actions">
          {showActivityPanel && (
            <button
              className="ai-action-btn"
              onClick={() => setActivityPanelCollapsed(c => !c)}
              title={activityPanelCollapsed ? 'Show activity log' : 'Hide activity log'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: activityPanelCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
          {messages.length > 0 && !isLoading && !isStreaming && (
            <button className="ai-action-btn" onClick={handleRetry} title="Regenerate last response">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
          )}
          <button className="ai-clear" onClick={handleClear} title="Clear chat" aria-label="Clear chat" disabled={messages.length === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            </svg>
          </button>
        </div>
      </div>

      {mode === 'plan' && hasActiveProvider && (
        <>
          <PlanPhaseIndicator />
          <PlanToolbar
            onApprove={handleApprovePlan}
            onDiscard={handleDiscardPlan}
            onEdit={() => setIsEditingPlan(true)}
          />
          <PlanExplorerPanel />
          {isEditingPlan && <PlanEditPanel />}
        </>
      )}

      {showAgentToolbar && (
        <AgentToolbar
          status={agentStatus}
          task={agentTask}
          onStop={cancelAgentTask}
        />
      )}

      {showToolWarning && (
        <div className="agent-warning">
          <span className="agent-warning-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <span className="agent-warning-text">
            <strong>{PROVIDER_NAMES[activeProvider] || activeProvider}</strong> does not support tool calling.
            Agent mode requires OpenAI, Anthropic, or a compatible custom endpoint to execute code actions.
          </span>
        </div>
      )}

      {transitionMsg && (
        <div className="plan-transition-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{transitionMsg}</span>
        </div>
      )}

      {showActivityPanel && (
        <div className={`agent-activity-wrapper ${activityPanelCollapsed ? 'collapsed' : ''}`}>
          {!activityPanelCollapsed && (
            <AgentActivityPanel entries={agentActivityLog} isStreaming={isStreaming} />
          )}
        </div>
      )}

      <div className="ai-messages" ref={messagesContainerRef}>
        {!hasActiveProvider ? (
          <div className="ai-empty">
            <div className="ai-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                <path d="M2 17L12 22L22 17" />
                <path d="M2 12L12 17L22 12" />
              </svg>
            </div>
            <p className="ai-empty-title">No AI Provider</p>
            <p className="ai-empty-text">
              Configure an AI provider in Settings.<br />
              Press Ctrl+, to open Settings.
            </p>
          </div>
        ) : messages.length === 0 && showSuggestions ? (
          <>
            <div className="ai-suggestions-header">
              <h3>{modeConfig.name}</h3>
              <p>{modeConfig.emptyState.description}</p>
            </div>
            <PromptSuggestions mode={mode} onSelect={handleSuggestionSelect} />
          </>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onFeedback={handleFeedback}
                onRetry={msg.role === 'assistant' && msg === messages[messages.length - 1] ? handleRetry : undefined}
              />
            ))}
            {isStreaming && streamingContent && (
              <div className="msg-bubble msg-assistant">
                <div className="msg-border-accent" style={{ background: MODE_COLORS[mode] }} />
                <div className="msg-body">
                  <div className="msg-header">
                    <span className="msg-role">Assistant</span>
                    <span className="msg-mode-tag" style={{ color: MODE_COLORS[mode] }}>{MODE_LABELS[mode]}</span>
                  </div>
                  <div className="msg-content streaming-msg-content">
                    <StreamingIndicator
                      content={streamingContent}
                      isStreaming={isStreaming}
                      onStop={handleStop}
                    />
                  </div>
                </div>
              </div>
            )}
            {isLoading && !isStreaming && (
              <div className="msg-bubble msg-assistant">
                <div className="msg-border-accent" style={{ background: MODE_COLORS[mode] }} />
                <div className="msg-body">
                  <div className="msg-header">
                    <span className="msg-role">Assistant</span>
                  </div>
                  <div className="msg-content">
                    <div className="ai-loading">
                      <div className="ai-loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showInput && (
        <form className="ai-input-area" onSubmit={handleSubmit}>
          {messages.length > 0 && (
            <div className="ai-context-bar">
              <span className="ai-context-bar-icon">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              </span>
              <span className="ai-context-bar-text">
                {messages.length} message{messages.length !== 1 ? 's' : ''} · mode: <strong>{MODE_LABELS[mode]}</strong> · provider: <strong>{providerLabel}</strong>
              </span>
            </div>
          )}
          <div className="ai-input-row">
            <div className="ai-input-wrapper">
              <textarea
                ref={inputRef}
                className="ai-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasActiveProvider
                    ? mode === 'agent' && agentStatus === 'running'
                      ? 'Agent is running — cancel to type...'
                      : `Ask about your ${mode === 'plan' ? 'project' : mode === 'debug' ? 'issue' : mode === 'agent' ? 'task' : 'code'}...`
                    : 'Configure AI provider in Settings...'
                }
                rows={1}
                disabled={isLoading || !hasActiveProvider || (mode === 'agent' && agentStatus === 'running')}
              />
              <FileReferencePicker
                open={filePickerOpen}
                query={filePickerQuery}
                onSelect={handleFileSelect}
                onClose={() => setFilePickerOpen(false)}
              />
            </div>
            <button
              type="submit"
              className="ai-send"
              disabled={!input.trim() || isLoading || !hasActiveProvider || (mode === 'agent' && agentStatus === 'running')}
            >
              {mode === 'agent' && input.trim() ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
        </form>
      )}
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
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </div>
          <p className="ai-empty-title">AI Unavailable</p>
          <p className="ai-empty-text">
            AI features failed to load.<br />
            Try restarting the application.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AIChatPanel() {
  const pendingPermission = useAIStore((s) => s.pendingPermission);
  const showPermissionDialog = useAIStore((s) => s.showPermissionDialog);
  const setPermissionDecision = useAIStore((s) => s.setPermissionDecision);

  const handleAllow = (_remember: boolean) => {
    setPermissionDecision('allow');
  };

  const handleBlock = (_remember: boolean) => {
    setPermissionDecision('deny');
  };

  return (
    <ErrorBoundary fallback={<AIFallback />}>
      <AIChatPanelContent />
      <ToolPermissionDialog
        open={showPermissionDialog}
        toolName={pendingPermission?.toolName || ''}
        toolDescription={pendingPermission?.toolDescription || ''}
        arguments={pendingPermission?.arguments || '{}'}
        onAllow={handleAllow}
        onBlock={handleBlock}
        onCancel={() => setPermissionDecision('deny')}
      />
    </ErrorBoundary>
  );
}
