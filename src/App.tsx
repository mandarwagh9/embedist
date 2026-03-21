import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from './stores/uiStore';
import { useSettingsStore } from './stores/settingsStore';
import { useFileStore } from './stores/fileStore';
import { useAIStore } from './stores/aiStore';
import { useFileSystem } from './hooks/useFileSystem';
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
import { BuildPanel } from './components/Build/BuildPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import './styles/global.css';

const SIDEBAR_MIN = 300;
const SIDEBAR_MAX = 700;

function App() {
  const {
    sidebarSection,
    sidebarWidth,
    setSidebarWidth,
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
    saveAllFiles,
    hasContentHydrated,
  } = useFileStore();
  const { setMode } = useAIStore();
  const { openFolder } = useFileSystem();

  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSidebarWidth]);

  const activeFileTab = openTabs.find(t => t.id === activeFileTabId);
  const activeContent = activeFileTab
    ? fileContents.get(activeFileTab.path) ?? activeFileTab.content ?? ''
    : undefined;
  const hasOpenFile = activeContent !== undefined && activeContent !== '';

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

      if (ctrl && e.altKey && e.key === 's') {
        e.preventDefault();
        saveAllFiles();
        return;
      }

      if (ctrl && e.key === '1') {
        e.preventDefault();
        setMode('chat');
        return;
      }

      if (ctrl && e.key === '2') {
        e.preventDefault();
        setMode('plan');
        return;
      }

      if (ctrl && e.key === '3') {
        e.preventDefault();
        setMode('agent');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSettings, toggleBottomPanel, setBottomPanelTab, bottomPanelVisible, navigateToFiles, navigateToAI, navigateToSerial, navigateToBuild, openFolder, activeFileTab, saveFile, saveAllFiles, setMode]);

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
        return <BuildPanel />;
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

        <div className="app-sidebar-content" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
          {renderSidebarContent()}
        </div>

        <div
          ref={resizeRef}
          className="sidebar-resize-handle"
          onMouseDown={handleResizeMouseDown}
          title="Drag to resize"
        >
          <div className="sidebar-resize-line" />
        </div>

        <div className="app-main">
          <TabBar />

          <div className="app-content">
            {!hasContentHydrated && openTabs.length > 0 ? (
              <div className="editor-loading">
                <div className="editor-loading-spinner" />
                <span>Loading...</span>
              </div>
            ) : (
              <CodeEditor
                value={activeContent !== undefined ? activeContent : getDefaultCode()}
                language="cpp"
                onChange={handleEditorChange}
                readOnly={!hasOpenFile}
              />
            )}
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
