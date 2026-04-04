import { useState, useRef, useEffect, useCallback } from 'react';
import { useFileStore } from '../../stores/fileStore';
import type { FileNode } from '../../types';
import './FileReferencePicker.css';

interface FileReferencePickerProps {
  open: boolean;
  query: string;
  onSelect: (file: FileNode) => void;
  onClose: () => void;
}

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  const walk = (items: FileNode[]) => {
    for (const item of items) {
      if (!item.isDir) result.push(item);
      if (item.children) walk(item.children);
    }
  };
  walk(nodes);
  return result;
}

function getFileIcon(name: string): JSX.Element {
  const ext = name.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, JSX.Element> = {
    cpp: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    h: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    ini: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4"/></svg>,
    json: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>,
    md: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M7 15V9l2.5 3L12 9v6"/></svg>,
  };
  return iconMap[ext || ''] || (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

export function FileReferencePicker({ open, query, onSelect, onClose }: FileReferencePickerProps) {
  const files = useFileStore((s) => s.files);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const allFiles = flattenFiles(files);
  const filtered = query
    ? allFiles.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.path.toLowerCase().includes(query.toLowerCase()))
    : allFiles.slice(0, 20);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('.file-ref-item.selected');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      onSelect(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (!open || filtered.length === 0) return null;

  return (
    <div className="file-ref-picker" onKeyDown={handleKeyDown}>
      <div className="file-ref-list" ref={listRef}>
        {filtered.map((file, i) => (
          <button
            key={file.path}
            className={`file-ref-item ${i === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(file)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span className="file-ref-icon">{getFileIcon(file.name)}</span>
            <span className="file-ref-name">{file.name}</span>
            <span className="file-ref-path">{file.path}</span>
          </button>
        ))}
      </div>
      <div className="file-ref-footer">
        <span>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
        <span>↑↓ navigate · ↵ select · esc close</span>
      </div>
    </div>
  );
}
