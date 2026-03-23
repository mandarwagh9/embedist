import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
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
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { ToastContainer, setToastDispatcher, type ToastType } from './components/Common/Toast';
import './styles/global.css';

const SIDEBAR_MIN = 350;
const SIDEBAR_MAX = 700;

const EXT_TO_LANGUAGE: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  rb: 'ruby',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  ino: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  mdx: 'markdown',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',
  sql: 'sql',
  toml: 'ini',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  zig: 'zig',
};

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return EXT_TO_LANGUAGE[ext] || 'plaintext';
}

function App() {
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string }>>([]);

  useEffect(() => {
    setToastDispatcher((type, message) => {
      setToasts(prev => [...prev, { id: `toast-${Date.now()}`, type, message }]);
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
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
    setFileContent,
    saveFile,
    saveAllFiles,
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

  const activeFileTab = useMemo(
    () => openTabs.find(t => t.id === activeFileTabId),
    [openTabs, activeFileTabId]
  );

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    const tabId = useFileStore.getState().activeTabId;
    if (!tabId) return;
    const tab = useFileStore.getState().openTabs.find(t => t.id === tabId);
    if (tab) {
      setFileContent(tab.path, value);
    }
  }, [setFileContent]);

  const activeContent = useMemo(() => {
    if (!activeFileTabId) return undefined;
    const tab = openTabs.find(t => t.id === activeFileTabId);
    if (!tab) return undefined;
    const { fileContents: fc } = useFileStore.getState();
    return fc.get(tab.path) ?? tab.content ?? '';
  }, [activeFileTabId, openTabs]);

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
        const tabId = useFileStore.getState().activeTabId;
        if (tabId) {
          const tab = useFileStore.getState().openTabs.find(t => t.id === tabId);
          if (tab) saveFile(tab.path);
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
  }, [openSettings, toggleBottomPanel, setBottomPanelTab, bottomPanelVisible, navigateToFiles, navigateToAI, navigateToSerial, navigateToBuild, openFolder, saveFile, saveAllFiles, setMode]);

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
            <ErrorBoundary fallback={<div style={{ padding: 20, color: '#E94560', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Editor failed to load</div>}>
              <CodeEditor
                value={activeContent !== undefined ? activeContent : getDefaultCode()}
                language={activeFileTab ? getLanguageFromPath(activeFileTab.path) : 'cpp'}
                onChange={handleEditorChange}
                readOnly={!activeFileTab}
              />
            </ErrorBoundary>
          </div>

          <BottomPanel />
        </div>
      </div>

      <StatusBar />
      <SettingsModal />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
