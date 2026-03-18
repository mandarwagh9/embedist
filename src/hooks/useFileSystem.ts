import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useFileStore, FileNode } from '../stores/fileStore';

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
      const entries = await invoke<FileEntry[]>('list_directory', { path });
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
    return listDirectory(node.path);
  }, [listDirectory]);

  const refreshDirectory = useCallback(async (path: string) => {
    const entries = await listDirectory(path);
    
    const updateInTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, children: entries };
        }
        if (node.children) {
          return { ...node, children: updateInTree(node.children) };
        }
        return node;
      });
    };
    
    const rootEntries = await listDirectory(rootPath || path);
    setFiles(rootEntries);
  }, [listDirectory, rootPath, setFiles]);

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
        const isPIO = await invoke<boolean>('is_platformio_project', { path: selected });
        setIsPlatformIOProject(isPIO);
        
        let board: string | null = null;
        if (isPIO) {
          try {
            board = await invoke<string>('read_platformio_board', { path: selected });
            setDetectedBoard(board);
          } catch {
            board = null;
          }
        }
        
        setRootPath(selected);
        
        const entries = await listDirectory(selected);
        setFiles(entries);
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
      const content = await invoke<string>('read_file', { path });
      openFile(path, content);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [openFile]);

  const createNewFile = useCallback(async (parentPath: string, name: string) => {
    try {
      const newPath = await invoke<string>('create_file', { parent: parentPath, name });
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
      const newPath = await invoke<string>('create_folder', { parent: parentPath, name });
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
      await invoke('delete_path', { path });
      const parentPath = await invoke<string | null>('get_parent_dir', { path });
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
      const newPath = await invoke<string>('rename_path', { oldPath, newName });
      const parentPath = await invoke<string | null>('get_parent_dir', { oldPath });
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

  const readFileContent = useCallback(async (path: string): Promise<string | null> => {
    try {
      return await invoke<string>('read_file', { path });
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
    saveFile,
    saveAllFiles,
    listDirectory,
    loadChildren,
    refreshDirectory,
    toggleExpanded,
    readFileContent,
  };
}
