import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import './ToolPermissionDialog.css';

interface ToolPermissionDialogProps {
  open: boolean;
  toolName: string;
  toolDescription: string;
  arguments: string;
  onAllow: (remember: boolean) => void;
  onBlock: (remember: boolean) => void;
  onCancel: () => void;
}

const TOOL_CATEGORIES: Record<string, { icon: JSX.Element; color: string }> = {
  read_file: {
    color: 'var(--info)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  list_directory: {
    color: 'var(--info)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
      </svg>
    ),
  },
  get_directory_tree: {
    color: 'var(--info)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 18a2 2 0 00-2 2 2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2zM7 18a2 2 0 00-2 2 2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2z"/>
        <line x1="9" y1="18" x2="15" y2="18"/>
        <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/>
        <line x1="9" y1="18" x2="9" y2="6"/>
        <line x1="15" y1="18" x2="15" y2="6"/>
      </svg>
    ),
  },
  search_code: {
    color: 'var(--info)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  get_error_details: {
    color: 'var(--info)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
  },
  create_file: {
    color: 'var(--warning)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  create_folder: {
    color: 'var(--warning)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    ),
  },
  write_file: {
    color: 'var(--warning)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  build_project: {
    color: 'var(--warning)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  run_shell: {
    color: 'var(--error)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
  },
};

export function ToolPermissionDialog({
  open,
  toolName,
  toolDescription,
  arguments: toolArgs,
  onAllow,
  onBlock,
  onCancel,
}: ToolPermissionDialogProps) {
  const [remember, setRemember] = useState(false);
  const toolPermissions = useSettingsStore((s) => s.toolPermissions);
  const setToolPermission = useSettingsStore((s) => s.setToolPermission);

  if (!open) return null;

  const category = TOOL_CATEGORIES[toolName] || {
    color: 'var(--text-muted)',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  };
  const currentPermission = toolPermissions[toolName] || 'ask';

  const handleAllow = () => {
    if (remember) {
      setToolPermission(toolName, 'allow');
    }
    onAllow(remember);
  };

  const handleBlock = () => {
    if (remember) {
      setToolPermission(toolName, 'block');
    }
    onBlock(remember);
  };

  const parseArgs = (argsStr: string): string => {
    try {
      const parsed = JSON.parse(argsStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return argsStr;
    }
  };

  return (
    <div className="permission-overlay" onClick={onCancel}>
      <div className="permission-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="permission-header">
          <div className="permission-icon" style={{ background: category.color }}>
            {category.icon}
          </div>
          <div className="permission-title-group">
            <h3 className="permission-title">Tool Permission Required</h3>
            <span className="permission-tool-name">{toolName}</span>
          </div>
        </div>

        <div className="permission-body">
          <p className="permission-description">{toolDescription}</p>

          <div className="permission-args">
            <span className="permission-args-label">Arguments:</span>
            <pre className="permission-args-content">{parseArgs(toolArgs)}</pre>
          </div>

          {currentPermission !== 'ask' && (
            <div className="permission-status">
              <span className={`permission-badge ${currentPermission}`}>
                {currentPermission === 'allow' ? '✓ Always Allowed' : '⊘ Always Blocked'}
              </span>
              <button
                className="permission-reset"
                onClick={() => setToolPermission(toolName, 'ask')}
              >
                Reset to Ask
              </button>
            </div>
          )}
        </div>

        <div className="permission-footer">
          <label className="permission-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Remember for this tool</span>
          </label>

          <div className="permission-actions">
            <button className="permission-btn cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="permission-btn block" onClick={handleBlock}>
              Block
            </button>
            <button className="permission-btn allow" onClick={handleAllow}>
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}