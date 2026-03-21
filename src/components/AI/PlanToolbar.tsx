import { useState, useEffect, useRef } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore, PlanPhase } from '../../stores/aiStore';
import { useFileStore } from '../../stores/fileStore';
import './PlanToolbar.css';

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;
    const modal = ref.current;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    modal.addEventListener('keydown', handleKeyDown);
    return () => modal.removeEventListener('keydown', handleKeyDown);
  }, [isActive, ref]);
}

interface PlanToolbarProps {
  messages: { content: string }[];
  onApprove: () => void;
  onDiscard: () => void;
}

const PHASE_LABELS: Record<PlanPhase, { label: string; color: string }> = {
  explore: { label: 'Exploring', color: 'var(--info)' },
  design: { label: 'Designing', color: 'var(--info)' },
  review: { label: 'Reviewing', color: 'var(--warning)' },
  clarify: { label: 'Clarifying', color: 'var(--warning)' },
  ready: { label: 'Ready to Build', color: 'var(--success)' },
};

export function PlanToolbar({ messages, onApprove, onDiscard }: PlanToolbarProps) {
  const { planPhase, planContent, isEditingPlan, setIsEditingPlan, setPlanContent, setPlanToApprove } = useAIStore();
  const rootPath = useFileStore((s) => s.rootPath);
  const [editText, setEditText] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(editModalRef, isEditingPlan);

  const lastAssistantMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;
  const hasPlan = !!(planContent || lastAssistantMessage?.content);

  useEffect(() => {
    if (isEditingPlan && editTextareaRef.current) {
      editTextareaRef.current.focus();
    }
  }, [isEditingPlan]);

  useEffect(() => {
    if (!isEditingPlan) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelEdit();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditingPlan]);

  const handleSavePlan = async () => {
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
        setSaveStatus('Plan saved!');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
      console.error('Failed to save plan:', err);
      setSaveStatus('Failed to save');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const handleEditPlan = () => {
    const content = planContent || lastAssistantMessage?.content || '';
    setEditText(content);
    setIsEditingPlan(true);
    setPlanToApprove(content);
  };

  const handleSaveEdit = () => {
    setPlanContent(editText);
    setPlanToApprove(editText);
    setIsEditingPlan(false);
  };

  const handleCancelEdit = () => {
    setIsEditingPlan(false);
    setEditText('');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancelEdit();
    }
  };

  const phase = PHASE_LABELS[planPhase];

  return (
    <>
      <div className="plan-toolbar">
        <div className="plan-toolbar-top">
          <div className="plan-phase">
            <span className="plan-phase-dot" style={{ '--phase-color': phase.color } as React.CSSProperties} />
            <span className="plan-phase-label" style={{ color: phase.color }}>{phase.label}</span>
          </div>
          <div className="plan-mode-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h6"/>
            </svg>
            <span>Plan Mode</span>
            <span className="plan-mode-hint">— Read-only planning</span>
          </div>
          {saveStatus && <span className="plan-save-status">{saveStatus}</span>}
        </div>

        {hasPlan && (
          <div className="plan-toolbar-actions">
            <button className="plan-tool-btn" onClick={handleSavePlan} title="Save plan to .md file">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>Save</span>
            </button>
            <button className="plan-tool-btn" onClick={handleEditPlan} title="Edit plan before building">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span>Edit</span>
            </button>
            <button className="plan-tool-btn discard" onClick={onDiscard} title="Discard this plan and start over">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span>Discard</span>
            </button>
            <div className="plan-action-divider" />
            <button className="plan-tool-btn approve" onClick={onApprove} title="Approve plan and switch to Chat to implement">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Approve &amp; Build</span>
            </button>
          </div>
        )}
      </div>

      {isEditingPlan && (
        <div className="plan-edit-backdrop" onClick={handleBackdropClick}>
          <div ref={editModalRef} className="plan-edit-modal" role="dialog" aria-modal="true" aria-label="Edit Plan">
            <div className="plan-edit-header">
              <span className="plan-edit-title">Edit Plan</span>
              <button className="plan-edit-close" onClick={handleCancelEdit} title="Close (Esc)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <textarea
              ref={editTextareaRef}
              className="plan-edit-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Edit your plan here..."
              spellCheck={false}
            />
            <div className="plan-edit-footer">
              <span className="plan-edit-hint">Press Esc to cancel</span>
              <div className="plan-edit-buttons">
                <button className="plan-tool-btn" onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button className="plan-tool-btn primary" onClick={handleSaveEdit}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
