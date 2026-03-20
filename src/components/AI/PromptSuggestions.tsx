import type { AIMode } from '../../lib/ai-prompts';

interface PromptSuggestion {
  title: string;
  prompt: string;
  icon: JSX.Element;
}

interface PromptSuggestionsProps {
  mode: AIMode;
  onSelect: (prompt: string) => void;
}

const CHAT_SUGGESTIONS: PromptSuggestion[] = [
  {
    title: 'Explain code',
    prompt: 'Explain how the current code in the editor works',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  {
    title: 'Refactor',
    prompt: 'Suggest improvements to refactor the current code',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    title: 'Add tests',
    prompt: 'Write unit tests for the current code',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const PLAN_SUGGESTIONS: PromptSuggestion[] = [
  {
    title: 'Plan a feature',
    prompt: 'Plan the implementation of a new LED blink pattern feature',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    title: 'Review architecture',
    prompt: 'Review the project structure and suggest improvements',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: 'Setup guide',
    prompt: 'Create a setup guide for this project',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

const DEBUG_SUGGESTIONS: PromptSuggestion[] = [
  {
    title: 'Debug build',
    prompt: 'Build is failing — help me debug the error',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: 'Serial monitor',
    prompt: 'I\'m seeing unexpected output in the serial monitor',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10H8M10 10H12M14 10H16" />
      </svg>
    ),
  },
  {
    title: 'Performance issue',
    prompt: 'The code is running slower than expected — find the bottleneck',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

const AGENT_SUGGESTIONS: PromptSuggestion[] = [
  {
    title: 'Add logging',
    prompt: 'Add serial logging to track variable values during runtime',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Implement feature',
    prompt: 'Add a debounce function to handle button presses',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'Optimize code',
    prompt: 'Optimize the main loop for better performance',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

const MODE_CONFIG: Record<AIMode, { suggestions: PromptSuggestion[]; colorVar: string }> = {
  chat: { suggestions: CHAT_SUGGESTIONS, colorVar: 'var(--accent)' },
  plan: { suggestions: PLAN_SUGGESTIONS, colorVar: 'var(--info)' },
  debug: { suggestions: DEBUG_SUGGESTIONS, colorVar: 'var(--warning)' },
  agent: { suggestions: AGENT_SUGGESTIONS, colorVar: '#9b59b6' },
};

export function PromptSuggestions({ mode, onSelect }: PromptSuggestionsProps) {
  const { suggestions, colorVar } = MODE_CONFIG[mode];

  return (
    <div className="prompt-suggestions">
      <p className="prompt-suggestions-hint">Try these prompts:</p>
      <div className="prompt-suggestions-grid">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="prompt-suggestion-card"
            onClick={() => onSelect(s.prompt)}
            style={{ '--suggestion-color': colorVar } as React.CSSProperties}
          >
            <span className="prompt-suggestion-icon" style={{ color: colorVar }}>
              {s.icon}
            </span>
            <span className="prompt-suggestion-title">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
