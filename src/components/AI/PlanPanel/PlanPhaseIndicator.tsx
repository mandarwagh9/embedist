import { useAIStore, PlanPhase } from '../../../stores/aiStore';
import './PlanPhaseIndicator.css';

const PHASES: PlanPhase[] = ['explore', 'design', 'review', 'clarify', 'ready'];

const PHASE_CONFIG: Record<PlanPhase, { label: string; color: string }> = {
  explore: { label: 'Explore', color: '#60A5FA' },
  design: { label: 'Design', color: '#60A5FA' },
  review: { label: 'Review', color: '#FBBF24' },
  clarify: { label: 'Clarify', color: '#FBBF24' },
  ready: { label: 'Build', color: '#34D399' },
};

export function PlanPhaseIndicator() {
  const { planPhase, setPlanPhase } = useAIStore();
  const currentIndex = PHASES.indexOf(planPhase);

  return (
    <div className="plan-phase-indicator">
      {PHASES.map((phase, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const config = PHASE_CONFIG[phase];

        return (
          <button
            key={phase}
            className={`plan-phase-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            onClick={() => setPlanPhase(phase)}
            title={config.label}
          >
            <span
              className="plan-phase-dot"
              style={{
                background: isDone || isCurrent ? config.color : undefined,
                borderColor: config.color,
              }}
            />
            <span
              className="plan-phase-label"
              style={{ color: isCurrent ? config.color : undefined }}
            >
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
