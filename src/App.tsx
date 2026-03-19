import { useEffect } from 'react';
import { useUIStore } from './stores/uiStore';
import { useSettingsStore } from './stores/settingsStore';
import { useFileStore } from './stores/fileStore';
import { useAIStore } from './stores/aiStore';
import { TitleBar } from './components/Layout/TitleBar';
import { MenuBar } from './components/Layout/MenuBar';
import { Sidebar } from './components/Layout/Sidebar';
import { TabBar } from './components/Layout/TabBar';
import { StatusBar } from './components/Layout/StatusBar';
import { BottomPanel } from './components/Layout/BottomPanel';
import { CodeEditor } from './components/Editor/CodeEditor';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { AIChatPanel } from './components/AI/AIChatPanel';
import { SerialMonitor } from './components/Serial/SerialMonitor';
import { SettingsModal } from './components/Settings/SettingsModal';
import { useFileSystem } from './hooks/useFileSystem';
import { MODE_SWITCH_REMINDERS } from './lib/ai-prompts';
import type { AIMode } from './lib/ai-prompts';
import './styles/global.css';

function App() {
  const { 
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
  const { 
    rootPath,
    openTabs,
    activeTabId: activeFileTabId,
    fileContents,
    setFileContent,
    saveFile,
  } = useFileStore();
  const { openFolder } = useFileSystem();
  const { mode: aiMode, setMode, addMessage } = useAIStore();
  
  const activeFileTab = openTabs.find(t => t.id === activeFileTabId);
  const activeContent = activeFileTab ? fileContents.get(activeFileTab.path) : undefined;
  const hasOpenFile = activeContent !== undefined;

  const switchAIMode = (newMode: AIMode) => {
    if (newMode !== aiMode) {
      setMode(newMode);
      const reminder = MODE_SWITCH_REMINDERS[newMode];
      if (reminder) {
        addMessage({ role: 'system', content: reminder });
      }
    }
  };

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
      
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        openFolder();
        return;
      }
      
      if (ctrl && e.key === 's') {
        e.preventDefault();
        if (activeFileTab) {
          saveFile(activeFileTab.path);
        }
        return;
      }
      
      if (ctrl && e.key === '1') {
        e.preventDefault();
        switchAIMode('chat');
        return;
      }
      
      if (ctrl && e.key === '2') {
        e.preventDefault();
        switchAIMode('plan');
        return;
      }
      
      if (ctrl && e.key === '3') {
        e.preventDefault();
        switchAIMode('debug');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSettings, toggleBottomPanel, setBottomPanelTab, bottomPanelVisible, navigateToFiles, navigateToAI, navigateToSerial, navigateToBuild, openFolder, activeFileTab, saveFile, aiMode, switchAIMode]);

  const getDefaultCode = () => {
    if (rootPath) {
      return '// Open a file from the explorer to start editing\n// Or create a new file with File > New File';
    }
    return `// Welcome to Embedist
// AI-Native Embedded Development Environment

// Open a folder to get started!
// Use File > Open Folder or Ctrl+O

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

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileTab && value !== undefined) {
      setFileContent(activeFileTab.path, value);
    }
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
      <MenuBar />
      
      <div className="app-body">
        <Sidebar />
        
        <div className="app-sidebar-content">
          {renderSidebarContent()}
        </div>
        
        <div className="app-main">
          <TabBar />
          
          <div className="app-content">
            <CodeEditor 
              value={activeContent !== undefined ? activeContent : getDefaultCode()}
              language="cpp"
              onChange={handleEditorChange}
              readOnly={!hasOpenFile}
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
