import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface SerialPort {
  path: string;
  name?: string;
}

interface SerialConfig {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
}

interface SerialMessage {
  type: 'sent' | 'received' | 'system';
  data: string;
  timestamp: Date;
}

interface WebSerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
  }): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Navigator {
    serial?: {
      requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<WebSerialPort>;
      getPorts(): Promise<WebSerialPort[]>;
    };
  }
}

export function useSerial() {
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState<SerialConfig>({
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
  });
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const portReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const portRef = useRef<WebSerialPort | null>(null);
  const isReadingRef = useRef(false);

  const addMessage = useCallback((type: SerialMessage['type'], data: string) => {
    setMessages((prev) => {
      const next = [
        ...prev,
        { type, data, timestamp: new Date() },
      ];
      return next.length > 5000 ? next.slice(-5000) : next;
    });
  }, []);

  const refreshPorts = useCallback(async () => {
    try {
      const portList = await invoke<SerialPort[]>('list_serial_ports');
      setPorts(portList);
      return portList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return [];
    }
  }, []);

  const readLoop = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    isReadingRef.current = true;
    try {
      while (isReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        addMessage('received', text);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        addMessage('system', `Read error: ${err.message}`);
      }
    }
    isReadingRef.current = false;
  }, [addMessage]);

  const connect = useCallback(async (path: string) => {
    if (isConnected) {
      await disconnect();
    }

    try {
      if (!navigator.serial) {
        throw new Error('Web Serial API not supported. Please use a Chromium-based browser.');
      }

      const webPort = await navigator.serial.requestPort();
      await webPort.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity as 'none' | 'even' | 'odd',
      });

      portRef.current = webPort;
      setSelectedPort(path);
      setIsConnected(true);
      addMessage('system', `Connected to ${path} at ${config.baudRate} baud`);

      const reader = webPort.readable?.getReader();
      if (reader) {
        portReaderRef.current = reader as ReadableStreamDefaultReader<Uint8Array>;
        readLoop(reader as ReadableStreamDefaultReader<Uint8Array>);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      addMessage('system', `Connection failed: ${errorMessage}`);
      return false;
    }
  }, [config, isConnected, addMessage, readLoop]);

  const disconnect = useCallback(async () => {
    try {
      isReadingRef.current = false;
      
      if (portReaderRef.current) {
        await portReaderRef.current.cancel();
        portReaderRef.current = null;
      }

      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }

      setIsConnected(false);
      addMessage('system', 'Disconnected');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  }, [addMessage]);

  const send = useCallback(async (data: string) => {
    if (!portRef.current || !isConnected) {
      setError('Not connected to a serial port');
      return false;
    }

    try {
      const writer = portRef.current.writable?.getWriter();
      if (writer) {
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(data));
        writer.releaseLock();
        addMessage('sent', data);
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return false;
    }
  }, [isConnected, addMessage]);

  const sendCommand = useCallback(async (command: string) => {
    return send(command + '\n');
  }, [send]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<SerialConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  useEffect(() => {
    refreshPorts();
    const interval = setInterval(refreshPorts, 5000);
    return () => clearInterval(interval);
  }, [refreshPorts]);

  useEffect(() => {
    return () => {
      if (portRef.current || isReadingRef.current) {
        disconnect();
      }
    };
  }, [disconnect]);

  return {
    ports,
    selectedPort,
    setSelectedPort,
    isConnected,
    config,
    messages,
    error,
    refreshPorts,
    connect,
    disconnect,
    send,
    sendCommand,
    clearMessages,
    updateConfig,
  };
}
