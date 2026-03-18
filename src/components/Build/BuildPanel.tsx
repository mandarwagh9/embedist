import { useState, useRef, useEffect } from 'react';
import './BuildPanel.css';

interface LogLine {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface BuildPanelProps {
  onBuild?: () => void;
  onUpload?: () => void;
}

export function BuildPanel({ onBuild, onUpload }: BuildPanelProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleBuild = async () => {
    setIsRunning(true);
    setLogs([]);

    // Simulated build output
    const buildSteps: LogLine[] = [
      { id: 0, text: '> pio run', type: 'info' },
      { id: 1, text: '', type: 'info' },
      { id: 2, text: 'Processing esp32dev (platform: espressif32, board: esp32dev, framework: arduino)', type: 'info' },
      { id: 3, text: '', type: 'info' },
      { id: 4, text: 'Library Dependency Finder', type: 'info' },
      { id: 5, text: 'PlatformIO has detected a change in libraries dependency tree.', type: 'info' },
      { id: 6, text: 'Installing dependencies...', type: 'info' },
      { id: 7, text: '✓ Library Manager: Installing libraries...', type: 'success' },
      { id: 8, text: '✓ SUCCESS: Dependencies installed', type: 'success' },
      { id: 9, text: '', type: 'info' },
      { id: 10, text: 'Compiling .pio/build/esp32dev/src/main.cpp.o', type: 'info' },
      { id: 11, text: 'Compiling .pio/build/esp32dev/src/config.cpp.o', type: 'info' },
      { id: 12, text: '', type: 'info' },
      { id: 13, text: 'Linking .pio/build/esp32dev/firmware.elf', type: 'info' },
      { id: 14, text: 'Building .pio/build/esp32dev/firmware.bin', type: 'info' },
      { id: 15, text: 'Calculating size .pio/build/esp32dev/firmware.elf', type: 'info' },
      { id: 16, text: '266884      4604   32272  303760   4a190 .pio/build/esp32dev/firmware.elf', type: 'info' },
      { id: 17, text: '', type: 'info' },
      { id: 18, text: '=== [SUCCESS] Took 12.34 seconds ===', type: 'success' },
    ];

    for (const step of buildSteps) {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      setLogs(prev => [...prev, { ...step, id: Date.now() + Math.random() }]);
    }

    setIsRunning(false);
    onBuild?.();
  };

  const handleUpload = async () => {
    setIsRunning(true);
    setLogs([]);

    const uploadSteps: LogLine[] = [
      { id: 0, text: '> pio run --target upload', type: 'info' },
      { id: 1, text: '', type: 'info' },
      { id: 2, text: 'Processing esp32dev (platform: espressif32, board: esp32dev, framework: arduino)', type: 'info' },
      { id: 3, text: 'Uploading to board...', type: 'info' },
      { id: 4, text: 'Using staging parser ESP32 staging parser', type: 'info' },
      { id: 5, text: 'Serial port /dev/ttyUSB0', type: 'info' },
      { id: 6, text: 'Connecting...', type: 'info' },
      { id: 7, text: 'Chip is ESP32-D0WD-V3 (revision 3)', type: 'info' },
      { id: 8, text: 'Features: WiFi, BT, Dual Core, 240Mhz', type: 'info' },
      { id: 9, text: 'MAC: 24:6f:28:xx:xx:xx', type: 'info' },
      { id: 10, text: 'Uploading stub...', type: 'info' },
      { id: 11, text: 'Running stub...', type: 'info' },
      { id: 12, text: 'Configuring flash size...', type: 'info' },
      { id: 13, text: 'Flash size set to 4MB', type: 'info' },
      { id: 14, text: '', type: 'info' },
      { id: 15, text: 'Uploading 272864 bytes...', type: 'info' },
      { id: 16, text: 'Writing at 0x1000... (11%)', type: 'info' },
      { id: 17, text: 'Writing at 0x4000... (26%)', type: 'info' },
      { id: 18, text: 'Writing at 0x7800... (41%)', type: 'info' },
      { id: 19, text: 'Writing at 0xa000... (56%)', type: 'info' },
      { id: 20, text: 'Writing at 0x10000... (71%)', type: 'info' },
      { id: 21, text: 'Writing at 0x20000... (86%)', type: 'info' },
      { id: 22, text: 'Writing at 0x3f000... (100%)', type: 'success' },
      { id: 23, text: '', type: 'info' },
      { id: 24, text: '=== [SUCCESS] Upload complete ===', type: 'success' },
    ];

    for (const step of uploadSteps) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      setLogs(prev => [...prev, { ...step, id: Date.now() + Math.random() }]);
    }

    setIsRunning(false);
    onUpload?.();
  };

  const clearLogs = () => setLogs([]);

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
          <button
            className={`build-action-btn ${isRunning ? 'running' : ''}`}
            onClick={handleBuild}
            disabled={isRunning}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isRunning ? (
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              ) : (
                <polygon points="5 3 19 12 5 21 5 3"/>
              )}
            </svg>
            {isRunning ? 'Building...' : 'Build'}
          </button>
          <button
            className="build-action-btn upload"
            onClick={handleUpload}
            disabled={isRunning}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"/>
              <path d="M12 3V15M12 15L8 11M12 15L16 11"/>
            </svg>
            Upload
          </button>
          <button
            className="build-action-btn stop"
            onClick={() => setIsRunning(false)}
            disabled={!isRunning}
            style={{ display: isRunning ? 'flex' : 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            Stop
          </button>
        </div>
        <button className="build-action-btn clear" onClick={clearLogs}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Clear
        </button>
      </div>

      <div className="build-output">
        {logs.length === 0 ? (
          <div className="build-placeholder">
            <span>Build output will appear here</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`build-line ${log.type}`}>
              {log.text ? parseAnsiColor(log.text) : '\u00A0'}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      <div className="build-status">
        {isRunning ? (
          <span className="build-status-running">
            <span className="build-status-dot"></span>
            Building...
          </span>
        ) : logs.length > 0 ? (
          <span className="build-status-done">
            Build completed
          </span>
        ) : (
          <span className="build-status-idle">
            Ready
          </span>
        )}
      </div>
    </div>
  );
}
