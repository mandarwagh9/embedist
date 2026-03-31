import { useEffect, useRef } from 'react';
import { useAIStore } from '../../stores/aiStore';
import type { ActivityLogEntry } from '../../stores/aiStore';

interface AgentActivityPanelProps {
  entries: ActivityLogEntry[];
  isStreaming?: boolean;
}

const ICON_MAP: Record<ActivityLogEntry['type'], { icon: JSX.Element; color: string }> = {
  read: {
    color: 'var(--info)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  write: {
    color: 'var(--success)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  build: {
    color: 'var(--warning)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  shell: {
    color: '#9b59b6',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
  },
  search: {
    color: '#3498db',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  info: {
    color: 'var(--text-muted)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
  },
  error: {
    color: '#e74c3c',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
  },
  done: {
    color: 'var(--success)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export function AgentActivityPanel({ entries, isStreaming = false }: AgentActivityPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(entries.length);
  const toolProgress = useAIStore((s) => s.toolProgress);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    lastCountRef.current = entries.length;
  }, [entries.length]);

  const streamingEntry = isStreaming && entries.length > 0 ? entries[entries.length - 1] : null;

  const renderProgress = () => {
    if (!toolProgress) return null;

    const stageColors: Record<string, string> = {
      starting: 'var(--accent)',
      running: 'var(--warning)',
      complete: 'var(--success)',
      error: 'var(--error)',
    };

    return (
      <div className="tool-progress-bar">
        <div className="tool-progress-header">
          <span className="tool-progress-name">{toolProgress.toolName}</span>
          <span className="tool-progress-stage" style={{ color: stageColors[toolProgress.stage] }}>
            {toolProgress.stage}
          </span>
        </div>
        <div className="tool-progress-message">{toolProgress.message}</div>
        {toolProgress.percent !== undefined && (
          <div className="tool-progress-track">
            <div
              className="tool-progress-fill"
              style={{
                width: `${toolProgress.percent}%`,
                background: stageColors[toolProgress.stage],
              }}
            />
          </div>
        )}
        {toolProgress.elapsedMs !== undefined && (
          <div className="tool-progress-time">{(toolProgress.elapsedMs / 1000).toFixed(1)}s</div>
        )}
      </div>
    );
  };

  if (entries.length === 0 && !toolProgress) {
    return (
      <div className="agent-activity-panel agent-activity-empty">
        <div className="agent-activity-empty-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Activity log will appear here</span>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-activity-panel" ref={listRef}>
      {toolProgress && renderProgress()}
      {entries.map((entry) => {
        const { icon, color } = ICON_MAP[entry.type];
        return (
          <div key={entry.id} className={`agent-activity-entry agent-activity-${entry.type}`}>
            <span className="agent-activity-time">{formatTime(entry.timestamp)}</span>
            <span className="agent-activity-icon" style={{ color }}>{icon}</span>
            <div className="agent-activity-content">
              <span className={`agent-activity-message ${streamingEntry?.id === entry.id ? 'streaming' : ''}`}>{entry.message}{streamingEntry?.id === entry.id && <span className="agent-streaming-cursor">▊</span>}</span>
              {entry.details && (
                <pre className="agent-activity-details">{entry.details}</pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
