import { useEffect, useRef, useState } from 'react';
import { useBuild } from '../../hooks/useBuild';
import { useFileStore } from '../../stores/fileStore';
import { useUIStore } from '../../stores/uiStore';
import './BuildPanel.css';

interface BuildPanelProps {
  onBuild?: () => void;
  onUpload?: () => void;
}

interface ParsedError {
  type: 'error' | 'warning';
  file: string;
  line: string;
  message: string;
}

export function BuildPanel({ onBuild, onUpload }: BuildPanelProps) {
  const { rootPath, isPlatformIOProject, detectedBoard, openFile } = useFileStore();
  const { setBottomPanelTab, toggleBottomPanel } = useUIStore();
  const {
    isBuilding,
    isUploading,
    buildOutput,
    error,
    availableBoards,
    selectedBoard,
    setSelectedBoard,
    availablePorts,
    selectedPort,
    setSelectedPort,
    getPlatformInfo,
    listBoards,
    listPorts,
    build,
    upload,
    stopBuild,
    parseErrors,
    clearOutput,
  } = useBuild();

  const [parsedProblems, setParsedProblems] = useState<ParsedError[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const isRunning = isBuilding || isUploading;

  useEffect(() => {
    if (detectedBoard && !selectedBoard) {
      setSelectedBoard(detectedBoard);
    }
  }, [detectedBoard, selectedBoard, setSelectedBoard]);

  useEffect(() => {
    getPlatformInfo();
    listBoards();
    listPorts();
  }, [getPlatformInfo, listBoards, listPorts]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buildOutput]);

  const handleBuild = async () => {
    if (!rootPath) {
      return;
    }
    const result = await build(rootPath);
    if (result) {
      const combined = `${result.output}\n${result.stderr}`;
      const problems = await parseErrors(combined);
      setParsedProblems(problems);
    }
    if (result?.success) {
      onBuild?.();
    }
  };

  const handleUpload = async () => {
    if (!rootPath) {
      return;
    }
    const result = await upload(rootPath);
    if (result) {
      const combined = `${result.output}\n${result.stderr}`;
      const problems = await parseErrors(combined);
      setParsedProblems(problems);
    }
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
    const ansiColors: Record<string, string> = {
      '30': '#666666', '31': '#6366F1', '32': '#22C55E', '33': '#F59E0B', '34': '#60A5FA', '35': '#A78BFA', '36': '#22D3EE', '37': '#EDEDED',
      '90': '#666666', '91': '#F87171', '92': '#22C55E', '93': '#F59E0B', '94': '#60A5FA', '95': '#A78BFA', '96': '#22D3EE', '97': '#EDEDED',
    };
    const parts = text.split(/(\x1b\[[0-9;]*m)/g);
    let currentColor = '';
    return parts.map((part, i) => {
      const match = part.match(/^\x1b\[([0-9;]*)m$/);
      if (match) {
        const codes = match[1].split(';');
        if (codes.includes('0')) {
          currentColor = '';
        } else {
          for (const code of codes) {
            if (ansiColors[code]) {
              currentColor = ansiColors[code];
            }
          }
        }
        return null;
      }
      if (!part) return null;
      return <span key={i} style={currentColor ? { color: currentColor } : undefined}>{part}</span>;
    }).filter(Boolean) as JSX.Element[];
  };

  const handleProblemClick = async (problem: ParsedError) => {
    if (!problem.file || !rootPath) return;
    
    const fullPath = problem.file.startsWith('/') || problem.file.match(/^[A-Z]:/)
      ? problem.file
      : `${rootPath}/${problem.file}`;
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const content = await invoke<string>('read_file', { path: fullPath });
      openFile(fullPath, content);
      
      if (!useUIStore.getState().bottomPanelVisible) {
        toggleBottomPanel();
      }
      setBottomPanelTab('build');
    } catch (err) {
      console.error('Failed to open file:', err);
    }
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
          <select
            className="board-select"
            value={selectedPort || ''}
            onChange={(e) => setSelectedPort(e.target.value || null)}
            disabled={isRunning}
          >
            <option value="">Auto Detect Port</option>
            {availablePorts.map((port) => (
              <option key={port.path} value={port.path}>
                {port.friendlyName || port.path}
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
            disabled={isRunning || !rootPath || !isPlatformIOProject}
            title={!rootPath ? 'Open a project folder' : 'Upload'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
              <path d="M12 3V15M12 15L8 11M12 15L16 11"/>
            </svg>
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            className="build-action-btn stop"
            onClick={stopBuild}
            disabled={!isRunning}
            style={{ display: isRunning ? 'flex' : 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            Stop
          </button>
        </div>
        <button className="build-action-btn clear" onClick={() => { clearOutput(); setParsedProblems([]); }}>
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

      {parsedProblems.length > 0 && (
        <div className="build-problems">
          <div className="build-problems-header">
            <span className="build-problems-title">
              Problems ({parsedProblems.filter(p => p.type === 'error').length} errors, {parsedProblems.filter(p => p.type === 'warning').length} warnings)
            </span>
          </div>
          {parsedProblems.map((problem, i) => (
            <div 
              key={i} 
              className={`build-problem-row ${problem.type}`}
              onClick={() => handleProblemClick(problem)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleProblemClick(problem)}
            >
              <span className="build-problem-icon">{problem.type === 'error' ? '✕' : '⚠'}</span>
              <span className="build-problem-message">{problem.message}</span>
              {problem.file && <span className="build-problem-location">{problem.file}:{problem.line}</span>}
            </div>
          ))}
        </div>
      )}

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
