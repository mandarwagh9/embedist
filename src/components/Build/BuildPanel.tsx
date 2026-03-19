import { useEffect, useRef } from 'react';
import { useBuild } from '../../hooks/useBuild';
import { useFileStore } from '../../stores/fileStore';
import './BuildPanel.css';

interface BuildPanelProps {
  onBuild?: () => void;
  onUpload?: () => void;
}

export function BuildPanel({ onBuild, onUpload }: BuildPanelProps) {
  const { rootPath, isPlatformIOProject, detectedBoard } = useFileStore();
  const {
    isBuilding,
    isUploading,
    buildOutput,
    error,
    availableBoards,
    selectedBoard,
    setSelectedBoard,
    getPlatformInfo,
    listBoards,
    build,
    upload,
    clearOutput,
  } = useBuild();
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isRunning = isBuilding || isUploading;

  useEffect(() => {
    getPlatformInfo();
    listBoards();
  }, [getPlatformInfo, listBoards]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buildOutput]);

  const handleBuild = async () => {
    if (!rootPath) {
      return;
    }
    const result = await build(rootPath);
    if (result?.success) {
      onBuild?.();
    }
  };

  const handleUpload = async () => {
    if (!rootPath) {
      return;
    }
    const result = await upload(rootPath);
    if (result?.success) {
      onUpload?.();
    }
  };

  const getLineType = (line: string): 'info' | 'success' | 'error' | 'warning' => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('[error]') || lowerLine.includes('error:') || lowerLine.includes('***')) {
      return 'error';
    }
    if (lowerLine.includes('[warn]') || lowerLine.includes('warning:')) {
      return 'warning';
    }
    if (lowerLine.includes('[build]') && lowerLine.includes('success') || lowerLine.includes('[upload]') && lowerLine.includes('complete')) {
      return 'success';
    }
    if (lowerLine.includes('success') || lowerLine.includes('complete') || lowerLine.includes('done')) {
      return 'success';
    }
    return 'info';
  };

  const parseAnsiColor = (text: string): JSX.Element[] => {
    const parts = text.split(/(\x1b\[[0-9;]*m)/g);
    return parts.map((part, i) => {
      if (part.match(/^\x1b\[[0-9;]*m$/)) {
        return null;
      }
      return <span key={i}>{part}</span>;
    }).filter(Boolean) as JSX.Element[];
  };

  return (
    <div className="build-panel">
      <div className="build-toolbar">
        <div className="build-toolbar-left">
          <select
            className="board-select"
            value={selectedBoard || ''}
            onChange={(e) => setSelectedBoard(e.target.value || null)}
            disabled={isRunning}
          >
            <option value="">Select Board</option>
            {availableBoards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
          <button
            className={`build-action-btn ${isBuilding ? 'running' : ''}`}
            onClick={handleBuild}
            disabled={isRunning || !rootPath || !isPlatformIOProject}
            title={!rootPath ? 'Open a project folder' : !isPlatformIOProject ? 'Not a PlatformIO project' : 'Build'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isBuilding ? (
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              ) : (
                <polygon points="5 3 19 12 5 21 5 3"/>
              )}
            </svg>
            {isBuilding ? 'Building...' : 'Build'}
          </button>
          <button
            className="build-action-btn upload"
            onClick={handleUpload}
            disabled={isRunning || !rootPath || !isPlatformIOProject || !selectedBoard}
            title={!selectedBoard ? 'Select a board first' : !rootPath ? 'Open a project folder' : 'Upload'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
              <path d="M12 3V15M12 15L8 11M12 15L16 11"/>
            </svg>
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            className="build-action-btn stop"
            onClick={() => {}}
            disabled={!isRunning}
            style={{ display: isRunning ? 'flex' : 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            Stop
          </button>
        </div>
        <button className="build-action-btn clear" onClick={clearOutput}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Clear
        </button>
      </div>

      <div className="build-output">
        {!rootPath ? (
          <div className="build-placeholder">
            <span>Open a PlatformIO project folder to build</span>
          </div>
        ) : !isPlatformIOProject ? (
          <div className="build-placeholder">
            <span>Current folder is not a PlatformIO project</span>
          </div>
        ) : buildOutput.length === 0 && !isRunning ? (
          <div className="build-placeholder">
            <span>Click Build to compile your project</span>
          </div>
        ) : (
          buildOutput.map((line, index) => (
            <div key={index} className={`build-line ${getLineType(line)}`}>
              {line ? parseAnsiColor(line) : '\u00A0'}
            </div>
          ))
        )}
        {error && (
          <div className="build-line error">
            {parseAnsiColor(`[ERROR] ${error}`)}
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      <div className="build-status">
        {isRunning ? (
          <span className="build-status-running">
            <span className="build-status-dot"></span>
            {isBuilding ? 'Building...' : 'Uploading...'}
          </span>
        ) : error ? (
          <span className="build-status-error">
            Build failed - Check errors above
          </span>
        ) : buildOutput.length > 0 ? (
          <span className="build-status-done">
            {buildOutput.some(l => l.toLowerCase().includes('success') || l.toLowerCase().includes('complete'))
              ? 'Build successful'
              : 'Build completed'}
          </span>
        ) : (
          <span className="build-status-idle">
            {isPlatformIOProject ? `Ready - Board: ${detectedBoard || 'auto'}` : 'Not a PlatformIO project'}
          </span>
        )}
      </div>
    </div>
  );
}
