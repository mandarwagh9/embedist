import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface PlatformInfo {
  os: string;
  arch: string;
}

interface BuildResult {
  success: boolean;
  stdout: string;
  stderr: string;
  return_code: number;
  duration_ms: number;
  cancelled: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  duration?: number;
}

interface ParsedErrorRust {
  type: 'error' | 'warning';
  file: string;
  line: string;
  message: string;
}

interface Board {
  id: string;
  name: string;
  type: string;
}

interface SerialPortInfo {
  path: string;
  friendlyName?: string;
}

export function useBuild() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [buildOutput, setBuildOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [availableBoards, setAvailableBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  const appendOutput = useCallback((line: string) => {
    setBuildOutput((prev) => [...prev, line]);
  }, []);

  const clearOutput = useCallback(() => {
    setBuildOutput([]);
    setError(null);
  }, []);

  const getPlatformInfo = useCallback(async () => {
    try {
      const info = await invoke<PlatformInfo>('get_platform_info');
      setPlatformInfo(info);
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return null;
    }
  }, []);

  const checkPlatformIO = useCallback(async () => {
    try {
      const result = await invoke<string>('check_platformio');
      appendOutput(result);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      appendOutput(`PlatformIO check failed: ${errorMessage}`);
      return false;
    }
  }, [appendOutput]);

  const listBoards = useCallback(async () => {
    try {
      const boards = await invoke<Board[]>('list_connected_boards');
      setAvailableBoards(boards);
      return boards;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return [];
    }
  }, []);

  const listPorts = useCallback(async () => {
    try {
      const ports = await invoke<SerialPortInfo[]>('list_serial_ports');
      setAvailablePorts(ports);
      if (ports.length > 0 && !selectedPort) {
        setSelectedPort(ports[0].path);
      }
      return ports;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return [];
    }
  }, [selectedPort]);

  const build = useCallback(async (projectPath?: string) => {
    setIsBuilding(true);
    clearOutput();
    const startTime = Date.now();

    try {
      appendOutput('[BUILD] Starting build...');
      const result = await invoke<BuildResult>('build_project', { projectPath });

      result.output.split('\n').forEach((line) => {
        if (line.trim()) appendOutput(line);
      });

      result.errors.forEach((err) => appendOutput(`[ERROR] ${err}`));
      result.warnings.forEach((warn) => appendOutput(`[WARN] ${warn}`));

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (result.success) {
        appendOutput(`[BUILD] Success! Completed in ${duration}s`);
      } else {
        appendOutput(`[BUILD] Failed after ${duration}s`);
        setError('Build failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      appendOutput(`[ERROR] ${errorMessage}`);
      return null;
    } finally {
      setIsBuilding(false);
    }
  }, [appendOutput, clearOutput]);

  const stopBuild = useCallback(async () => {
    try {
      await invoke('stop_build');
      appendOutput('[BUILD] Build cancelled by user');
      setError(null);
    } catch (err) {
      console.error('Failed to stop build:', err);
    } finally {
      setIsBuilding(false);
    }
  }, [appendOutput]);

  const upload = useCallback(async (projectPath?: string) => {
    setIsUploading(true);
    clearOutput();

    try {
      appendOutput('[UPLOAD] Starting upload...');
      if (!selectedBoard) {
        throw new Error('No board selected. Please select a board first.');
      }
      
      const result = await invoke<BuildResult>('upload_firmware', {
        projectPath,
        port: selectedPort || null,
      });

      result.output.split('\n').forEach((line) => {
        if (line.trim()) appendOutput(line);
      });

      if (result.success) {
        appendOutput('[UPLOAD] Upload complete!');
      } else {
        setError('Upload failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      appendOutput(`[ERROR] ${errorMessage}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [appendOutput, clearOutput, selectedBoard]);

  const parseErrors = useCallback(async (output: string) => {
    try {
      const errors = await invoke<ParsedErrorRust[]>('parse_build_errors', { output });
      return errors;
    } catch (err) {
      console.error('Failed to parse errors:', err);
      return [];
    }
  }, []);

  return {
    isBuilding,
    isUploading,
    buildOutput,
    error,
    platformInfo,
    availableBoards,
    selectedBoard,
    setSelectedBoard,
    availablePorts,
    selectedPort,
    setSelectedPort,
    getPlatformInfo,
    checkPlatformIO,
    listBoards,
    listPorts,
    build,
    upload,
    stopBuild,
    parseErrors,
    clearOutput,
    appendOutput,
  };
}
