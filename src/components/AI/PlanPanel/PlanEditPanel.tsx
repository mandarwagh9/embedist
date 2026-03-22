import { useState, useEffect, useRef } from 'react';
import { useAIStore } from '../../../stores/aiStore';
import './PlanEditPanel.css';

export function PlanEditPanel() {
  const { planContent, setPlanContent, setIsEditingPlan, setPlanToApprove } = useAIStore();
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(planContent || '');
  }, [planContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editText]);

  const handleSave = () => {
    setPlanContent(editText);
    setPlanToApprove(editText);
    setIsEditingPlan(false);
  };

  const handleCancel = () => {
    setIsEditingPlan(false);
    setEditText('');
  };

  return (
    <div className="plan-edit-panel">
      <div className="plan-edit-header">
        <span className="plan-edit-title">Edit Plan</span>
        <span className="plan-edit-hint">
          <kbd>Esc</kbd> cancel &nbsp;&middot;&nbsp; <kbd>Ctrl+Enter</kbd> save
        </span>
      </div>
      <textarea
        ref={textareaRef}
        className="plan-edit-textarea"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        placeholder="Edit your plan here..."
        spellCheck={false}
      />
      <div className="plan-edit-footer">
        <button className="plan-edit-cancel" onClick={handleCancel}>
          Cancel
        </button>
        <button className="plan-edit-save" onClick={handleSave}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Save Changes
        </button>
      </div>
    </div>
  );
}
