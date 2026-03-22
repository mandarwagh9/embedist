import { useState, useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore, PlanPhase } from '../../../stores/aiStore';
import { useFileStore } from '../../../stores/fileStore';
import './PlanToolbar.css';

interface PlanToolbarProps {
  messages: { content: string }[];
  onApprove: () => void;
  onDiscard: () => void;
}

const PHASE_CONFIG: Record<PlanPhase, { label: string; color: string }> = {
  explore:  { label: 'Explore',   color: '#60A5FA' },
  design:   { label: 'Design',   color: '#60A5FA' },
  review:   { label: 'Review',   color: '#FBBF24' },
  clarify:  { label: 'Clarify',  color: '#FBBF24' },
  ready:    { label: 'Build',    color: '#34D399' },
};

export function PlanToolbar({ messages, onApprove, onDiscard }: PlanToolbarProps) {
  const { planPhase, planContent, setIsEditingPlan } = useAIStore();
  const rootPath = useFileStore((s) => s.rootPath);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const lastAssistantMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const hasPlan = !!(planContent || lastAssistantMessage?.content);
  const phase = PHASE_CONFIG[planPhase];

  const handleSavePlan = useCallback(async () => {
    const content = planContent || lastAssistantMessage?.content || '';
    if (!content) return;

    const defaultName = `embedist-plan-${new Date().toISOString().slice(0, 10)}.md`;
    const targetDir = rootPath || '.';

    try {
      const path = await save({
        defaultPath: `${targetDir}/${defaultName}`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });

      if (path) {
        await invoke('save_plan_file', { directory: '', name: path, content });
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(null), 1500);
      }
    } catch {
      setSaveStatus('Failed');
      setTimeout(() => setSaveStatus(null), 1500);
    }
  }, [planContent, lastAssistantMessage, rootPath]);

  const handleEditPlan = useCallback(() => {
    setIsEditingPlan(true);
  }, [setIsEditingPlan]);

  return (
    <div className="plan-toolbar">
      <div className="plan-toolbar-top">
        <div className="plan-mode-badge">
          <span className="plan-dot" style={{ background: phase.color }} />
          <span className="plan-mode-text">Plan</span>
          <span className="plan-phase-sep">/</span>
          <span className="plan-phase-text" style={{ color: phase.color }}>{phase.label}</span>
        </div>

        {saveStatus && (
          <span className="plan-save-status">{saveStatus}</span>
        )}
      </div>

      {hasPlan && (
        <div className="plan-toolbar-actions">
          <button className="plan-btn plan-btn-ghost" onClick={handleSavePlan} title="Save plan">
            Save
          </button>
          <button className="plan-btn plan-btn-ghost" onClick={handleEditPlan} title="Edit plan">
            Edit
          </button>
          <button className="plan-btn plan-btn-ghost plan-btn-danger" onClick={onDiscard} title="Discard plan">
            Discard
          </button>
          <div className="plan-spacer" />
          <button className="plan-btn plan-btn-approve" onClick={onApprove} title="Approve and build">
            Approve &amp; Build
          </button>
        </div>
      )}
    </div>
  );
}
