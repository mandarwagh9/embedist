import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useFileStore } from '../../stores/fileStore';
import '@xterm/xterm/css/xterm.css';
import './TerminalPanel.css';

interface PtyData {
  data: string;
}

export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootPath = useFileStore((state) => state.rootPath);

  const initializePty = useCallback(async (): Promise<() => void> => {
    if (!terminalRef.current) return () => {};

    try {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Consolas, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5',
        },
        scrollback: 10000,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(terminalRef.current);
      fitAddon.fit();

      terminalInstanceRef.current = term;
      fitAddonRef.current = fitAddon;

      const shell = 'powershell.exe';
      const cwd = rootPath || null;

      const ptyId = await invoke<number>('pty_spawn', {
        command: shell,
        args: [],
        cwd: cwd,
        cols: term.cols,
        rows: term.rows,
      });

      ptyIdRef.current = ptyId;

      term.onData((data) => {
        invoke('pty_write', { id: ptyId, data }).catch((err) => {
          console.error('PTY write error:', err);
        });
      });

      term.onResize(({ cols, rows }) => {
        invoke('pty_resize', { id: ptyId, cols, rows }).catch((err) => {
          console.error('PTY resize error:', err);
        });
      });

      const unlisten = await listen<PtyData>('pty-data', (event) => {
        if (event.payload && typeof event.payload.data === 'string') {
          term.write(event.payload.data);
        }
      });

      setIsReady(true);

      term.writeln('\x1b[36mEmbedist Terminal\x1b[0m');
      term.writeln('Type commands below...');
      term.writeln('');

      return () => {
        unlisten();
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Failed to initialize PTY:', err);
    }
    return () => {};
  }, [rootPath]);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;

    const setup = async () => {
      unlistenFn = await initializePty();
    };
    setup();

    return () => {
      if (ptyIdRef.current !== null) {
        invoke('pty_kill', { id: ptyIdRef.current }).catch(() => {});
      }
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
      }
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [initializePty]);

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (ptyIdRef.current !== null) {
          const term = terminalInstanceRef.current;
          if (term) {
            invoke('pty_resize', {
              id: ptyIdRef.current,
              cols: term.cols,
              rows: term.rows,
            }).catch(() => {});
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  if (error) {
    return (
      <div className="terminal-panel terminal-error">
        <div className="terminal-error-message">
          <span className="terminal-error-icon">⚠</span>
          <span>Failed to initialize terminal: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-panel">
      <div ref={terminalRef} className="terminal-container" />
      {!isReady && !error && (
        <div className="terminal-loading">
          <span>Initializing terminal...</span>
        </div>
      )}
    </div>
  );
}
