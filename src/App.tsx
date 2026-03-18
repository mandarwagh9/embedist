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
import { AIChatPanel } from './components/AI/AIChatPanel';
import { SerialMonitor } from './components/Serial/SerialMonitor';
import { SettingsModal } from './components/Settings/SettingsModal';
import './styles/global.css';

function App() {
  const { 
    tabs, 
    activeTabId, 
    sidebarSection, 
    bottomPanelVisible,
    setBottomPanelTab, 
    toggleBottomPanel,
    navigateToFiles,
    navigateToAI,
    navigateToSerial,
    navigateToBuild
  } = useUIStore();
  const { open: openSettings } = useSettingsStore();
  
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === ',') {
        e.preventDefault();
        openSettings();
        return;
      }
      
      if (ctrl && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        navigateToFiles();
        return;
      }
      
      if (ctrl && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        navigateToAI();
        return;
      }
      
      if (ctrl && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        navigateToSerial();
        return;
      }
      
      if (ctrl && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        navigateToBuild();
        return;
      }
      
      if (ctrl && e.key === 'j') {
        e.preventDefault();
        if (!bottomPanelVisible) {
          setBottomPanelTab('terminal');
        }
        toggleBottomPanel();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSettings, toggleBottomPanel, setBottomPanelTab, bottomPanelVisible, navigateToFiles, navigateToAI, navigateToSerial, navigateToBuild]);

  const getDefaultCode = () => {
    return `// Welcome to Embedist
// AI-Native Embedded Development Environment

#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Embedist ready!");
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
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
      case 'ai':
        return <AIChatPanel />;
      case 'serial':
        return <SerialMonitor />;
      case 'build':
        return <FileExplorer />;
      default:
        return <FileExplorer />;
    }
  };

  return (
    <div className="app">
      <TitleBar />
      
      <div className="app-body">
        <div className="app-sidebar">
          <Sidebar />
        </div>
        
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
