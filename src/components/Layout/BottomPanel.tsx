import { useUIStore } from '../../stores/uiStore';
import './BottomPanel.css';

export function BottomPanel() {
  const { 
    bottomPanelVisible, 
    bottomPanelHeight, 
    bottomPanelTab,
    toggleBottomPanel,
    setBottomPanelTab 
  } = useUIStore();

  const tabs = [
    { id: 'terminal', label: 'Terminal' },
    { id: 'ai', label: 'AI Assistant' },
    { id: 'build', label: 'Build Output' },
  ] as const;

  return (
    <div 
      className={`bottom-panel ${bottomPanelVisible ? 'visible' : ''}`}
      style={{ height: bottomPanelVisible ? bottomPanelHeight : 0 }}
    >
      <div className="bottom-panel-header">
        <div className="bottom-panel-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`bottom-panel-tab ${bottomPanelTab === tab.id ? 'active' : ''}`}
              onClick={() => setBottomPanelTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="bottom-panel-toggle" onClick={toggleBottomPanel}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
      </div>
      
      <div className="bottom-panel-content">
        {bottomPanelTab === 'terminal' && (
          <div className="panel-terminal">
            <div className="terminal-placeholder">
              <span>Connect a device to view serial output</span>
            </div>
          </div>
        )}
        
        {bottomPanelTab === 'ai' && (
          <div className="panel-ai">
            <div className="ai-placeholder">
              <p>AI Assistant - Ask me anything about your code</p>
            </div>
          </div>
        )}
        
        {bottomPanelTab === 'build' && (
          <div className="panel-build">
            <div className="build-placeholder">
              <span>Build output will appear here</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
