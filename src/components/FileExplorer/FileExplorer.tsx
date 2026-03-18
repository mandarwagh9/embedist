import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import './FileExplorer.css';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  expanded?: boolean;
}

const defaultFiles: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'folder',
    expanded: true,
    children: [
      { name: 'main.cpp', path: 'src/main.cpp', type: 'file' },
      { name: 'config.h', path: 'src/config.h', type: 'file' },
    ],
  },
  { name: 'lib', path: 'lib', type: 'folder', children: [] },
  { name: 'include', path: 'include', type: 'folder', children: [] },
  { name: 'test', path: 'test', type: 'folder', children: [] },
  { name: 'platformio.ini', path: 'platformio.ini', type: 'file' },
  { name: 'README.md', path: 'README.md', type: 'file' },
];

const fileIcons: Record<string, JSX.Element> = {
  folder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
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
  default: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"/>
      <path d="M14 2V8H20"/>
    </svg>
  ),
};

const getFileIcon = (filename: string, type: 'file' | 'folder') => {
  if (type === 'folder') return fileIcons.folder;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return fileIcons[ext] || fileIcons.default;
};

interface TreeItemProps {
  node: FileNode;
  level: number;
  onFileClick: (path: string, name: string) => void;
}

function TreeItem({ node, level, onFileClick }: TreeItemProps) {
  const [expanded, setExpanded] = useState(node.expanded || false);
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (node.type === 'folder') {
      setExpanded(!expanded);
    } else {
      onFileClick(node.path, node.name);
    }
  };

  return (
    <div className="tree-item">
      <button
        className="tree-item-row"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
          <span className={`tree-chevron ${expanded ? 'expanded' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
          </span>
        )}
        <span className="tree-icon">{getFileIcon(node.name, node.type)}</span>
        <span className="tree-name">{node.name}</span>
      </button>
      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children!.map((child, idx) => (
            <TreeItem
              key={`${child.path}-${idx}`}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const { openTab } = useUIStore();

  const handleFileClick = (path: string, name: string) => {
    openTab({
      id: path,
      title: name,
      path: path,
      modified: false,
    });
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <span className="file-explorer-title">Explorer</span>
      </div>
      <div className="file-explorer-content">
        <div className="file-explorer-project">
          <div className="file-explorer-project-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z"/>
            </svg>
            <span>my-esp32-project</span>
          </div>
          <div className="file-explorer-tree">
            {defaultFiles.map((node, idx) => (
              <TreeItem
                key={`${node.path}-${idx}`}
                node={node}
                level={0}
                onFileClick={handleFileClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
