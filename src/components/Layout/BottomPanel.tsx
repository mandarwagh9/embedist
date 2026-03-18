import { useUIStore } from '../../stores/uiStore';
import { SerialMonitor } from '../Serial/SerialMonitor';
import { AIChatPanel } from '../AI/AIChatPanel';
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
        {bottomPanelTab === 'terminal' && <SerialMonitor />}
        {bottomPanelTab === 'ai' && <AIChatPanel />}
        {bottomPanelTab === 'build' && (
          <div className="panel-build">
            <div className="build-placeholder">
              <div className="build-actions">
                <button className="build-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8C21 7.44772 20.5523 7 20 7H4C3.44772 7 3 7.44772 3 8V16C3 16.5523 3.44772 17 4 17H20C20.5523 17 21 16.5523 21 16Z"/>
                    <path d="M7 11L10 14L17 7"/>
                  </svg>
                  Build
                </button>
                <button className="build-btn upload">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
                    <path d="M12 3V15M12 15L8 11M12 15L16 11"/>
                  </svg>
                  Upload
                </button>
              </div>
              <span className="build-hint">Click Build to compile your project</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
