import type { AgentStatus } from '../../stores/aiStore';

interface AgentToolbarProps {
  status: AgentStatus;
  task: string | null;
  onStop: () => void;
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; icon: JSX.Element }> = {
  idle: {
    label: 'Ready',
    color: 'var(--text-muted)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
  },
  running: {
    label: 'Running',
    color: 'var(--accent)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  done: {
    label: 'Done',
    color: 'var(--success)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
};

export function AgentToolbar({ status, task, onStop }: AgentToolbarProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="agent-toolbar">
      <div className="agent-toolbar-header">
        <div className="agent-status">
          <span className="agent-status-icon" style={{ color: config.color }}>{config.icon}</span>
          <span className="agent-status-label" style={{ color: config.color }}>{config.label}</span>
        </div>
        {status === 'running' && (
          <button className="agent-stop-btn" onClick={onStop}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1"/>
            </svg>
            Stop
          </button>
        )}
      </div>
      {task && (
        <div className="agent-task-preview">
          <span className="agent-task-label">Task:</span>
          <span className="agent-task-text">{task.length > 80 ? task.substring(0, 80) + '...' : task}</span>
        </div>
      )}
    </div>
  );
}
