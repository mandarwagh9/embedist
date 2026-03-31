import { useAIStore, PlanPhase } from '../../../stores/aiStore';
import './PlanToolbar.css';

interface PlanToolbarProps {
  onApprove: () => void;
  onDiscard: () => void;
  onEdit: () => void;
}

const PHASE_CONFIG: Record<PlanPhase, { label: string; color: string }> = {
  explore:  { label: 'Explore',  color: '#60A5FA' },
  design:   { label: 'Design',  color: '#60A5FA' },
  review:   { label: 'Review',  color: '#FBBF24' },
  clarify:  { label: 'Clarify', color: '#FBBF24' },
  ready:    { label: 'Build',   color: '#34D399' },
};

export function PlanToolbar({ onApprove, onDiscard, onEdit }: PlanToolbarProps) {
  const { planPhase, setPlanExplorerMode } = useAIStore();
  const phase = PHASE_CONFIG[planPhase];

  const handleExplore = () => {
    setPlanExplorerMode('exploring');
  };

  return (
    <div className="plan-toolbar">
      <div className="plan-toolbar-left">
        <span className="plan-dot" style={{ background: phase.color }} />
        <span className="plan-label">Plan</span>
        <span className="plan-sep">/</span>
        <span className="plan-phase" style={{ color: phase.color }}>{phase.label}</span>
      </div>

      <div className="plan-toolbar-right">
        <button className="plan-btn plan-btn-ghost" onClick={handleExplore} title="Explore project files">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          Explore
        </button>
        <button className="plan-btn plan-btn-ghost" onClick={onEdit} title="Edit plan">
          Edit
        </button>
        <button className="plan-btn plan-btn-ghost plan-btn-danger" onClick={onDiscard} title="Discard plan">
          Discard
        </button>
        <button className="plan-btn plan-btn-approve" onClick={onApprove} title="Approve and build">
          Approve &amp; Build
        </button>
      </div>
    </div>
  );
}
