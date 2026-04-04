import { useRef, useCallback, useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { SerialMonitor } from '../Serial/SerialMonitor';
import { AIChatPanel } from '../AI/AIChatPanel';
import { BuildPanel } from '../Build/BuildPanel';
import { TerminalPanel } from '../Terminal/TerminalPanel';
import './BottomPanel.css';

const MIN_BOTTOM_PANEL_HEIGHT = 100;
const MAX_BOTTOM_PANEL_HEIGHT = 600;

export function BottomPanel() {
  const { 
    bottomPanelVisible, 
    bottomPanelHeight, 
    bottomPanelTab,
    toggleBottomPanel,
    setBottomPanelTab,
    setBottomPanelHeight,
  } = useUIStore();

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = bottomPanelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startYRef.current - moveEvent.clientY;
      const newHeight = Math.min(MAX_BOTTOM_PANEL_HEIGHT, Math.max(MIN_BOTTOM_PANEL_HEIGHT, startHeightRef.current + delta));
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      cleanupRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    cleanupRef.current = handleMouseUp;
  }, [bottomPanelHeight, setBottomPanelHeight]);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const tabs = [
    { id: 'terminal', label: 'Terminal' },
    { id: 'serial', label: 'Serial Monitor' },
    { id: 'ai', label: 'AI Assistant' },
    { id: 'build', label: 'Build Output' },
  ] as const;

  return (
    <div 
      className={`bottom-panel ${bottomPanelVisible ? 'visible' : ''}`}
      style={{ height: bottomPanelVisible ? bottomPanelHeight : 0 }}
    >
      <div
        className="bottom-panel-resize-handle"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />
      <div className="bottom-panel-header">
        <div className="bottom-panel-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`bottom-panel-tab ${bottomPanelTab === tab.id ? 'active' : ''}`}
              onClick={() => setBottomPanelTab(tab.id)}
              role="tab"
              aria-selected={bottomPanelTab === tab.id}
              aria-controls={`bottom-panel-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="bottom-panel-toggle" onClick={toggleBottomPanel} aria-label="Toggle bottom panel">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
      </div>
      
      <div className="bottom-panel-content">
        <div className={`bottom-panel-tab-content ${bottomPanelTab === 'terminal' ? 'active' : ''}`} id="bottom-panel-terminal" role="tabpanel">
          <TerminalPanel />
        </div>
        <div className={`bottom-panel-tab-content ${bottomPanelTab === 'serial' ? 'active' : ''}`} id="bottom-panel-serial" role="tabpanel">
          <SerialMonitor />
        </div>
        <div className={`bottom-panel-tab-content ${bottomPanelTab === 'ai' ? 'active' : ''}`} id="bottom-panel-ai" role="tabpanel">
          <AIChatPanel />
        </div>
        <div className={`bottom-panel-tab-content ${bottomPanelTab === 'build' ? 'active' : ''}`} id="bottom-panel-build" role="tabpanel">
          <BuildPanel />
        </div>
      </div>
    </div>
  );
}
