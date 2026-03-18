import { useUIStore } from '../../stores/uiStore';
import { SerialMonitor } from '../Serial/SerialMonitor';
import { AIChatPanel } from '../AI/AIChatPanel';
import { BuildPanel } from '../Build/BuildPanel';
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
        {bottomPanelTab === 'build' && <BuildPanel />}
      </div>
    </div>
  );
}
