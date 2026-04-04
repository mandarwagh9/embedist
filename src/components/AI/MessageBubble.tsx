import { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FeedbackPanel } from './FeedbackPanel';
import type { AIMessage } from '../../stores/aiStore';
import type { AIMode } from '../../lib/ai-prompts';

interface MessageBubbleProps {
  message: AIMessage;
  onFeedback: (id: string, feedback: 'positive' | 'negative' | undefined) => void;
  onRetry?: () => void;
}

const MODE_COLORS: Record<AIMode, string> = {
  chat: 'var(--accent)',
  plan: 'var(--info)',
  debug: 'var(--warning)',
  agent: '#A78BFA',
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderContent(content: string, _mode: AIMode, role: string): JSX.Element {
  const isMarkdown = role === 'assistant' || role === 'system' || content.includes('## ') || content.includes('```') || content.includes('- ');

  if (isMarkdown) {
    return <MarkdownRenderer content={content} />;
  }

  return (
    <p>
      {content.split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

export function MessageBubble({ message, onFeedback, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="msg-bubble msg-system">
        <div className="msg-system-content">
          {message.content.includes('## ') || message.content.includes('```') ? (
            <MarkdownRenderer content={message.content} />
          ) : (
            <p>{message.content}</p>
          )}
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={`msg-bubble msg-${message.role}`}>
      <div className="msg-border-accent" style={{ background: isUser ? 'var(--text-muted)' : MODE_COLORS[message.mode] }} />

      <div className="msg-body">
        <div className="msg-header">
          <span className="msg-role">{isUser ? 'You' : 'Assistant'}</span>
          {!isUser && (
            <span className="msg-mode-tag" style={{ color: MODE_COLORS[message.mode] }}>
              {message.mode}
            </span>
          )}
          <span className="msg-timestamp">{formatTimestamp(message.timestamp)}</span>
        </div>

        <div className="msg-content">
          {renderContent(message.content, message.mode, message.role)}
        </div>

        {message.usage && !isUser && (
          <div className="msg-usage">
            <span className="msg-usage-label">{message.usage.total_tokens}</span>
            <span className="msg-usage-detail">tokens</span>
          </div>
        )}

        <div className="msg-actions">
          <button
            className={`msg-action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy"
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
          {!isUser && onRetry && (
            <button className="msg-action-btn" onClick={onRetry} title="Regenerate">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
            </button>
          )}
          {!isUser && (
            <div className="msg-feedback-inline">
              <FeedbackPanel
                feedback={message.feedback}
                onFeedback={(fb) => onFeedback(message.id, fb)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
