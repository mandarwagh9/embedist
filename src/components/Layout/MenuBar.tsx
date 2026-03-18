import { useState, useRef, useEffect, useCallback } from 'react';
import { useFileStore } from '../../stores/fileStore';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import './MenuBar.css';

interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
  submenu?: MenuItem[];
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
  } = useUIStore();
  
  const { open: openSettings } = useSettingsStore();
  
  const closeMenu = useCallback(() => setActiveMenu(null), []);
  
  const handleSave = useCallback(async () => {
    const tab = openTabs.find(t => t.id === activeTabId);
    if (tab) {
      await saveFile(tab.path);
    }
  }, [openTabs, activeTabId, saveFile]);
  
  const handleNewFile = useCallback(() => {
    closeMenu();
  }, [closeMenu]);
  
  const handleNewFolder = useCallback(() => {
    closeMenu();
  }, [closeMenu]);
  
  const menus: Record<string, MenuProps> = {
    file: {
      label: 'File',
      onClose: closeMenu,
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', onClick: handleNewFile },
        { label: 'New Folder', shortcut: 'Ctrl+Shift+N', onClick: handleNewFolder },
        { divider: true, label: '' },
        { label: 'Open Folder...', shortcut: 'Ctrl+O', onClick: () => closeMenu() },
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
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        { divider: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
        { divider: true, label: '' },
        { label: 'Select All', shortcut: 'Ctrl+A' },
      ],
    },
    view: {
      label: 'View',
      onClose: closeMenu,
      items: [
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', onClick: () => closeMenu() },
        { label: 'Toggle Bottom Panel', shortcut: 'Ctrl+J', onClick: () => {
          if (!bottomPanelVisible) {
            setBottomPanelTab('terminal');
          }
          toggleBottomPanel();
          closeMenu();
        }},
        { divider: true, label: '' },
        { label: 'Zoom In', shortcut: 'Ctrl++' },
        { label: 'Zoom Out', shortcut: 'Ctrl+-' },
        { label: 'Reset Zoom', shortcut: 'Ctrl+0' },
        { divider: true, label: '' },
        { label: 'Full Screen', shortcut: 'F11' },
      ],
    },
    help: {
      label: 'Help',
      onClose: closeMenu,
      items: [
        { label: 'Documentation', onClick: () => window.open('https://github.com/mandarwagh9/embedist', '_blank') },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', onClick: closeMenu },
        { divider: true, label: '' },
        { label: 'About Embedist', onClick: () => {
          closeMenu();
        }},
      ],
    },
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      
      if (ctrl && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        handleNewFile();
      }
      
      if (ctrl && e.key === 's' && !e.altKey) {
        e.preventDefault();
        handleSave();
      }
      
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        closeMenu();
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
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, bottomPanelVisible, handleNewFile, handleSave]);
  
  return (
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
  );
}
