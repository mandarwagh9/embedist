import { useFileStore } from '../../stores/fileStore';

interface RecentFilesProps {
  onFileSelect: (path: string) => void;
  onClose: () => void;
}

export function RecentFiles({ onFileSelect, onClose }: RecentFilesProps) {
  const recentFiles = useFileStore(s => s.recentFiles);
  const clearRecentFiles = useFileStore(s => s.clearRecentFiles);

  if (recentFiles.length === 0) return null;

  const getIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, JSX.Element> = {
      ino: <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />,
      cpp: <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM9 14H13M9 18H11" />,
      h: <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />,
      json: <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />,
      md: <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />,
    };
    return icons[ext] || (
      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
    );
  };

  const getFolder = (path: string) => {
    const parts = path.replace(/\\/g, '/').split('/');
    parts.pop();
    return parts.join('/');
  };

  return (
    <div className="recent-files">
      <div className="recent-files-header">
        <span className="recent-files-title">Recent Files</span>
        <button className="recent-files-clear" onClick={clearRecentFiles} title="Clear recent files">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="recent-files-list">
        {recentFiles.map((file) => (
          <button
            key={file.path}
            className="recent-file-item"
            onClick={() => { onFileSelect(file.path); onClose(); }}
          >
            <span className="recent-file-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {getIcon(file.name)}
              </svg>
            </span>
            <span className="recent-file-info">
              <span className="recent-file-name">{file.name}</span>
              <span className="recent-file-path">{getFolder(file.path)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
