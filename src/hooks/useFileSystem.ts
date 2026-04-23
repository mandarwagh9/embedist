import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useFileStore, FileNode } from '../stores/fileStore';
import { ragEngine } from '../lib/rag';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_file: boolean;
  size: number;
  modified?: number;
}

export function useFileSystem() {
  const {
    rootPath,
    files,
    setRootPath,
    setFiles,
    setNodeChildren,
    toggleExpanded,
    openFile,
    saveFile,
    saveAllFiles,
    setIsPlatformIOProject,
    setDetectedBoard,
  } = useFileStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listDirectory = useCallback(async (path: string): Promise<FileNode[]> => {
    try {
      const root = useFileStore.getState().rootPath;
      const entries = await invoke<FileEntry[]>('list_directory', { path, root });
      return entries.map(entry => ({
        id: entry.path,
        name: entry.name,
        path: entry.path,
        isDir: entry.is_dir,
        isFile: entry.is_file,
        size: entry.size,
        modified: entry.modified,
        expanded: false,
        children: entry.is_dir ? [] : undefined,
      }));
    } catch (err) {
      console.error('Failed to list directory:', err);
      return [];
    }
  }, []);

  const loadChildren = useCallback(async (node: FileNode): Promise<FileNode[]> => {
    if (!node.isDir) return [];
    const children = await listDirectory(node.path);
    useFileStore.getState().setNodeChildren(node.path, children);
    return children;
  }, [listDirectory]);

  const refreshRoot = useCallback(async () => {
    const { rootPath: rp, files: currentFiles } = useFileStore.getState();
    if (!rp) return;
    const entries = await listDirectory(rp);
    const merged = entries.map(entry => {
      const existing = currentFiles.find(f => f.path === entry.path);
      if (existing) {
        return {
          ...entry,
          expanded: existing.expanded,
          children: existing.children,
        };
      }
      return entry;
    });
    setFiles(merged);
    const name = rp.replace(/\\/g, '/').split('/').pop() || 'project';
    ragEngine.indexProject(merged, name);
  }, [listDirectory, setFiles]);

  const refreshDirectory = useCallback(async (path: string) => {
    try {
      if (path === useFileStore.getState().rootPath) {
        await refreshRoot();
        return;
      }
      const entries = await listDirectory(path);
      setNodeChildren(path, entries);
    } catch (err) {
      console.warn('Failed to refresh directory:', err);
      const { files, setFiles } = useFileStore.getState();
      const filtered = files.filter(f => f.path !== path && !f.path.startsWith(path + '/'));
      setFiles(filtered);
    }
  }, [listDirectory, refreshRoot, setNodeChildren]);

  const openFolder = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Open Folder',
      });

      if (selected && typeof selected === 'string') {
        setRootPath(selected);

        const entries = await listDirectory(selected);
        setFiles(entries);
        
        const name = selected.replace(/\\/g, '/').split('/').pop() || 'project';
        ragEngine.indexProject(entries, name);

        invoke<boolean>('is_platformio_project', { path: selected, root: selected })
          .then((isPIO) => {
            setIsPlatformIOProject(isPIO);
            if (isPIO) {
              invoke<string>('read_platformio_board', { path: selected, root: selected })
                .then((board) => setDetectedBoard(board))
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [listDirectory, setFiles, setRootPath, setIsPlatformIOProject, setDetectedBoard]);

  const openFileInEditor = useCallback(async (path: string) => {
    try {
      const root = useFileStore.getState().rootPath;
      const content = await invoke<string>('read_file', { path, root });
      openFile(path, content);
      ragEngine.addProjectFileContent(path, content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [openFile]);

  const createNewFile = useCallback(async (parentPath: string, name: string) => {
    try {
      const root = useFileStore.getState().rootPath;
      const newPath = await invoke<string>('create_file', { parent: parentPath, name, root });
      await refreshDirectory(parentPath);
      return newPath;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    }
  }, [refreshDirectory]);

  const createNewFolder = useCallback(async (parentPath: string, name: string) => {
    try {
      const root = useFileStore.getState().rootPath;
      const newPath = await invoke<string>('create_folder', { parent: parentPath, name, root });
      await refreshDirectory(parentPath);
      return newPath;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    }
  }, [refreshDirectory]);

  const deleteItem = useCallback(async (path: string) => {
    try {
      const root = useFileStore.getState().rootPath;
      await invoke('delete_path', { path, root });
      const state = useFileStore.getState();
      const tabToDelete = state.openTabs.find(t => t.path === path);
      if (tabToDelete) {
        state.closeTab(tabToDelete.id);
      }
      const newContents = new Map(state.fileContents);
      const newOriginal = new Map(state.originalContents);
      newContents.delete(path);
      newOriginal.delete(path);
      useFileStore.setState({ fileContents: newContents, originalContents: newOriginal });
      const parentPath = await invoke<string | null>('get_parent_dir', { path, root });
      if (parentPath) {
        await refreshDirectory(parentPath);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return false;
    }
  }, [refreshDirectory]);

  const renameItem = useCallback(async (oldPath: string, newName: string) => {
    try {
      const root = useFileStore.getState().rootPath;
      const newPath = await invoke<string>('rename_path', { oldPath, newName, root });
      const { openTabs, fileContents, originalContents, closeTab, openFile } = useFileStore.getState();
      const oldTab = openTabs.find(t => t.path === oldPath);
      if (oldTab) {
        const content = fileContents.get(oldPath);
        const original = originalContents.get(oldPath);
        closeTab(oldPath);
        if (content !== undefined) {
          openFile(newPath, content);
          if (original !== undefined) {
            useFileStore.setState((state) => ({
              originalContents: new Map(state.originalContents).set(newPath, original),
            }));
          }
        }
      }
      const parentPath = await invoke<string | null>('get_parent_dir', { path: oldPath, root });
      if (parentPath) {
        await refreshDirectory(parentPath);
      }
      return newPath;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    }
  }, [refreshDirectory]);

  const copyPath = useCallback(async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to textarea:', err);
      const textarea = document.createElement('textarea');
      textarea.value = path;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
      return true;
    }
  }, []);

  const revealInExplorer = useCallback(async (path: string) => {
    try {
      const root = useFileStore.getState().rootPath;
      await invoke('reveal_in_explorer', { path, root });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return false;
    }
  }, []);

  const readFileContent = useCallback(async (path: string): Promise<string | null> => {
    try {
      const root = useFileStore.getState().rootPath;
      return await invoke<string>('read_file', { path, root });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    }
  }, []);

  return {
    rootPath,
    files,
    isLoading,
    error,
    openFolder,
    openFileInEditor,
    createNewFile,
    createNewFolder,
    deleteItem,
    renameItem,
    copyPath,
    revealInExplorer,
    saveFile,
    saveAllFiles,
    listDirectory,
    loadChildren,
    refreshDirectory,
    refreshRoot,
    toggleExpanded,
    readFileContent,
  };
}
