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

const TOOL_CATEGORIES: Record<string, { icon: string; color: string }> = {
  read_file: { icon: '👁️', color: 'var(--info)' },
  list_directory: { icon: '📁', color: 'var(--info)' },
  get_directory_tree: { icon: '🌲', color: 'var(--info)' },
  search_code: { icon: '🔍', color: 'var(--info)' },
  get_error_details: { icon: '🐛', color: 'var(--info)' },
  create_file: { icon: '📝', color: 'var(--warning)' },
  create_folder: { icon: '📂', color: 'var(--warning)' },
  write_file: { icon: '✏️', color: 'var(--warning)' },
  build_project: { icon: '🔨', color: 'var(--warning)' },
  run_shell: { icon: '💻', color: 'var(--error)' },
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

  const category = TOOL_CATEGORIES[toolName] || { icon: '🔧', color: 'var(--text-muted)' };
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