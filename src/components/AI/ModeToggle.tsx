import { useState, useRef, useEffect } from 'react';
import type { AIMode } from '../../lib/ai-prompts';
import './ModeToggle.css';

interface ModeToggleProps {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
}

const MODES: Array<{ id: AIMode; label: string; icon: JSX.Element }> = [
  { 
    id: 'chat', 
    label: 'Chat', 
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    )
  },
  { 
    id: 'plan', 
    label: 'Plan', 
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
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    )
  },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMode = MODES.find(m => m.id === mode);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modeId: AIMode) => {
    onModeChange(modeId);
    setIsOpen(false);
  };

  return (
    <div className="ai-mode-dropdown" ref={dropdownRef}>
      <button 
        className={`ai-mode-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        data-mode={mode}
      >
        <span className="ai-mode-trigger-icon">{currentMode?.icon}</span>
        <span className="ai-mode-trigger-label">{currentMode?.label}</span>
        <span className="ai-mode-trigger-arrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="ai-mode-menu">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`ai-mode-option ${mode === m.id ? 'active' : ''}`}
              onClick={() => handleSelect(m.id)}
              data-mode={m.id}
            >
              <span className="ai-mode-option-icon">{m.icon}</span>
              <span className="ai-mode-option-label">{m.label}</span>
              {mode === m.id && (
                <span className="ai-mode-option-check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
