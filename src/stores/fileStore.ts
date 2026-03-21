import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  isFile: boolean;
  size: number;
  modified?: number;
  children?: FileNode[];
  expanded?: boolean;
}

export interface OpenTab {
  id: string;
  title: string;
  path: string;
  modified: boolean;
  pinned: boolean;
  content?: string;
}

export interface RecentFile {
  path: string;
  name: string;
  timestamp: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetPath: string | null;
  targetNode: FileNode | null;
}

interface FileState {
  rootPath: string | null;
  projectName: string | null;
  files: FileNode[];
  openTabs: OpenTab[];
  activeTabId: string | null;
  fileContents: Map<string, string>;
  originalContents: Map<string, string>;
  isPlatformIOProject: boolean;
  detectedBoard: string | null;

  selectedPaths: string[];
  recentFiles: RecentFile[];
  searchQuery: string;
  contextMenu: ContextMenuState;
  renamingPath: string | null;
  hoveredPath: string | null;
  loadingPaths: string[];

  setRootPath: (path: string | null) => void;
  setFiles: (files: FileNode[]) => void;
  updateFileNode: (path: string, updates: Partial<FileNode>) => void;
  setNodeChildren: (path: string, children: FileNode[]) => void;
  toggleExpanded: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  openFile: (path: string, content?: string) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (keepId: string) => void;
  closeTabsToRight: (fromId: string) => void;
  closeAllTabs: () => void;
  pinTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  setFileContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  saveAllFiles: () => Promise<void>;
  markSaved: (path: string) => void;

  setIsPlatformIOProject: (isPIO: boolean) => void;
  setDetectedBoard: (board: string | null) => void;

  selectPath: (path: string, multi?: boolean) => void;
  deselectPath: (path: string) => void;
  clearSelection: () => void;
  selectRange: (toPath: string) => void;

  addRecentFile: (path: string, name: string) => void;
  clearRecentFiles: () => void;

  setSearchQuery: (query: string) => void;

  openContextMenu: (x: number, y: number, path: string, node: FileNode) => void;
  closeContextMenu: () => void;

  startRenaming: (path: string) => void;
  stopRenaming: () => void;

  setHoveredPath: (path: string | null) => void;

  addLoadingPath: (path: string) => void;
  removeLoadingPath: (path: string) => void;

  getAllNodes: () => FileNode[];
  getNodeByPath: (path: string) => FileNode | null;
  getParentPath: (path: string) => string | null;
}

const traverseTree = (nodes: FileNode[], fn: (node: FileNode) => void): FileNode[] => {
  return nodes.map(node => {
    fn(node);
    if (node.children) {
      return { ...node, children: traverseTree(node.children, fn) };
    }
    return node;
  });
};

const findNode = (nodes: FileNode[], path: string): FileNode | null => {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
};

