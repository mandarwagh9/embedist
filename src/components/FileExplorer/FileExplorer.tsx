import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFileStore, FileNode } from '../../stores/fileStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { Breadcrumbs } from './Breadcrumbs';
import { RecentFiles } from './RecentFiles';
import { CommandPalette, type PaletteCommand } from './CommandPalette';
import './FileExplorer.css';
import './ContextMenu.css';
import './Breadcrumbs.css';
import './RecentFiles.css';
import './CommandPalette.css';

const fileIcons: Record<string, JSX.Element> = {
  folder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
    </svg>
  ),
  folderOpen: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
      <path d="M22 19V12H12V19" />
    </svg>
  ),
  default: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
    </svg>
  ),
};

const extIcons: Record<string, JSX.Element> = {
  ino: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9L11 12L9 15M13 15H15" />
    </svg>
  ),
  cpp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
      <path d="M8 13H16M8 17H12" />
    </svg>
  ),
  h: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
      <path d="M9 13H15M9 17H13" />
    </svg>
  ),
  json: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
      <path d="M8 12C8 10.8954 8.89543 10 10 10H11C12.1046 10 13 10.8954 13 12V13C13 14.1046 12.1046 15 11 15H10C8.89543 15 8 14.1046 8 13V12Z" />
      <path d="M16 12C16 10.8954 15.1046 10 14 10H13C11.8954 10 11 10.8954 11 12V13C11 14.1046 11.8954 15 13 15H14C15.1046 15 16 14.1046 16 13V12Z" />
    </svg>
  ),
  md: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
      <path d="M14 2V8H20" />
      <path d="M9 12L11 14L9 16M15 16H13M13 12H15" />
    </svg>
  ),
};

const getFileIcon = (name: string, isDir: boolean, isExpanded?: boolean): JSX.Element => {
  if (isDir) return isExpanded ? fileIcons.folderOpen : fileIcons.folder;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return extIcons[ext] || fileIcons.default;
};

