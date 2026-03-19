import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useFileStore } from '../../stores/fileStore';
import { useAIStore } from '../../stores/aiStore';
import './StatusBar.css';

export function StatusBar() {
  const { serialConnected, serialPort, serialBaudRate, cursorLine, cursorColumn } = useUIStore();
  const { open: openSettings } = useSettingsStore();
  const { detectedBoard, projectName, isPlatformIOProject } = useFileStore();
  const { providers, activeProvider } = useAIStore();

  const activeProviderName = providers.find(p => p.id === activeProvider)?.name || 'No Provider';

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        {projectName ? (
          <>
            <div className="statusbar-item board">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
                <path d="M9 9H11M9 12H11M9 15H11M13 9H15M13 12H15M13 15H15"/>
              </svg>
              <span>{detectedBoard || (isPlatformIOProject ? 'PlatformIO Project' : 'Embedded Project')}</span>
            </div>
            
            <div className="statusbar-item">
              <span className={`status-indicator ${serialConnected ? 'connected' : ''}`} />
              <span>{serialPort || 'No Port'}</span>
            </div>
            
            {serialConnected && (
              <div className="statusbar-item">
                <span>{serialBaudRate} baud</span>
              </div>
            )}
          </>
        ) : (
          <div className="statusbar-item">
            <span>No Project Open</span>
          </div>
        )}
      </div>
      
      <div className="statusbar-right">
        <button className="statusbar-button" onClick={openSettings} title="Settings">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
        
        <div className="statusbar-item">
          <span>Ln {cursorLine}, Col {cursorColumn}</span>
        </div>
        
        <div className="statusbar-item">
          <span>UTF-8</span>
        </div>
        
        <div className="statusbar-item">
          <span>{activeProviderName}</span>
        </div>
      </div>
    </div>
  );
}
