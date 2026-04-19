import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useFileStore } from '../../stores/fileStore';
import { useAIStore } from '../../stores/aiStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useBuild } from '../../hooks/useBuild';
import { useAI } from '../../hooks/useAI';
import './CommandPalette.css';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: string;
  action: () => void;
}

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  let queryIdx = 0;
  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      queryIdx++;
    }
  }
  return queryIdx === lowerQuery.length;
}

export function CommandPalette() {
  const { commandPaletteVisible, toggleCommandPalette, toggleSidebar, setSidebarSection, setBottomPanelTab, toggleBottomPanel } = useUIStore();
  const { open: openSettings } = useSettingsStore();
  const { activeTabId, openTabs, saveFile, saveAllFiles } = useFileStore();
  const { clearMessages } = useAIStore();
  const { switchMode } = useAI();
  const { openFolder } = useFileSystem();
  const { build, upload, clearOutput } = useBuild();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commands: Command[] = useMemo(() => [
    {
      id: 'open-folder',
      label: 'Open Folder',
      shortcut: 'Ctrl+O',
      category: 'File',
      action: () => {
        openFolder();
        toggleCommandPalette();
      },
    },
    {
      id: 'save-file',
      label: 'Save File',
      shortcut: 'Ctrl+S',
      category: 'File',
      action: () => {
        if (activeTabId) {
          const tab = openTabs.find(t => t.id === activeTabId);
          if (tab) saveFile(tab.path);
        }
        toggleCommandPalette();
      },
    },
    {
      id: 'save-all',
      label: 'Save All Files',
      shortcut: 'Ctrl+Alt+S',
      category: 'File',
      action: () => {
        saveAllFiles();
        toggleCommandPalette();
      },
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle Sidebar',
      shortcut: 'Ctrl+B',
      category: 'View',
      action: () => {
        toggleSidebar();
        toggleCommandPalette();
      },
    },
    {
      id: 'toggle-bottom-panel',
      label: 'Toggle Bottom Panel',
      shortcut: 'Ctrl+J',
      category: 'View',
      action: () => {
        if (!useUIStore.getState().bottomPanelVisible) {
          setBottomPanelTab('terminal');
        }
        toggleBottomPanel();
        toggleCommandPalette();
      },
    },
    {
      id: 'ai-mode-chat',
      label: 'Switch AI Mode: Chat',
      shortcut: 'Ctrl+1',
      category: 'AI',
      action: () => {
        switchMode('chat');
        setSidebarSection('ai');
        toggleCommandPalette();
      },
    },
    {
      id: 'ai-mode-plan',
      label: 'Switch AI Mode: Plan',
      shortcut: 'Ctrl+2',
      category: 'AI',
      action: () => {
        switchMode('plan');
        setSidebarSection('ai');
        toggleCommandPalette();
      },
    },
    {
      id: 'ai-mode-debug',
      label: 'Switch AI Mode: Debug',
      shortcut: 'Ctrl+3',
      category: 'AI',
      action: () => {
        switchMode('debug');
        setSidebarSection('ai');
        toggleCommandPalette();
      },
    },
    {
      id: 'ai-mode-agent',
      label: 'Switch AI Mode: Agent',
      shortcut: 'Ctrl+4',
      category: 'AI',
      action: () => {
        switchMode('agent');
        setSidebarSection('ai');
        toggleCommandPalette();
      },
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      shortcut: 'Ctrl+,',
      category: 'Settings',
      action: () => {
        openSettings();
        toggleCommandPalette();
      },
    },
    {
      id: 'build-project',
      label: 'Build Project',
      shortcut: 'F5',
      category: 'Build',
      action: async () => {
        await build();
        toggleCommandPalette();
      },
    },
    {
      id: 'upload',
      label: 'Upload Firmware',
      category: 'Build',
      action: async () => {
        await upload();
        toggleCommandPalette();
      },
    },
    {
      id: 'clear-build-output',
      label: 'Clear Build Output',
      category: 'Build',
      action: () => {
        clearOutput();
        toggleCommandPalette();
      },
    },
    {
      id: 'clear-chat',
      label: 'Clear Chat',
      category: 'AI',
      action: () => {
        clearMessages();
        toggleCommandPalette();
      },
    },
    {
      id: 'focus-file-explorer',
      label: 'Focus File Explorer',
      shortcut: 'Ctrl+Shift+E',
      category: 'View',
      action: () => {
        setSidebarSection('files');
        toggleCommandPalette();
      },
    },
    {
      id: 'focus-ai-assistant',
      label: 'Focus AI Assistant',
      shortcut: 'Ctrl+Shift+X',
      category: 'View',
      action: () => {
        setSidebarSection('ai');
        toggleCommandPalette();
      },
    },
    {
      id: 'toggle-serial-monitor',
      label: 'Toggle Serial Monitor',
      shortcut: 'Ctrl+Shift+L',
      category: 'View',
      action: () => {
        const state = useUIStore.getState();
        if (state.sidebarSection === 'serial' && state.sidebarExpanded) {
          toggleSidebar();
        } else {
          setSidebarSection('serial');
          useUIStore.getState().setSidebarExpanded(true);
        }
        toggleCommandPalette();
      },
    },
  ], [activeTabId, openTabs, toggleCommandPalette, toggleSidebar, setSidebarSection, setBottomPanelTab, toggleBottomPanel, openSettings, saveFile, saveAllFiles, clearMessages, switchMode, openFolder, build, upload, clearOutput]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter(cmd => fuzzyMatch(query, cmd.label));
  }, [query, commands]);

  useEffect(() => {
    if (commandPaletteVisible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [commandPaletteVisible]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const activeItem = listRef.current.querySelector('.command-item.selected');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      toggleCommandPalette();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
      return;
    }
  }, [toggleCommandPalette, filteredCommands, selectedIndex]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  if (!commandPaletteVisible) return null;

  return (
    <div className="command-palette-overlay" onClick={toggleCommandPalette}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <svg className="command-palette-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" fill="currentColor" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        {filteredCommands.length > 0 ? (
          <ul className="command-palette-list" ref={listRef}>
            {filteredCommands.map((cmd, idx) => (
              <li
                key={cmd.id}
                className={`command-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => cmd.action()}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="command-label">{cmd.label}</span>
                {cmd.shortcut && (
                  <span className="command-shortcut">{cmd.shortcut}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="command-palette-empty">No commands found</div>
        )}
      </div>
    </div>
  );
}