function TreeItem({
  node,
  level,
  selectedPaths,
  renamingPath,
  hoveredPath,
  onToggle,
  onFileClick,
  onContextMenu,
  onSelect,
  onRename,
  onHover,
  onCancelRename,
  searchQuery,
  openTabs,
}: {
  node: FileNode;
  level: number;
  selectedPaths: string[];
  renamingPath: string | null;
  hoveredPath: string | null;
  onToggle: (path: string) => void;
  onFileClick: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, node: FileNode) => void;
  onSelect: (path: string, multi: boolean) => void;
  onRename: (path: string, newName: string) => void;
  onHover: (path: string | null) => void;
  onCancelRename: () => void;
  searchQuery: string;
  openTabs: { path: string; modified: boolean }[];
}) {
  const [renameValue, setRenameValue] = useState(node.name);
  const [isLoading] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const isSelected = selectedPaths.includes(node.path);
  const isHovered = hoveredPath === node.path;
  const isRenaming = renamingPath === node.path;
  const children = node.children || [];

  const modifiedTab = openTabs.find(t => t.path === node.path);
  const isModified = modifiedTab?.modified ?? false;

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (node.isDir) {
      onToggle(node.path);
    } else {
      onFileClick(node.path);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      onSelect(node.path, true);
    } else if (e.shiftKey) {
      onSelect(node.path, false);
    } else {
      onSelect(node.path, false);
    }
  };

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== node.name) {
      onRename(node.path, trimmed);
    } else {
      onCancelRename();
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelRename();
    }
  };

  const handleDoubleClick = () => {
    if (!node.isDir) return;
    if (isRenaming) return;
  };

  return (
    <div className="tree-item">
      <div
        className={`tree-item-row ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => { handleSelect(e); handleClick(e); }}
        onContextMenu={(e) => onContextMenu(e, node.path, node)}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => onHover(node.path)}
        onMouseLeave={() => onHover(null)}
      >
        {node.isDir && (
          <span className={`tree-chevron ${node.expanded ? 'expanded' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </span>
        )}

        <span className="tree-icon">
          {getFileIcon(node.name, node.isDir, node.expanded)}
        </span>

        {isRenaming ? (
          <input
            ref={renameRef}
            className="tree-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="tree-name">{node.name}</span>
            {isModified && <span className="tree-modified-dot" title="Modified" />}
          </>
        )}

        {isHovered && !isRenaming && (
          <div className="tree-row-actions">
            <button
              className="tree-action-btn"
              title="Rename (F2)"
              onClick={(e) => { e.stopPropagation(); onSelect(node.path, false); onRename(node.path, node.name); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
            <button
              className="tree-action-btn danger"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onSelect(node.path, false); onContextMenu(e, node.path, node); }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        )}

        {isLoading && <span className="tree-loading">...</span>}
      </div>

      {node.isDir && node.expanded && children.length > 0 && (
        <div className="tree-children">
          {children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              selectedPaths={selectedPaths}
              renamingPath={renamingPath}
              hoveredPath={hoveredPath}
              onToggle={onToggle}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              onSelect={onSelect}
              onRename={onRename}
              onHover={onHover}
              onCancelRename={onCancelRename}
              searchQuery={searchQuery}
              openTabs={openTabs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const {
    rootPath,
    projectName,
    files,
    openTabs,
    selectedPaths,
    renamingPath,
    searchQuery,
    contextMenu,
    openContextMenu,
    closeContextMenu,
    selectPath,
    clearSelection,
    selectRange,
    startRenaming,
    stopRenaming,
    hoveredPath,
    setHoveredPath,
    setSearchQuery,
    getNodeByPath,
  } = useFileStore();

  const {
    openFolder,
    openFileInEditor,
    loadChildren,
    toggleExpanded,
    createNewFile,
    createNewFolder,
    deleteItem,
    renameItem,
    copyPath,
    revealInExplorer,
    refreshRoot,
  } = useFileSystem();

  const [isDragOver, setIsDragOver] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [inlineNewItem, setInlineNewItem] = useState<{ path: string; isDir: boolean } | null>(null);
  const [inlineNewName, setInlineNewName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();

    const filterNode = (node: FileNode): FileNode | null => {
      const nameMatch = node.name.toLowerCase().includes(q);
      let children: FileNode[] | undefined;
      if (node.children) {
        children = node.children.map(filterNode).filter((c): c is FileNode => c !== null);
      }
      if (nameMatch || (children && children.length > 0)) {
        return { ...node, children: children || [], expanded: true };
      }
      return null;
    };

    return files.map(filterNode).filter((n): n is FileNode => n !== null);
  }, [files, searchQuery]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'F2' && selectedPaths.length === 1) {
        const node = getNodeByPath(selectedPaths[0]);
        if (node) {
          e.preventDefault();
          startRenaming(selectedPaths[0]);
        }
      }
      if (e.key === 'Delete' && selectedPaths.length > 0) {
        const node = getNodeByPath(selectedPaths[0]);
        if (node && !node.isDir) {
          e.preventDefault();
          deleteItem(selectedPaths[0]);
        }
      }
      if (e.key === 'Escape') {
        if (renamingPath) stopRenaming();
        if (searchQuery) { setSearchQuery(''); setShowSearch(false); }
        clearSelection();
        closeContextMenu();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [selectedPaths, renamingPath, searchQuery, getNodeByPath, startRenaming, stopRenaming, setSearchQuery, clearSelection, closeContextMenu, deleteItem]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) closeContextMenu();
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible, closeContextMenu]);

  const handleToggle = useCallback((path: string) => {
    const node = getNodeByPath(path);
    if (node?.isDir && node.children && node.children.length === 0) {
      loadChildren(node).then(children => {
        useFileStore.getState().setNodeChildren(path, children);
        useFileStore.getState().toggleExpanded(path);
      });
    } else {
      toggleExpanded(path);
    }
  }, [getNodeByPath, loadChildren, toggleExpanded]);

  const handleSelect = useCallback((path: string, multi: boolean) => {
    if (multi && selectedPaths.length > 0) {
      selectRange(path);
    } else {
      selectPath(path, multi);
    }
  }, [selectedPaths, selectPath, selectRange]);

  const handleRename = useCallback(async (path: string, newName: string) => {
    await renameItem(path, newName);
    stopRenaming();
  }, [renameItem, stopRenaming]);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedPaths.includes(path)) {
      selectPath(path, false);
    }
    openContextMenu(e.clientX, e.clientY, path, node);
  }, [selectedPaths, selectPath, openContextMenu]);

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu.targetNode) return [];

    const target = contextMenu.targetNode!;
    const isMulti = selectedPaths.length > 1;

    const items: ContextMenuItem[] = [];

    if (target.isDir) {
      items.push({
        id: 'new-file',
        label: 'New File',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/><path d="M14 2V8H20"/></svg>,
        onClick: () => { setInlineNewItem({ path: contextMenu.targetPath!, isDir: false }); setInlineNewName(''); },
      });
      items.push({
        id: 'new-folder',
        label: 'New Folder',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/></svg>,
        onClick: () => { setInlineNewItem({ path: contextMenu.targetPath!, isDir: true }); setInlineNewName(''); },
      });
      items.push({ id: 'sep1', label: '', separator: true, onClick: () => {} });
    }

    if (!isMulti) {
      items.push({
        id: 'rename',
        label: 'Rename',
        shortcut: 'F2',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
        onClick: () => startRenaming(contextMenu.targetPath!),
      });
    }

    if (!isMulti) {
      items.push({
        id: 'copy-path',
        label: 'Copy Path',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
        onClick: () => copyPath(contextMenu.targetPath!),
      });
    }

    items.push({
      id: 'reveal',
      label: isMulti ? 'Reveal in Explorer' : 'Reveal in Explorer',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
      onClick: () => revealInExplorer(contextMenu.targetPath!),
    });

    if (isMulti) {
      items.push({
        id: 'delete-multi',
        label: `Delete (${selectedPaths.length} files)`,
        danger: true,
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
        onClick: async () => {
          for (const p of selectedPaths) {
            await deleteItem(p);
          }
          clearSelection();
        },
      });
    } else {
      items.push({ id: 'sep2', label: '', separator: true, onClick: () => {} });
      items.push({
        id: 'delete',
        label: target.isDir ? 'Delete Folder' : 'Delete File',
        danger: true,
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
        onClick: async () => {
          await deleteItem(contextMenu.targetPath!);
          clearSelection();
        },
      });
    }

    return items;
  }, [contextMenu, selectedPaths, startRenaming, copyPath, revealInExplorer, deleteItem, clearSelection]);

  const handleInlineNewSubmit = async () => {
    if (!inlineNewItem || !inlineNewName.trim()) {
      setInlineNewItem(null);
      setInlineNewName('');
      return;
    }
    if (inlineNewItem.isDir) {
      await createNewFolder(inlineNewItem.path, inlineNewName.trim());
    } else {
      await createNewFile(inlineNewItem.path, inlineNewName.trim());
    }
    setInlineNewItem(null);
    setInlineNewName('');
  };

  const handleInlineNewKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineNewSubmit();
    } else if (e.key === 'Escape') {
      setInlineNewItem(null);
      setInlineNewName('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const paletteCommands = useMemo((): PaletteCommand[] => {
    const cmds: PaletteCommand[] = [
      { id: 'new-file', label: 'New File', category: 'File', shortcut: 'Ctrl+N', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/><path d="M14 2V8H20"/></svg>, onSelect: () => { if (rootPath) { setInlineNewItem({ path: rootPath, isDir: false }); setInlineNewName(''); } } },
      { id: 'new-folder', label: 'New Folder', category: 'File', shortcut: 'Ctrl+Shift+N', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/></svg>, onSelect: () => { if (rootPath) { setInlineNewItem({ path: rootPath, isDir: true }); setInlineNewName(''); } } },
      { id: 'collapse-all', label: 'Collapse All Folders', category: 'View', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>, onSelect: () => useFileStore.getState().collapseAll() },
      { id: 'refresh', label: 'Refresh Explorer', category: 'View', shortcut: 'Ctrl+R', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>, onSelect: () => refreshRoot() },
      { id: 'clear-selection', label: 'Clear Selection', category: 'Edit', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>, onSelect: () => clearSelection() },
      { id: 'search', label: 'Search Files', category: 'Navigate', shortcut: 'Ctrl+F', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>, onSelect: () => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 10); } },
    ];
    if (selectedPaths.length === 1) {
      const node = getNodeByPath(selectedPaths[0]);
      if (node) {
        cmds.push({ id: 'reveal', label: 'Reveal in Explorer', category: 'File', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>, onSelect: () => revealInExplorer(selectedPaths[0]) });
        cmds.push({ id: 'rename', label: 'Rename File', category: 'Edit', shortcut: 'F2', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, onSelect: () => startRenaming(selectedPaths[0]) });
        cmds.push({ id: 'copy-path', label: 'Copy Path', category: 'Edit', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>, onSelect: () => copyPath(selectedPaths[0]) });
      }
    }
    return cmds;
  }, [rootPath, selectedPaths, getNodeByPath, clearSelection, refreshRoot, revealInExplorer, copyPath, startRenaming]);

  const displayFiles = searchQuery.trim() ? filteredFiles : files;
  const hasInlineNew = inlineNewItem !== null;

  if (!rootPath) {
    return (
      <div className={`file-explorer empty ${isDragOver ? 'drag-over' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <div className="file-explorer-dropzone">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
          </svg>
          <p className="dropzone-title">No Folder Open</p>
          <p className="dropzone-text">Open a folder to start editing files</p>
          <button className="dropzone-btn" onClick={openFolder}>Open Folder</button>
          <p className="dropzone-shortcut">Ctrl+O</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-explorer" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div className="file-explorer-header">
        <span className="file-explorer-title">Explorer</span>
        <div className="file-explorer-header-actions">
          <button className="file-explorer-action" onClick={() => { setShowSearch(s => !s); if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 10); }} title="Search (Ctrl+F)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <button className="file-explorer-action" onClick={() => useFileStore.getState().collapseAll()} title="Collapse All">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button className="file-explorer-action" onClick={refreshRoot} title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
          <button className="file-explorer-action" onClick={() => setShowCommandPalette(true)} title="Command Palette (Ctrl+Shift+E)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </button>
          <button className="file-explorer-action" onClick={openFolder} title="Open Folder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
            </svg>
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="file-explorer-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchInputRef}
            className="file-explorer-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setShowSearch(false); } }}
          />
          {searchQuery && (
            <button className="file-explorer-search-clear" onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="file-explorer-breadcrumb">
        <Breadcrumbs
          path={rootPath}
          rootName={projectName || 'Root'}
          onNavigate={() => {}}
          onNodeClick={() => {}}
        />
      </div>

      <div className="file-explorer-content" ref={treeRef}>
        <RecentFiles onFileSelect={openFileInEditor} onClose={() => {}} />

        <div className="file-explorer-tree">
          {displayFiles.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              level={0}
              selectedPaths={selectedPaths}
              renamingPath={renamingPath}
              hoveredPath={hoveredPath}
              onToggle={handleToggle}
              onFileClick={openFileInEditor}
              onContextMenu={handleContextMenu}
              onSelect={handleSelect}
              onRename={handleRename}
              onHover={setHoveredPath}
              onCancelRename={stopRenaming}
              searchQuery={searchQuery}
              openTabs={openTabs}
            />
          ))}

          {hasInlineNew && (
            <div className="tree-item">
              <div className="tree-item-row" style={{ paddingLeft: `20px` }}>
                <span className="tree-icon">
                  {inlineNewItem?.isDir ? fileIcons.folder : fileIcons.default}
                </span>
                <input
                  className="tree-rename-input"
                  value={inlineNewName}
                  onChange={e => setInlineNewName(e.target.value)}
                  onBlur={handleInlineNewSubmit}
                  onKeyDown={handleInlineNewKey}
                  placeholder={inlineNewItem?.isDir ? 'Folder name...' : 'File name...'}
                  autoFocus
                />
              </div>
            </div>
          )}

          {searchQuery.trim() && filteredFiles.length === 0 && (
            <div className="file-explorer-empty-search">
              <p>No files match "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {contextMenu.visible && (
        <ContextMenu
          items={contextMenuItems}
          x={contextMenu.x}
          y={contextMenu.y}
          targetPath={contextMenu.targetPath}
          targetNode={contextMenu.targetNode}
          onClose={closeContextMenu}
        />
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        commands={paletteCommands}
        onClose={() => setShowCommandPalette(false)}
        placeholder="Search files, commands..."
      />
    </div>
  );
}
