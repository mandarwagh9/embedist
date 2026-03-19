import { useState, useEffect, useCallback } from 'react';
import { useFileStore, FileNode } from '../../stores/fileStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import './FileExplorer.css';

const fileIcons: Record<string, JSX.Element> = {
  folder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
    </svg>
  ),
  folderOpen: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
      <path d="M22 19V12H12V19"/>
    </svg>
  ),
  ino: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <path d="M9 9L11 12L9 15M13 15H15"/>
    </svg>
  ),
  cpp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/>
      <path d="M14 2V8H20"/>
      <path d="M8 13H16M8 17H12"/>
    </svg>
  ),
  h: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/>
      <path d="M14 2V8H20"/>
      <path d="M9 13H15M9 17H13"/>
    </svg>
  ),
  json: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/>
      <path d="M8 12C8 10.8954 8.89543 10 10 10H11C12.1046 10 13 10.8954 13 12V13C13 14.1046 12.1046 15 11 15H10C8.89543 15 8 14.1046 8 13V12Z"/>
      <path d="M16 12C16 10.8954 15.1046 10 14 10H13C11.8954 10 11 10.8954 11 12V13C11 14.1046 11.8954 15 13 15H14C15.1046 15 16 14.1046 16 13V12Z"/>
    </svg>
  ),
  md: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/>
      <path d="M14 2V8H20"/>
      <path d="M9 12L11 14L9 16M15 16H13M13 12H15"/>
    </svg>
  ),
  default: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/>
      <path d="M14 2V8H20"/>
    </svg>
  ),
};

const getFileIcon = (filename: string, isDir: boolean, isExpanded?: boolean): JSX.Element => {
  if (isDir) {
    return isExpanded ? fileIcons.folderOpen : fileIcons.folder;
  }
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return fileIcons[ext] || fileIcons.default;
};

interface TreeItemProps {
  node: FileNode;
  level: number;
  onToggle: (path: string) => void;
  onFileClick: (path: string) => void;
  loadChildren: (node: FileNode) => Promise<FileNode[]>;
  setNodeChildren: (path: string, children: FileNode[]) => void;
  rootPath: string | null;
}

function TreeItem({ node, level, onToggle, onFileClick, loadChildren, setNodeChildren, rootPath }: TreeItemProps) {
  const [children, setChildren] = useState<FileNode[]>(node.children || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (node.expanded && node.isDir && children.length === 0 && !isLoading) {
      loadNodeChildren();
    }
  }, [node.expanded]);

  const loadNodeChildren = async () => {
    if (!node.isDir) return;
    setIsLoading(true);
    try {
      const loaded = await loadChildren(node);
      setChildren(loaded);
      setNodeChildren(node.path, loaded);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (node.isDir) {
      onToggle(node.path);
      if (!node.expanded && children.length === 0) {
        loadNodeChildren();
      }
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <div className="tree-item">
      <button
        className={`tree-item-row ${node.isDir ? 'folder' : 'file'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.isDir && (
          <span className={`tree-chevron ${node.expanded ? 'expanded' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </span>
        )}
        <span className="tree-icon">
          {getFileIcon(node.name, node.isDir, node.expanded)}
        </span>
        <span className="tree-name">{node.name}</span>
        {isLoading && <span className="tree-loading">...</span>}
      </button>
      {node.expanded && children.length > 0 && (
        <div className="tree-children">
          {children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              onFileClick={onFileClick}
              loadChildren={loadChildren}
              setNodeChildren={setNodeChildren}
              rootPath={rootPath}
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
    setNodeChildren,
    toggleExpanded,
  } = useFileStore();
  const { 
    openFolder,
    openFileInEditor,
    loadChildren,
  } = useFileSystem();
  
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileClick = useCallback((path: string) => {
    openFileInEditor(path);
  }, [openFileInEditor]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  if (!rootPath) {
    return (
      <div 
        className="file-explorer empty"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`file-explorer-dropzone ${isDragOver ? 'drag-over' : ''}`}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
          </svg>
          <p className="dropzone-title">No Folder Open</p>
          <p className="dropzone-text">Open a folder to start editing files</p>
          <button className="dropzone-btn" onClick={openFolder}>
            Open Folder
          </button>
          <p className="dropzone-shortcut">Ctrl+O</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <span className="file-explorer-title">Explorer</span>
        <button className="file-explorer-action" onClick={openFolder} title="Open Folder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
          </svg>
        </button>
      </div>
      <div className="file-explorer-content">
        <div className="file-explorer-project">
          <div className="file-explorer-project-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
            </svg>
            <span>{projectName || 'Project'}</span>
          </div>
          <div className="file-explorer-tree">
            {files.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                level={0}
                onToggle={toggleExpanded}
                onFileClick={handleFileClick}
                loadChildren={loadChildren}
                setNodeChildren={setNodeChildren}
                rootPath={rootPath}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
