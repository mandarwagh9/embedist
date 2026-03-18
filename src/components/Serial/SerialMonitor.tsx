import { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';
import './SerialMonitor.css';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export function SerialMonitor() {
  const { serialConnected, serialBaudRate, setSerialConnected, setSerialPort, setSerialBaudRate } = useUIStore();
  const [logs, setLogs] = useState<{ id: number; text: string; type: 'info' | 'error' | 'input' }[]>([]);
  const [input, setInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const connect = async () => {
    if (!('serial' in navigator)) {
      setLogs(prev => [...prev, { id: Date.now(), text: 'Web Serial API not supported in this browser', type: 'error' }]);
      return;
    }

    setIsConnecting(true);
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: serialBaudRate });
      
      setSerialPort(port.getInfo?.()?.path || 'Connected');
      setSerialConnected(true);
      
      setLogs(prev => [...prev, { id: Date.now(), text: `Connected at ${serialBaudRate} baud`, type: 'info' }]);

      const reader = port.readable.getReader();
      readerRef.current = reader;

      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const text = new TextDecoder().decode(value);
            const lines = text.split('\n').filter(l => l.trim());
            lines.forEach(line => {
              setLogs(prev => [...prev, { id: Date.now(), text: line, type: 'info' }]);
            });
          }
        } catch (err) {
          console.error('Read error:', err);
        }
      };

      readLoop();
    } catch (err) {
      setLogs(prev => [...prev, { id: Date.now(), text: `Connection failed: ${err}`, type: 'error' }]);
    }
    setIsConnecting(false);
  };

  const disconnect = async () => {
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }
    setSerialConnected(false);
    setSerialPort(null);
    setLogs(prev => [...prev, { id: Date.now(), text: 'Disconnected', type: 'info' }]);
  };

  const sendCommand = async () => {
    if (!input.trim()) return;
    setLogs(prev => [...prev, { id: Date.now(), text: `> ${input}`, type: 'input' }]);
    setInput('');
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="serial-monitor">
      <div className="serial-toolbar">
        <div className="serial-connection">
          <select
            className="serial-select"
            value={serialBaudRate}
            onChange={(e) => setSerialBaudRate(Number(e.target.value))}
            disabled={serialConnected}
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
            {isConnecting ? 'Connecting...' : serialConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
        
        <button className="serial-btn clear" onClick={clearLogs} title="Clear">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>

      <div className="serial-output">
        {logs.length === 0 ? (
          <div className="serial-placeholder">
            <span>No serial output</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`serial-line ${log.type}`}>
              <span className="serial-timestamp">
                {new Date().toLocaleTimeString()}
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
          placeholder={serialConnected ? "Type command..." : "Connect to send"}
          disabled={!serialConnected}
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
