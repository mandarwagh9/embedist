import { useState, useRef, useEffect, useCallback } from 'react';
import { useFileStore } from '../../stores/fileStore';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Dialog } from '../Common/Dialog';
import './MenuBar.css';

interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
  onClose: () => void;
}

function Menu({ items, onClose }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  return (
    <div className="menu-dropdown" ref={menuRef}>
      {items.map((item, index) => (
        item.divider ? (
          <div key={index} className="menu-divider" />
        ) : (
          <button
            key={index}
            className={`menu-item ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
          >
            <span className="menu-item-label">{item.label}</span>
            {item.shortcut && (
              <span className="menu-item-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      ))}
    </div>
  );
}

export function MenuBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  
  const {
    rootPath,
    openTabs,
    activeTabId,
    closeTab,
    saveFile,
    saveAllFiles,
  } = useFileStore();
  
  const {
    toggleBottomPanel,
    setBottomPanelTab,
    bottomPanelVisible,
    toggleSidebar,
    sidebarExpanded,
  } = useUIStore();
  
  const { open: openSettings } = useSettingsStore();
  const { openFolder, createNewFile, createNewFolder } = useFileSystem();
  
  const closeMenu = useCallback(() => setActiveMenu(null), []);
  
  const handleSave = useCallback(async () => {
    const tab = openTabs.find(t => t.id === activeTabId);
    if (tab) {
      await saveFile(tab.path);
    }
  }, [openTabs, activeTabId, saveFile]);
  
  const handleNewFile = useCallback(async (fileName: string) => {
    if (rootPath) {
      const newPath = await createNewFile(rootPath, fileName);
      if (newPath) {
        // File created, directory will refresh automatically
      }
    } else {
      setShowNewFileDialog(true);
    }
  }, [rootPath, createNewFile]);
  
  const handleNewFolder = useCallback(async (folderName: string) => {
    if (rootPath) {
      await createNewFolder(rootPath, folderName);
    } else {
      setShowNewFolderDialog(true);
    }
  }, [rootPath, createNewFolder]);
  
  const handleOpenFolder = useCallback(async () => {
    await openFolder();
    closeMenu();
  }, [openFolder, closeMenu]);
  
  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
    closeMenu();
  }, [toggleSidebar, closeMenu]);
  
  const handleZoomIn = useCallback(() => {
    const current = useSettingsStore.getState().editor.fontSize;
    if (current < 32) {
      useSettingsStore.getState().updateEditor({ fontSize: current + 2 });
    }
  }, []);
  
  const handleZoomOut = useCallback(() => {
    const current = useSettingsStore.getState().editor.fontSize;
    if (current > 8) {
      useSettingsStore.getState().updateEditor({ fontSize: current - 2 });
    }
  }, []);
  
  const handleZoomReset = useCallback(() => {
    useSettingsStore.getState().updateEditor({ fontSize: 13 });
  }, []);
  
  const handleFullscreen = useCallback(async () => {
    try {
      const window = getCurrentWindow();
      const isFullscreen = await window.isFullscreen();
      await window.setFullscreen(!isFullscreen);
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
    closeMenu();
  }, [closeMenu]);
  
  const handleUndo = useCallback(() => {
    document.execCommand('undo', false);
    closeMenu();
  }, [closeMenu]);
  
  const handleRedo = useCallback(() => {
    document.execCommand('redo', false);
    closeMenu();
  }, [closeMenu]);
  
  const handleCut = useCallback(() => {
    document.execCommand('cut', false);
    closeMenu();
  }, [closeMenu]);
  
  const handleCopy = useCallback(() => {
    document.execCommand('copy', false);
    closeMenu();
  }, [closeMenu]);
  
  const handlePaste = useCallback(() => {
    document.execCommand('paste', false);
    closeMenu();
  }, [closeMenu]);
  
  const handleSelectAll = useCallback(() => {
    document.execCommand('selectAll', false);
    closeMenu();
  }, [closeMenu]);
  
  const menus: Record<string, MenuProps> = {
    file: {
      label: 'File',
      onClose: closeMenu,
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', onClick: () => setShowNewFileDialog(true) },
        { label: 'New Folder', shortcut: 'Ctrl+Shift+N', onClick: () => setShowNewFolderDialog(true) },
        { divider: true, label: '' },
        { label: 'Open Folder...', shortcut: 'Ctrl+O', onClick: handleOpenFolder },
        { divider: true, label: '' },
        { label: 'Save', shortcut: 'Ctrl+S', disabled: !activeTabId, onClick: handleSave },
        { label: 'Save All', shortcut: 'Ctrl+Alt+S', disabled: openTabs.length === 0, onClick: saveAllFiles },
        { divider: true, label: '' },
        { label: 'Exit', shortcut: 'Alt+F4', onClick: () => window.close() },
      ],
    },
    edit: {
      label: 'Edit',
      onClose: closeMenu,
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: handleUndo },
        { label: 'Redo', shortcut: 'Ctrl+Y', onClick: handleRedo },
        { divider: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: handleCut },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: handleCopy },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: handlePaste },
        { divider: true, label: '' },
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: handleSelectAll },
      ],
    },
    view: {
      label: 'View',
      onClose: closeMenu,
      items: [
        { label: sidebarExpanded ? 'Hide Sidebar' : 'Show Sidebar', shortcut: 'Ctrl+B', onClick: handleToggleSidebar },
        { label: 'Toggle Bottom Panel', shortcut: 'Ctrl+J', onClick: () => {
          if (!bottomPanelVisible) {
            setBottomPanelTab('terminal');
          }
          toggleBottomPanel();
          closeMenu();
        }},
        { divider: true, label: '' },
        { label: 'Zoom In', shortcut: 'Ctrl++', onClick: handleZoomIn },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: handleZoomOut },
        { label: 'Reset Zoom', shortcut: 'Ctrl+0', onClick: handleZoomReset },
        { divider: true, label: '' },
        { label: 'Full Screen', shortcut: 'F11', onClick: handleFullscreen },
      ],
    },
    help: {
      label: 'Help',
      onClose: closeMenu,
      items: [
        { label: 'Documentation', onClick: () => window.open('https://github.com/mandarwagh9/embedist', '_blank') },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', onClick: () => setShowShortcutsModal(true) },
        { divider: true, label: '' },
        { label: 'About Embedist', onClick: () => setShowAboutModal(true) },
      ],
    },
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        setShowNewFileDialog(true);
      }
      
      if (ctrl && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowNewFolderDialog(true);
      }
      
      if (ctrl && e.key === 's' && !e.altKey) {
        e.preventDefault();
        handleSave();
      }
      
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        handleOpenFolder();
      }
      
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          closeTab(activeTabId);
        }
      }
      
      if (ctrl && e.key === 'j') {
        e.preventDefault();
        if (!bottomPanelVisible) {
          setBottomPanelTab('terminal');
        }
        toggleBottomPanel();
      }
      
      if (ctrl && e.key === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
      
      if (ctrl && e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      }
      
      if (ctrl && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      
      if (ctrl && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
      
      if (e.key === 'F11') {
        e.preventDefault();
        handleFullscreen();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, bottomPanelVisible, handleSave, handleOpenFolder, handleToggleSidebar, handleZoomIn, handleZoomOut, handleZoomReset]);
  
  return (
    <>
      <div className="menubar">
        <div className="menubar-left">
          {Object.entries(menus).map(([key, menu]) => (
            <div key={key} className="menu-container">
              <button
                className={`menubar-item ${activeMenu === key ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === key ? null : key)}
                onMouseEnter={() => activeMenu && setActiveMenu(key)}
              >
                {menu.label}
              </button>
              {activeMenu === key && (
                <Menu {...menu} />
              )}
            </div>
          ))}
        </div>
        
        <div className="menubar-center">
          {rootPath && (
            <span className="menubar-project">
              {rootPath.replace(/\\/g, '/').split('/').pop()}
            </span>
          )}
        </div>
        
        <div className="menubar-right">
          <button className="menubar-item settings-btn" onClick={openSettings}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <Dialog
        open={showNewFileDialog}
        title="New File"
        placeholder="filename.cpp"
        submitLabel="Create"
        onSubmit={handleNewFile}
        onClose={() => setShowNewFileDialog(false)}
      />
      
      <Dialog
        open={showNewFolderDialog}
        title="New Folder"
        placeholder="folder-name"
        submitLabel="Create"
        onSubmit={handleNewFolder}
        onClose={() => setShowNewFolderDialog(false)}
      />
      
      {showAboutModal && (
        <div className="dialog-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="dialog about-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">About Embedist</h3>
              <button className="dialog-close" onClick={() => setShowAboutModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="dialog-content">
              <div className="about-logo">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
              </div>
              <h2 className="about-title">Embedist</h2>
              <p className="about-version">Version 0.4.0</p>
              <p className="about-description">
                AI-Native Embedded Development Environment for Windows
              </p>
              <p className="about-tech">
                Built with Tauri + React + TypeScript
              </p>
              <div className="about-links">
                <a href="https://github.com/mandarwagh9/embedist" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                <span className="about-separator">|</span>
                <a href="https://github.com/mandarwagh9/embedist/releases" target="_blank" rel="noopener noreferrer">
                  Releases
                </a>
              </div>
              <p className="about-copyright">
                Made with ❤️ for embedded developers
              </p>
            </div>
          </div>
        </div>
      )}
      
      {showShortcutsModal && (
        <div className="dialog-overlay" onClick={() => setShowShortcutsModal(false)}>
          <div className="dialog shortcuts-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">Keyboard Shortcuts</h3>
              <button className="dialog-close" onClick={() => setShowShortcutsModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="dialog-content shortcuts-content">
              <div className="shortcuts-section">
                <h4>File</h4>
                <div className="shortcut-row"><kbd>Ctrl+N</kbd><span>New File</span></div>
                <div className="shortcut-row"><kbd>Ctrl+Shift+N</kbd><span>New Folder</span></div>
                <div className="shortcut-row"><kbd>Ctrl+O</kbd><span>Open Folder</span></div>
                <div className="shortcut-row"><kbd>Ctrl+S</kbd><span>Save</span></div>
                <div className="shortcut-row"><kbd>Ctrl+Alt+S</kbd><span>Save All</span></div>
                <div className="shortcut-row"><kbd>Ctrl+W</kbd><span>Close Tab</span></div>
              </div>
              <div className="shortcuts-section">
                <h4>AI Modes</h4>
                <div className="shortcut-row"><kbd>Ctrl+1</kbd><span>Chat Mode</span></div>
                <div className="shortcut-row"><kbd>Ctrl+2</kbd><span>Plan Mode</span></div>
                <div className="shortcut-row"><kbd>Ctrl+3</kbd><span>Debug Mode</span></div>
              </div>
              <div className="shortcuts-section">
                <h4>View</h4>
                <div className="shortcut-row"><kbd>Ctrl+B</kbd><span>Toggle Sidebar</span></div>
                <div className="shortcut-row"><kbd>Ctrl+J</kbd><span>Toggle Bottom Panel</span></div>
                <div className="shortcut-row"><kbd>Ctrl++</kbd><span>Zoom In</span></div>
                <div className="shortcut-row"><kbd>Ctrl+-</kbd><span>Zoom Out</span></div>
                <div className="shortcut-row"><kbd>Ctrl+0</kbd><span>Reset Zoom</span></div>
                <div className="shortcut-row"><kbd>F11</kbd><span>Full Screen</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