const collectAllNodes = (nodes: FileNode[]): FileNode[] => {
  const result: FileNode[] = [];
  const collect = (list: FileNode[]) => {
    for (const node of list) {
      result.push(node);
      if (node.children) collect(node.children);
    }
  };
  collect(nodes);
  return result;
};

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      rootPath: null,
      projectName: null,
      files: [],
      openTabs: [],
      activeTabId: null,
      fileContents: new Map(),
      originalContents: new Map(),
      isPlatformIOProject: false,
      detectedBoard: null,

      selectedPaths: [],
      recentFiles: [],
      searchQuery: '',
      contextMenu: { visible: false, x: 0, y: 0, targetPath: null, targetNode: null },
      renamingPath: null,
      hoveredPath: null,
      loadingPaths: [],

      setRootPath: (path) => {
        if (path) {
          const parts = path.replace(/\\/g, '/').split('/');
          const name = parts[parts.length - 1] || parts[parts.length - 2];
          set({ rootPath: path, projectName: name, selectedPaths: [], searchQuery: '' });
        } else {
          set({ rootPath: null, projectName: null, files: [], isPlatformIOProject: false, detectedBoard: null, selectedPaths: [], searchQuery: '', loadingPaths: [] });
        }
      },

      setFiles: (files) => set({ files }),

      updateFileNode: (path, updates) => {
        set(state => {
          const updateNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
              if (node.path === path) {
                return { ...node, ...updates };
              }
              if (node.children) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          };
          return { files: updateNode(state.files) };
        });
      },

      setNodeChildren: (path, children) => {
        set(state => {
          const updateNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
              if (node.path === path) {
                return { ...node, children, expanded: true };
              }
              if (node.children) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          };
          return { files: updateNode(state.files) };
        });
      },

      toggleExpanded: (path) => {
        set(state => {
          const updateNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
              if (node.path === path) {
                return { ...node, expanded: !node.expanded };
              }
              if (node.children) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          };
          return { files: updateNode(state.files) };
        });
      },

      expandAll: () => {
        set(state => ({
          files: traverseTree(state.files, node => {
            if (node.isDir) node.expanded = true;
          })
        }));
      },

      collapseAll: () => {
        set(state => ({
          files: traverseTree(state.files, node => {
            if (node.isDir) node.expanded = false;
          })
        }));
      },

      openFile: (path, content) => {
        const state = get();
        const existing = state.openTabs.find(t => t.path === path);

        if (existing) {
          const fileContent = state.fileContents.get(path) ?? content ?? '';
          const updates: Record<string, unknown> = {
            activeTabId: existing.id,
            openTabs: state.openTabs.map(t =>
              t.id === existing.id ? { ...t, content: fileContent } : t
            ),
          };
          if (content !== undefined) {
            updates.fileContents = new Map(state.fileContents).set(path, content);
            updates.originalContents = new Map(state.originalContents).set(path, content);
          }
          set(updates);
          const parts = path.replace(/\\/g, '/').split('/');
          const name = parts[parts.length - 1];
          get().addRecentFile(path, name);
          return;
        }

        const parts = path.replace(/\\/g, '/').split('/');
        const title = parts[parts.length - 1];
        const id = `tab-${crypto.randomUUID()}`;

        const newTab: OpenTab = {
          id,
          title,
          path,
          modified: false,
          pinned: false,
          content: content || '',
        };

        const newContents = new Map(state.fileContents);
        const newOriginal = new Map(state.originalContents);

        if (content !== undefined) {
          newContents.set(path, content);
          newOriginal.set(path, content);
        }

        set({
          openTabs: [...state.openTabs, newTab],
          activeTabId: id,
          fileContents: newContents,
          originalContents: newOriginal,
        });

        get().addRecentFile(path, title);
      },

      closeTab: (id) => {
        const state = get();
        const tabIndex = state.openTabs.findIndex(t => t.id === id);
        const tab = state.openTabs[tabIndex];
        const newTabs = state.openTabs.filter(t => t.id !== id);

        let newActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          if (newTabs.length > 0) {
            const newIndex = Math.min(tabIndex, newTabs.length - 1);
            newActiveId = newTabs[newIndex].id;
          } else {
            newActiveId = null;
          }
        }

        const newFileContents = new Map(state.fileContents);
        const newOriginalContents = new Map(state.originalContents);
        if (tab) {
          newFileContents.delete(tab.path);
          newOriginalContents.delete(tab.path);
        }

        set({ openTabs: newTabs, activeTabId: newActiveId, fileContents: newFileContents, originalContents: newOriginalContents });
      },

      closeOtherTabs: (keepId) => {
        const state = get();
        const keepTab = state.openTabs.find(t => t.id === keepId);

        if (keepTab) {
          const newContents = new Map();
          const newOriginal = new Map();
          newContents.set(keepTab.path, state.fileContents.get(keepTab.path) || '');
          newOriginal.set(keepTab.path, state.originalContents.get(keepTab.path) || '');

          set({
            openTabs: [keepTab],
            activeTabId: keepId,
            fileContents: newContents,
            originalContents: newOriginal,
          });
        }
      },

      closeTabsToRight: (fromId) => {
        const state = get();
        const fromIndex = state.openTabs.findIndex(t => t.id === fromId);

        if (fromIndex >= 0) {
          const keepTabs = state.openTabs.slice(0, fromIndex + 1);

          const newContents = new Map();
          const newOriginal = new Map();
          for (const tab of keepTabs) {
            const content = state.fileContents.get(tab.path);
            const original = state.originalContents.get(tab.path);
            if (content !== undefined) newContents.set(tab.path, content);
            if (original !== undefined) newOriginal.set(tab.path, original);
          }

          set({
            openTabs: keepTabs,
            fileContents: newContents,
            originalContents: newOriginal,
          });
        }
      },

      closeAllTabs: () => {
        set({
          openTabs: [],
          activeTabId: null,
          fileContents: new Map(),
          originalContents: new Map(),
        });
      },

      pinTab: (id) => {
        set(state => ({
          openTabs: state.openTabs.map(t =>
            t.id === id ? { ...t, pinned: !t.pinned } : t
          ),
        }));
      },

      setActiveTab: (id) => set({ activeTabId: id }),

      setFileContent: (path, content) => {
        const state = get();
        const newContents = new Map(state.fileContents);
        const original = state.originalContents.get(path);
        const isModified = original !== undefined && content !== original;

        newContents.set(path, content);

        set({
          fileContents: newContents,
          openTabs: state.openTabs.map(t =>
            t.path === path ? { ...t, modified: isModified } : t
          ),
        });
      },

      saveFile: async (path) => {
        const content = get().fileContents.get(path);
        if (content === undefined) return;

        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('write_file', { path, content });

        const newOriginal = new Map(get().originalContents);
        newOriginal.set(path, content);

        set(state => ({
          originalContents: newOriginal,
          openTabs: state.openTabs.map(t =>
            t.path === path ? { ...t, modified: false } : t
          ),
        }));
      },

      saveAllFiles: async () => {
        const state = get();
        for (const tab of state.openTabs) {
          if (tab.modified) {
            await get().saveFile(tab.path);
          }
        }
      },

      markSaved: (path) => {
        const newOriginal = new Map(get().originalContents);
        const content = get().fileContents.get(path);
        if (content !== undefined) {
          newOriginal.set(path, content);
        }

        set(state => ({
          originalContents: newOriginal,
          openTabs: state.openTabs.map(t =>
            t.path === path ? { ...t, modified: false } : t
          ),
        }));
      },

      setIsPlatformIOProject: (isPIO) => set({ isPlatformIOProject: isPIO }),
      setDetectedBoard: (board) => set({ detectedBoard: board }),

      selectPath: (path, multi = false) => {
        const state = get();
        if (multi) {
          const already = state.selectedPaths.includes(path);
          if (already) {
            set({ selectedPaths: state.selectedPaths.filter(p => p !== path) });
          } else {
            set({ selectedPaths: [...state.selectedPaths, path] });
          }
        } else {
          set({ selectedPaths: [path] });
        }
      },

      deselectPath: (path) => {
        set(state => ({
          selectedPaths: state.selectedPaths.filter(p => p !== path)
        }));
      },

      clearSelection: () => {
        set({ selectedPaths: [] });
      },

      selectRange: (toPath) => {
        const state = get();
        const allNodes = collectAllNodes(state.files);
        const lastSelected = state.selectedPaths[state.selectedPaths.length - 1];
        if (!lastSelected) {
          set({ selectedPaths: [toPath] });
          return;
        }

        const lastIdx = allNodes.findIndex(n => n.path === lastSelected);
        const toIdx = allNodes.findIndex(n => n.path === toPath);
        if (lastIdx === -1 || toIdx === -1) return;

        const [from, to] = lastIdx < toIdx ? [lastIdx, toIdx] : [toIdx, lastIdx];
        const range = allNodes.slice(from, to + 1);
        const rangePaths = range.map(n => n.path);

        set({ selectedPaths: [...new Set([...state.selectedPaths, ...rangePaths])] });
      },

      addRecentFile: (path, name) => {
        set(state => {
          const filtered = state.recentFiles.filter(f => f.path !== path);
          const updated = [
            { path, name, timestamp: Date.now() },
            ...filtered,
          ].slice(0, 10);
          return { recentFiles: updated };
        });
      },

      clearRecentFiles: () => set({ recentFiles: [] }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      openContextMenu: (x, y, path, node) => {
        set({ contextMenu: { visible: true, x, y, targetPath: path, targetNode: node } });
      },

      closeContextMenu: () => {
        set(state => ({ contextMenu: { ...state.contextMenu, visible: false } }));
      },

      startRenaming: (path) => set({ renamingPath: path }),
      stopRenaming: () => set({ renamingPath: null }),

      setHoveredPath: (path) => set({ hoveredPath: path }),

      addLoadingPath: (path) => {
        set(state => ({
          loadingPaths: state.loadingPaths.includes(path)
            ? state.loadingPaths
            : [...state.loadingPaths, path],
        }));
      },

      removeLoadingPath: (path) => {
        set(state => ({
          loadingPaths: state.loadingPaths.filter(p => p !== path),
        }));
      },

      getAllNodes: () => collectAllNodes(get().files),

      getNodeByPath: (path) => findNode(get().files, path),

      getParentPath: (path) => {
        const parts = path.replace(/\\/g, '/').split('/');
        parts.pop();
        return parts.join('/') || null;
      },
    }),
    {
      name: 'embedist-file-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const savedFileContents = (state as unknown as { fileContents?: Record<string, string> }).fileContents;
          const savedOriginalContents = (state as unknown as { originalContents?: Record<string, string> }).originalContents;
          if (savedFileContents) {
            state.fileContents = new Map(Object.entries(savedFileContents));
          }
          if (savedOriginalContents) {
            state.originalContents = new Map(Object.entries(savedOriginalContents));
          }
          if (state.openTabs.length > 0) {
            for (const tab of state.openTabs) {
              const content = state.fileContents.get(tab.path);
              if (content !== undefined) {
                (tab as { content?: string }).content = content;
              }
            }
          }
        }
      },
      partialize: (state) => ({
        rootPath: state.rootPath,
        projectName: state.projectName,
        openTabs: state.openTabs,
        activeTabId: state.activeTabId,
        recentFiles: state.recentFiles,
        files: state.files,
        isPlatformIOProject: state.isPlatformIOProject,
        detectedBoard: state.detectedBoard,
        fileContents: Object.fromEntries(state.fileContents),
        originalContents: Object.fromEntries(state.originalContents),
      }),
    }
  )
);
