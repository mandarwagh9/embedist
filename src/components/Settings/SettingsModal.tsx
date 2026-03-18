import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { SettingsSidebar } from './SettingsSidebar';
import { AISettings } from './sections/AISettings';
import { EditorSettings } from './sections/EditorSettings';
import { SerialSettings } from './sections/SerialSettings';
import { BuildSettings } from './sections/BuildSettings';
import './SettingsModal.css';

export function SettingsModal() {
  const { isOpen, close, activeSection } = useSettingsStore();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'ai':
        return <AISettings />;
      case 'editor':
        return <EditorSettings />;
      case 'serial':
        return <SerialSettings />;
      case 'build':
        return <BuildSettings />;
      default:
        return <AISettings />;
    }
  };

  return (
    <div className="settings-overlay" onClick={close}>
      <div 
        ref={modalRef}
        className="settings-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={close}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </button>
        </div>
        <div className="settings-body">
          <SettingsSidebar />
          <div className="settings-content">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
