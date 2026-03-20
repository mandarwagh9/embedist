import { getCurrentWindow } from '@tauri-apps/api/window';
import { useFileStore } from '../../stores/fileStore';
import './TitleBar.css';

const appWindow = getCurrentWindow();

export function TitleBar() {
  const { projectName } = useFileStore();
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left">
        <div className="titlebar-logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="titlebar-title">Embedist</span>
      </div>
      
      <div className="titlebar-center">
        <span className="titlebar-project">{projectName || 'No Project Open'}</span>
      </div>
      
      <div className="titlebar-controls">
        <button 
          className="titlebar-button" 
          onClick={handleMinimize}
          title="Minimize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M0 5h10" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
        <button 
          className="titlebar-button" 
          onClick={handleMaximize}
          title="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" fill="none"/>
          </svg>
        </button>
        <button 
          className="titlebar-button titlebar-close" 
          onClick={handleClose}
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
