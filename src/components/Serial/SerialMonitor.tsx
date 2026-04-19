import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import './SerialMonitor.css';

const BAUD_RATES = [74480, 115200, 9600, 19200, 38400, 57600, 230400, 460800, 921600, 250000];
const LINE_ENDINGS = [
  { value: 'CRLF', label: 'CRLF (\\r\\n)' },
  { value: 'LF', label: 'LF (\\n)' },
  { value: 'CR', label: 'CR (\\r)' },
] as const;

const ENCODINGS = [
  { value: 'iso-8859-1', label: 'ISO-8859-1 (Latin-1)' },
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'ascii', label: 'ASCII' },
] as const;

const MAX_INPUT_LENGTH = 256;
const MAX_LINE_LENGTH = 512;
const MAX_BUFFER_SIZE = 64 * 1024;
const MAX_LOG_ENTRIES = 5000;

const SHELL_METACHARS = /[;|&$`(){}[\]<>\"'\\]/g;
const CONTROL_CHARS = /[\x00-\x1F]/g;

type SerialPortInfo = {
  path: string;
  name?: string;
};

type SerialDataPayload = {
  session_id: number;
  data: number[];
};

type SerialDisconnectPayload = {
  session_id: number;
  port_path: string;
};

function sanitizeInput(input: string): string {
  return input
    .slice(0, MAX_INPUT_LENGTH)
    .replace(SHELL_METACHARS, '')
    .replace(CONTROL_CHARS, '')
    .trim();
}

function sanitizeOutput(text: string): string {
  return text
    .slice(0, MAX_LINE_LENGTH)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let logIdCounter = 0;

export function SerialMonitor() {
  const {
    serialConnected,
    serialPort,
    serialBaudRate,
    setSerialConnected,
    setSerialPort,
    setSerialBaudRate,
  } = useUIStore();
  const { serial, updateSerial } = useSettingsStore();
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [logs, setLogs] = useState<{ id: number; text: string; type: 'info' | 'error' | 'input'; timestamp: number }[]>([]);
  const [input, setInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<number | null>(null);
  const bufferRef = useRef<string>('');
  const decoderRef = useRef<TextDecoder>(new TextDecoder(serial.encoding || 'iso-8859-1'));

  useEffect(() => {
    decoderRef.current = new TextDecoder(serial.encoding || 'iso-8859-1');
  }, [serial.encoding]);

  const addLog = (text: string, type: 'info' | 'error' | 'input') => {
    const sanitized = sanitizeOutput(text);
    setLogs(prev => {
      const next = [...prev, { id: ++logIdCounter, text: sanitized, type, timestamp: Date.now() }];
      return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
    });
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (serial.autoScroll) {
      scrollToBottom();
    }
  }, [logs, serial.autoScroll]);

  const refreshPorts = async () => {
    try {
      const portList = await invoke<SerialPortInfo[]>('list_serial_ports');
      setPorts(portList);
      setSelectedPort((current) => {
        if (current && portList.some((p) => p.path === current)) {
          return current;
        }
        return portList[0]?.path || '';
      });
      return portList;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return [];
    }
  };

  useEffect(() => {
    refreshPorts();
    const interval = window.setInterval(() => {
      refreshPorts();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let unlistenData: (() => void) | null = null;
    let unlistenDisconnect: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const setup = async () => {
      unlistenData = await listen<SerialDataPayload>('serial-data', (event) => {
        if (sessionIdRef.current !== event.payload.session_id) return;

        const bytes = new Uint8Array(event.payload.data);
        const text = decoderRef.current.decode(bytes, { stream: true });
        bufferRef.current += text;

        if (bufferRef.current.length > MAX_BUFFER_SIZE) {
          bufferRef.current = bufferRef.current.slice(-MAX_BUFFER_SIZE);
          addLog('Buffer overflow, trimming...', 'error');
        }

        const normalized = bufferRef.current.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalized.split('\n');
        bufferRef.current = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            addLog(line, 'info');
          }
        }
      });

      unlistenDisconnect = await listen<SerialDisconnectPayload>('serial-disconnected', (event) => {
        if (sessionIdRef.current !== event.payload.session_id) return;

        bufferRef.current = '';
        sessionIdRef.current = null;
        setSerialConnected(false);
        setSerialPort(null);
        setIsConnecting(false);
        addLog(`Disconnected from ${event.payload.port_path}`, 'info');
      });

      unlistenError = await listen<{ session_id: number; port_path: string; error: string }>('serial-error', (event) => {
        if (sessionIdRef.current !== event.payload.session_id) return;
        const message = event.payload.error || 'Unknown serial error';
        setError(message);
        addLog(`Serial error: ${message}`, 'error');
      });
    };

    setup().catch((err) => {
      console.error('Failed to setup serial listeners:', err);
    });

    return () => {
      unlistenData?.();
      unlistenDisconnect?.();
      unlistenError?.();
    };
  }, [setSerialConnected, setSerialPort]);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current !== null) {
        const sessionId = sessionIdRef.current;
        sessionIdRef.current = null;
        invoke('close_serial_port', { sessionId }).catch(() => {});
      }
    };
  }, []);

  const connect = async () => {
    if (serialConnected && sessionIdRef.current !== null) {
      await disconnect();
    }

    if (!selectedPort) {
      setError('Select a serial port first');
      addLog('Select a serial port first', 'error');
      return;
    }

    const request = {
      portPath: selectedPort,
      baudRate: serialBaudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      dtr: serial.dtr,
      rts: serial.rts,
    };

    setIsConnecting(true);
    setError(null);

    try {
      if (serial.clearOnConnect) {
        setLogs([]);
        bufferRef.current = '';
      }

      const sessionId = await invoke<number>('open_serial_port', { request });
      sessionIdRef.current = sessionId;
      setSerialConnected(true);
      setSerialPort(selectedPort);
      addLog(`Connected to ${selectedPort} at ${serialBaudRate} baud`, 'info');
      if (serial.dtr) addLog('DTR enabled', 'info');
      if (serial.rts) addLog('RTS enabled', 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      addLog(`Connection failed: ${message}`, 'error');
      setSerialConnected(false);
      setSerialPort(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    const sessionId = sessionIdRef.current;
    if (sessionId === null) {
      setSerialConnected(false);
      setSerialPort(null);
      return;
    }

    try {
      sessionIdRef.current = null;
      await invoke('close_serial_port', { sessionId });
    } catch (err) {
      console.error('Failed to close serial port:', err);
    } finally {
      bufferRef.current = '';
      setSerialConnected(false);
      setSerialPort(null);
      addLog('Disconnected', 'info');
    }
  };

  const sendCommand = async () => {
    if (!input.trim() || sessionIdRef.current === null) return;

    const sanitized = sanitizeInput(input);
    if (!sanitized) return;

    const { lineEnding } = useSettingsStore.getState().serial;
    const ending = lineEnding === 'CR' ? '\r' : lineEnding === 'LF' ? '\n' : '\r\n';
    const data = sanitized + ending;

    try {
      await invoke('write_serial_port', { sessionId: sessionIdRef.current, data });
    } catch (err) {
      console.error('Serial send error:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      addLog('Send failed', 'error');
      return;
    }

    addLog(`> ${sanitized}`, 'input');
    setInput('');
  };

  const clearLogs = () => setLogs([]);

  const saveLogs = async () => {
    if (logs.length === 0) return;
    const content = logs.map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.text}`).join('\n');
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        defaultPath: `serial-output-${Date.now()}.txt`,
        filters: [{ name: 'Text Files', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }],
      });
      if (filePath) {
        await invoke('write_file', { path: filePath, content, root: '' });
      }
    } catch (err) {
      console.error('Failed to save logs:', err);
    }
  };

  return (
    <div className="serial-monitor">
      <div className="serial-toolbar">
        <div className="serial-connection">
          <select
            className="serial-select serial-port-select"
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            disabled={serialConnected || isConnecting}
            title="Serial port"
          >
            <option value="">Select Port</option>
            {ports.map((port) => (
              <option key={port.path} value={port.path}>
                {port.name || port.path}
              </option>
            ))}
          </select>

          <select
            className="serial-select"
            value={serialBaudRate}
            onChange={(e) => setSerialBaudRate(Number(e.target.value))}
            disabled={serialConnected || isConnecting}
          >
            {BAUD_RATES.map(rate => (
              <option key={rate} value={rate}>{rate}</option>
            ))}
          </select>

          <button
            className={`serial-btn ${serialConnected ? 'disconnect' : 'connect'}`}
            onClick={serialConnected ? disconnect : connect}
            disabled={isConnecting}
          >
            {isConnecting ? '...' : serialConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>

        <button
          className={`serial-btn settings-toggle ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>

        {showSettings && (
          <div className="serial-settings">
            <select
              className="serial-select"
              value={serial.lineEnding}
              onChange={(e) => updateSerial({ lineEnding: e.target.value as 'CR' | 'LF' | 'CRLF' })}
              title="Line Ending"
            >
              {LINE_ENDINGS.map(ending => (
                <option key={ending.value} value={ending.value}>{ending.label}</option>
              ))}
            </select>

            <select
              className="serial-select"
              value={serial.encoding}
              onChange={(e) => updateSerial({ encoding: e.target.value as 'utf-8' | 'iso-8859-1' | 'ascii' })}
              title="Encoding"
            >
              {ENCODINGS.map(enc => (
                <option key={enc.value} value={enc.value}>{enc.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="serial-actions">
          <button className="serial-btn" onClick={refreshPorts} title="Refresh Ports">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 10-3.24 6.92M21 12v6h-6"/>
            </svg>
          </button>
          <button className="serial-btn" onClick={clearLogs} title="Clear">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
          <button className="serial-btn" onClick={saveLogs} title="Save" disabled={logs.length === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="serial-error-banner">{error}</div>
      )}

      <div className="serial-output">
        {logs.length === 0 ? (
          <div className="serial-placeholder">
            <span>No serial output</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`serial-line ${log.type}`}>
              <span className="serial-timestamp">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="serial-text">{log.text}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      <div className="serial-input-area">
        <input
          type="text"
          className="serial-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
          placeholder={serialConnected ? `Type command for ${serialPort || 'serial port'}...` : 'Connect to send'}
          disabled={!serialConnected}
          maxLength={MAX_INPUT_LENGTH}
        />
        <button
          className="serial-send"
          onClick={sendCommand}
          disabled={!serialConnected || !input.trim()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
