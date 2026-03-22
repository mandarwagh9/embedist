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

const PHASE_CONFIG: Record<PlanPhase, { label: string; color: string; bgColor: string }> = {
  explore:  { label: 'Explore',   color: '#3B82F6', bgColor: 'rgba(59,130,246,0.12)' },
  design:   { label: 'Design',   color: '#3B82F6', bgColor: 'rgba(59,130,246,0.12)' },
  review:   { label: 'Review',   color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)' },
  clarify:  { label: 'Clarify',  color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)' },
  ready:    { label: 'Build',    color: '#10B981', bgColor: 'rgba(16,185,129,0.12)' },
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
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch {
      setSaveStatus('Failed');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, [planContent, lastAssistantMessage, rootPath]);

  const handleEditPlan = useCallback(() => {
    setIsEditingPlan(true);
  }, [setIsEditingPlan]);

  return (
    <div className="plan-toolbar">
      <div className="plan-toolbar-left">
        <div className="plan-mode-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h6"/>
          </svg>
          <span>Plan</span>
        </div>

        {hasPlan && (
          <div className="plan-phase-badge" style={{ color: phase.color, background: phase.bgColor }}>
            <span
              className="plan-phase-dot"
              style={{ background: phase.color, boxShadow: `0 0 6px ${phase.color}` }}
            />
            <span>{phase.label}</span>
          </div>
        )}

        {saveStatus && (
          <span className="plan-save-status">{saveStatus}</span>
        )}
      </div>

      {hasPlan && (
        <div className="plan-toolbar-right">
          <button
            className="plan-btn plan-btn-icon plan-btn-danger"
            onClick={onDiscard}
            title="Discard plan"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div className="plan-toolbar-divider" />

          <button
            className="plan-btn plan-btn-secondary"
            onClick={handleSavePlan}
            title="Save plan to .md file"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>Save</span>
          </button>

          <button
            className="plan-btn plan-btn-secondary"
            onClick={handleEditPlan}
            title="Edit plan before building"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>Edit</span>
          </button>

          <button
            className="plan-btn plan-btn-primary"
            onClick={onApprove}
            title="Approve plan and build"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Approve &amp; Build</span>
          </button>
        </div>
      )}
    </div>
  );
}
