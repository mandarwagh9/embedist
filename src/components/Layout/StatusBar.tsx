import { useUIStore } from '../../stores/uiStore';
import './StatusBar.css';

export function StatusBar() {
  const { serialConnected, serialPort, serialBaudRate } = useUIStore();

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <div className="statusbar-item">
          <span className="statusbar-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <path d="M9 9h6M9 12h6M9 15h4"/>
            </svg>
          </span>
          <span>ESP32 Dev Module</span>
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
      </div>
      
      <div className="statusbar-right">
        <div className="statusbar-item">
          <span>Ln 1, Col 1</span>
        </div>
        
        <div className="statusbar-item">
          <span>UTF-8</span>
        </div>
        
        <div className="statusbar-item">
          <span className="statusbar-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </span>
          <span>OpenAI</span>
        </div>
      </div>
    </div>
  );
}
