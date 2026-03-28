import { useEffect, useCallback } from 'react';
import { useFileStore } from '../stores/fileStore';

export function useFileWatcher() {
  const rootPath = useFileStore((state) => state.rootPath);
  const setFileContent = useFileStore((state) => state.setFileContent);
  const clearExternalModification = useFileStore((state) => state.clearExternalModification);

  const refreshFile = useCallback(async (filePath: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const content = await invoke<string>('read_file', { path: filePath });
      setFileContent(filePath, content);
      clearExternalModification(filePath);
    } catch (err) {
      console.error('Failed to refresh file:', filePath, err);
    }
  }, [setFileContent, clearExternalModification]);

  useEffect(() => {
    if (!rootPath) return;

    let watchInterval: ReturnType<typeof setInterval> | null = null;

    const checkForChanges = async () => {
      const { openTabs } = useFileStore.getState();
      
      for (const tab of openTabs) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const currentContent = await invoke<string>('read_file', { path: tab.path });
          const storedContent = useFileStore.getState().fileContents.get(tab.path);
          
          if (storedContent !== undefined && currentContent !== storedContent) {
            setFileContent(tab.path, currentContent);
          }
        } catch {
        }
      }
    };

    watchInterval = setInterval(checkForChanges, 3000);

    return () => {
      if (watchInterval) {
        clearInterval(watchInterval);
      }
    };
  }, [rootPath, setFileContent]);

  return { refreshFile };
}
