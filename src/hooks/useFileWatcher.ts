import { useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useFileStore } from '../stores/fileStore';
import { useFileSystem } from './useFileSystem';

interface FileChangeEvent {
  path: string;
  change_type: 'created' | 'deleted' | 'modified';
}

export function useFileWatcher() {
  const rootPath = useFileStore((state) => state.rootPath);
  const setFileContent = useFileStore((state) => state.setFileContent);
  const clearExternalModification = useFileStore((state) => state.clearExternalModification);
  const openTabs = useFileStore((state) => state.openTabs);
  const openTabPathsRef = useRef(new Set(openTabs.map(t => t.path)));
  const { refreshRoot } = useFileSystem();

  const refreshFile = useCallback(async (filePath: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const content = await invoke<string>('read_file', { path: filePath, root: useFileStore.getState().rootPath });
      setFileContent(filePath, content);
      clearExternalModification(filePath);
    } catch (err) {
      console.error('Failed to refresh file:', filePath, err);
    }
  }, [setFileContent, clearExternalModification]);

  useEffect(() => {
    openTabPathsRef.current = new Set(openTabs.map(t => t.path));
  }, [openTabs]);

  useEffect(() => {
    if (!rootPath) return;

    let unlisten: (() => void) | null = null;
    let started = true;

    const startWatch = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('start_watch', { path: rootPath, root: rootPath });
      } catch (err) {
        console.error('Failed to start file watcher:', err);
      }
    };

    const setupListener = async () => {
      unlisten = await listen<FileChangeEvent>('file-changed', (event) => {
        if (!started) return;
        const { path, change_type } = event.payload;
        const normalizedPath = path.replace(/\\/g, '/');
        if (change_type === 'modified' && openTabPathsRef.current.has(normalizedPath)) {
          refreshFile(normalizedPath);
        } else if (change_type === 'created' || change_type === 'deleted') {
          refreshRoot();
        }
      });
    };

    startWatch()
      .then(() => setupListener())
      .catch((err) => console.error('Failed to setup file watcher:', err));

    return () => {
      started = false;
      if (unlisten) unlisten();
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('stop_watch').catch(() => {});
      });
    };
  }, [rootPath, refreshFile, refreshRoot]);

  return { refreshFile };
}
