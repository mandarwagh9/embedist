import { useState } from 'react';
import './ToolCallBlock.css';

interface ToolCallBlockProps {
  toolName: string;
  args: string;
  output: string;
  success: boolean;
  elapsedMs?: number;
}

const TOOL_CONFIG: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  read_file: {
    label: 'Read File',
    color: 'var(--info)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  write_file: {
    label: 'Write File',
    color: 'var(--success)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  create_file: {
    label: 'Create File',
    color: 'var(--success)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
  },
  create_folder: {
    label: 'Create Folder',
    color: 'var(--success)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    ),
  },
  list_directory: {
    label: 'List Directory',
    color: 'var(--info)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
      </svg>
    ),
  },
  get_directory_tree: {
    label: 'Directory Tree',
    color: 'var(--info)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 18a2 2 0 00-2 2 2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2zM7 18a2 2 0 00-2 2 2 2 0 002 2 2 2 0 002-2 2 2 0 00-2-2z"/>
        <line x1="9" y1="18" x2="15" y2="18"/>
        <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/>
        <line x1="9" y1="18" x2="9" y2="6"/>
        <line x1="15" y1="18" x2="15" y2="6"/>
      </svg>
    ),
  },
  search_code: {
    label: 'Search Code',
    color: '#3498db',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  build_project: {
    label: 'Build Project',
    color: 'var(--warning)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  run_shell: {
    label: 'Shell Command',
    color: '#A78BFA',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
  },
};

function extractFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function formatArgs(args: string): string {
  try {
    const parsed = JSON.parse(args);
    const entries = Object.entries(parsed);
    if (entries.length === 0) return '{}';
    if (entries.length === 1) {
      const [key, val] = entries[0];
      const str = typeof val === 'string' ? val : JSON.stringify(val);
      return `${key}: ${str.length > 80 ? str.slice(0, 80) + '...' : str}`;
    }
    return entries.map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(', ');
  } catch {
    return args.slice(0, 100);
  }
}

function formatOutput(output: string): string {
  const lines = output.split('\n');
  if (lines.length <= 5) return output;
  return lines.slice(0, 5).join('\n') + `\n\n... ${lines.length - 5} more lines`;
}

export function ToolCallBlock({ toolName, args, output, success, elapsedMs }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const config = TOOL_CONFIG[toolName] || {
    label: toolName,
    color: 'var(--text-muted)',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  };

  const summary = extractFileName(formatArgs(args));

  return (
    <div className={`tool-call-block ${success ? 'success' : 'error'}`}>
      <button className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-call-icon" style={{ color: config.color }}>{config.icon}</span>
        <span className="tool-call-name">{config.label}</span>
        <span className="tool-call-summary">{summary}</span>
        {elapsedMs !== undefined && (
          <span className="tool-call-time">{(elapsedMs / 1000).toFixed(1)}s</span>
        )}
        <svg
          className={`tool-call-chevron ${expanded ? 'expanded' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {expanded && (
        <div className="tool-call-body">
          <div className="tool-call-section">
            <span className="tool-call-section-label">Arguments</span>
            <pre className="tool-call-code">{args}</pre>
          </div>
          <div className="tool-call-section">
            <span className="tool-call-section-label">Output</span>
            <pre className="tool-call-code tool-call-output">{success ? '' : 'error '}{formatOutput(output)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
