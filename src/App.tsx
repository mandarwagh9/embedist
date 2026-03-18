import { useEffect } from 'react';
import { useUIStore } from './stores/uiStore';
import { useSettingsStore } from './stores/settingsStore';
import { TitleBar } from './components/Layout/TitleBar';
import { Sidebar } from './components/Layout/Sidebar';
import { TabBar } from './components/Layout/TabBar';
import { StatusBar } from './components/Layout/StatusBar';
import { BottomPanel } from './components/Layout/BottomPanel';
import { CodeEditor } from './components/Editor/CodeEditor';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { SettingsModal } from './components/Settings/SettingsModal';
import './styles/global.css';

function App() {
  const { tabs, activeTabId, sidebarSection, setBottomPanelTab, toggleBottomPanel } = useUIStore();
  const { open: openSettings } = useSettingsStore();
  
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+, or Ctrl+K to open settings
      if ((e.ctrlKey || e.metaKey) && (e.key === ',' || e.key === 'k')) {
        e.preventDefault();
        openSettings();
      }
      // Ctrl+B to toggle bottom panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleBottomPanel();
      }
      // Ctrl+Shift+B to open build panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setBottomPanelTab('build');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSettings, toggleBottomPanel, setBottomPanelTab]);

  const getDefaultCode = () => {
    return `// Welcome to Embedist
// AI-Native Embedded Development Environment

#include <Arduino.h>

// Your ESP32/Arduino code here

void setup() {
  Serial.begin(115200);
  Serial.println("Embedist ready!");
  
  // Initialize your peripherals
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  // Your main loop
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`;
  };

  const renderSidebarContent = () => {
    switch (sidebarSection) {
      case 'files':
        return <FileExplorer />;
      case 'search':
        return (
          <div className="sidebar-content">
            <div className="sidebar-placeholder">
              <span>Search functionality</span>
            </div>
          </div>
        );
      case 'serial':
        return (
          <div className="sidebar-content">
            <div className="sidebar-placeholder">
              <span>Serial Monitor</span>
            </div>
          </div>
        );
      case 'build':
        return (
          <div className="sidebar-content">
            <div className="sidebar-placeholder">
              <span>Build Panel</span>
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="sidebar-content">
            <div className="sidebar-placeholder">
              <span>AI Assistant</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <TitleBar />
      
      <div className="app-body">
        <Sidebar />
        
        <div className="app-sidebar-content">
          {renderSidebarContent()}
        </div>
        
        <div className="app-main">
          <TabBar />
          
          <div className="app-content">
            <CodeEditor 
              value={activeTab?.path ? '' : getDefaultCode()}
              language="cpp"
            />
          </div>
          
          <BottomPanel />
        </div>
      </div>
      
      <StatusBar />
      <SettingsModal />
    </div>
  );
}

export default App;
