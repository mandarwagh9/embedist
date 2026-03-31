import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore } from '../../../stores/aiStore';
import { useFileStore } from '../../../stores/fileStore';
import './PlanExplorerPanel.css';

interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: TreeNode[];
}

export function PlanExplorerPanel() {
  const { selectedFiles, toggleSelectedFile, clearSelectedFiles, setPlanExplorerMode, planExplorerMode } = useAIStore();
  const rootPath: string | null = useFileStore((s) => s.rootPath);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (rootPath && planExplorerMode === 'exploring') {
      loadTree();
    }
  }, [rootPath, planExplorerMode]);

  const loadTree = async () => {
    if (!rootPath) return;
    setLoading(true);
    try {
      const result = await invoke<TreeNode>('get_directory_tree', { path: rootPath, depth: 2 });
      setTree(result);
    } catch (err) {
      console.error('Failed to load tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDir = async (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);

    if (!expandedDirs.has(path)) {
      try {
        const children = await invoke<TreeNode[]>('list_directory', { path });
        setTree((prev) => updateTreeWithChildren(prev, path, children));
      } catch (err) {
        console.error('Failed to load directory:', err);
      }
    }
  };

  const updateTreeWithChildren = (node: TreeNode | null, targetPath: string, children: TreeNode[]): TreeNode => {
    if (!node) return { name: '', path: '', is_dir: false, children: [] };
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (node.children) {
      return { ...node, children: node.children.map(c => updateTreeWithChildren(c, targetPath, children)) };
    }
    return node;
  };

  const handleAnalyze = () => {
    if (selectedFiles.length === 0) return;
    setPlanExplorerMode('planning');
  };

  const handleClose = () => {
    setPlanExplorerMode('idle');
    clearSelectedFiles();
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFiles.includes(node.path);

    return (
      <div key={node.path} className="explorer-node" style={{ paddingLeft: depth * 16 }}>
        {node.is_dir ? (
          <div className="explorer-dir-row">
            <button className="explorer-toggle" onClick={() => toggleDir(node.path)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span className="explorer-icon">📁</span>
            <span className="explorer-name">{node.name}</span>
          </div>
        ) : (
          <div className={`explorer-file-row ${isSelected ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelectedFile(node.path)}
              className="explorer-checkbox"
            />
            <span className="explorer-icon">📄</span>
            <span className="explorer-name">{node.name}</span>
          </div>
        )}
        {node.is_dir && isExpanded && node.children && (
          <div className="explorer-children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (planExplorerMode !== 'exploring') return null;

  return (
    <div className="plan-explorer-overlay">
      <div className="plan-explorer-panel">
        <div className="explorer-header">
          <div className="explorer-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span>Select Files to Analyze</span>
          </div>
          <button className="explorer-close" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="explorer-content">
          {loading ? (
            <div className="explorer-loading">Loading project...</div>
          ) : tree ? (
            <div className="explorer-tree">{renderNode(tree)}</div>
          ) : (
            <div className="explorer-empty">No project open</div>
          )}
        </div>

        <div className="explorer-footer">
          <span className="explorer-count">{selectedFiles.length} file(s) selected</span>
          <div className="explorer-actions">
            <button className="explorer-btn cancel" onClick={handleClose}>Cancel</button>
            <button className="explorer-btn analyze" onClick={handleAnalyze} disabled={selectedFiles.length === 0}>
              Analyze Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}