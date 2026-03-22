import { PlanPhase } from '../../../stores/aiStore';
import './PlanPhaseIndicator.css';

const PHASES: PlanPhase[] = ['explore', 'design', 'review', 'clarify', 'ready'];

const PHASE_INFO: Record<PlanPhase, { label: string; color: string; icon: JSX.Element }> = {
  explore: {
    label: 'Explore',
    color: '#3B82F6',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
  },
  design: {
    label: 'Design',
    color: '#3B82F6',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  review: {
    label: 'Review',
    color: '#F59E0B',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
  },
  clarify: {
    label: 'Clarify',
    color: '#F59E0B',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  ready: {
    label: 'Build',
    color: '#10B981',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
};

interface PlanPhaseIndicatorProps {
  currentPhase: PlanPhase;
}

export function PlanPhaseIndicator({ currentPhase }: PlanPhaseIndicatorProps) {
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="plan-phase-indicator">
      {PHASES.map((phase, index) => {
        const info = PHASE_INFO[phase];
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <div key={phase} className="plan-phase-step">
            {index > 0 && (
              <div className={`plan-phase-line ${isDone ? 'done' : ''}`} />
            )}
            <div
              className={`plan-phase-node ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${isUpcoming ? 'upcoming' : ''}`}
              style={{
                '--phase-color': info.color,
              } as React.CSSProperties}
              title={info.label}
            >
              {isDone ? (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                info.icon
              )}
            </div>
            <span
              className={`plan-phase-label ${isActive ? 'active' : ''}`}
              style={{ color: isActive ? info.color : undefined }}
            >
              {info.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
