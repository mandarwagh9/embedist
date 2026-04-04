import type { AIMode } from '../../lib/ai-prompts';
import './ModeToggle.css';

interface ModeToggleProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
}

const MODES: Array<{ id: AIMode; label: string; shortcut: string; icon: JSX.Element }> = [
  { 
    id: 'chat', 
    label: 'Chat', 
    shortcut: '⌘1',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    )
  },
  { 
    id: 'plan', 
    label: 'Plan', 
    shortcut: '⌘2',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 16h6"/>
      </svg>
    )
  },
  { 
    id: 'debug', 
    label: 'Debug', 
    shortcut: '⌘3',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    )
  },
  { 
    id: 'agent', 
    label: 'Agent', 
    shortcut: '⌘4',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <circle cx="12" cy="5" r="3"/>
        <path d="M12 8v3"/>
        <circle cx="8" cy="16" r="1" fill="currentColor"/>
        <circle cx="16" cy="16" r="1" fill="currentColor"/>
      </svg>
    )
  },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="ai-mode-bar">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`ai-mode-pill ${mode === m.id ? 'active' : ''}`}
          data-mode={m.id}
          onClick={() => onModeChange(m.id)}
          title={`${m.label} mode`}
        >
          <span className="ai-mode-pill-icon">{m.icon}</span>
          <span className="ai-mode-pill-label">{m.label}</span>
          <span className="ai-mode-pill-shortcut">{m.shortcut}</span>
        </button>
      ))}
    </div>
  );
}
