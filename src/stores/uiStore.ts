import { create } from 'zustand';

export interface Tab {
  id: string;
  title: string;
  path: string;
  modified: boolean;
}

export interface SerialPort {
  path: string;
  friendlyName?: string;
}

type SidebarSection = 'files' | 'ai' | 'serial' | 'build';
type BottomPanelTab = 'terminal' | 'ai' | 'build';

interface UIState {
  // Sidebar
  sidebarExpanded: boolean;
  sidebarSection: SidebarSection;
  sidebarWidth: number;
  
  // Tabs
  tabs: Tab[];
  activeTabId: string | null;
  
  // Panels
  bottomPanelHeight: number;
  bottomPanelVisible: boolean;
  bottomPanelTab: BottomPanelTab;
  
  // Serial
  serialConnected: boolean;
  serialPort: string | null;
  serialBaudRate: number;
  
  // Build
  buildRunning: boolean;
  
  // Cursor position
  cursorLine: number;
  cursorColumn: number;
  
  // Actions
  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;
  setSidebarSection: (section: SidebarSection) => void;
  setSidebarWidth: (width: number) => void;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setBottomPanelHeight: (height: number) => void;
  toggleBottomPanel: () => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setSerialConnected: (connected: boolean) => void;
  setSerialPort: (port: string | null) => void;
  setSerialBaudRate: (rate: number) => void;
  setBuildRunning: (running: boolean) => void;
  setCursorPosition: (line: number, column: number) => void;
  
  // Navigation actions
  navigateToFiles: () => void;
  navigateToAI: () => void;
  navigateToSerial: () => void;
  navigateToBuild: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  sidebarExpanded: false,
  sidebarSection: 'files',
  sidebarWidth: 360,
  
  // Tabs
  tabs: [],
  activeTabId: null,
  
  // Panels
  bottomPanelHeight: 280,
  bottomPanelVisible: false,
  bottomPanelTab: 'terminal',
  
  // Serial
  serialConnected: false,
  serialPort: null,
  serialBaudRate: 115200,
  
  // Build
  buildRunning: false,
  
  // Cursor position
  cursorLine: 1,
  cursorColumn: 1,
  
  // Actions
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setSidebarSection: (section) => set({ sidebarSection: section }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  
  openTab: (tab) => set((state) => {
    const exists = state.tabs.find(t => t.path === tab.path);
    if (exists) {
      return { activeTabId: exists.id };
    }
    return {
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    };
  }),
  
  closeTab: (id) => set((state) => {
    const newTabs = state.tabs.filter(t => t.id !== id);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === id) {
      const idx = state.tabs.findIndex(t => t.id === id);
      newActiveId = newTabs[Math.max(0, idx - 1)]?.id || null;
    }
    return { tabs: newTabs, activeTabId: newActiveId };
  }),
  
  setActiveTab: (id) => set({ activeTabId: id }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),
  toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab, bottomPanelVisible: true }),
  setSerialConnected: (connected) => set({ serialConnected: connected }),
  setSerialPort: (port) => set({ serialPort: port }),
  setSerialBaudRate: (rate) => set({ serialBaudRate: rate }),
  setBuildRunning: (running) => set({ buildRunning: running }),
  setCursorPosition: (line, column) => set({ cursorLine: line, cursorColumn: column }),
  
  // Navigation actions
  navigateToFiles: () => set({ sidebarSection: 'files' }),
  navigateToAI: () => set({ sidebarSection: 'ai', bottomPanelVisible: false }),
  navigateToSerial: () => set({ sidebarSection: 'serial', bottomPanelVisible: false }),
  navigateToBuild: () => set({ sidebarSection: 'build', bottomPanelVisible: true, bottomPanelTab: 'build' }),
}));
