import { create } from 'zustand';

export interface SerialPort {
  path: string;
  friendlyName?: string;
}

type SidebarSection = 'files' | 'ai' | 'serial' | 'build';
type BottomPanelTab = 'terminal' | 'ai' | 'build';

interface UIState {
  sidebarExpanded: boolean;
  sidebarSection: SidebarSection;
  sidebarWidth: number;

  bottomPanelHeight: number;
  bottomPanelVisible: boolean;
  bottomPanelTab: BottomPanelTab;

  serialConnected: boolean;
  serialPort: string | null;
  serialBaudRate: number;

  buildRunning: boolean;

  cursorLine: number;
  cursorColumn: number;

  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;
  setSidebarSection: (section: SidebarSection) => void;
  setSidebarWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
  toggleBottomPanel: () => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setSerialConnected: (connected: boolean) => void;
  setSerialPort: (port: string | null) => void;
  setSerialBaudRate: (rate: number) => void;
  setBuildRunning: (running: boolean) => void;
  setCursorPosition: (line: number, column: number) => void;

  navigateToFiles: () => void;
  navigateToAI: () => void;
  navigateToSerial: () => void;
  navigateToBuild: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarExpanded: false,
  sidebarSection: 'files',
  sidebarWidth: 360,

  bottomPanelHeight: 280,
  bottomPanelVisible: false,
  bottomPanelTab: 'terminal',

  serialConnected: false,
  serialPort: null,
  serialBaudRate: 115200,

  buildRunning: false,

  cursorLine: 1,
  cursorColumn: 1,

  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setSidebarSection: (section) => set({ sidebarSection: section }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),
  toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab, bottomPanelVisible: true }),
  setSerialConnected: (connected) => set({ serialConnected: connected }),
  setSerialPort: (port) => set({ serialPort: port }),
  setSerialBaudRate: (rate) => set({ serialBaudRate: rate }),
  setBuildRunning: (running) => set({ buildRunning: running }),
  setCursorPosition: (line, column) => set({ cursorLine: line, cursorColumn: column }),

  navigateToFiles: () => set({ sidebarSection: 'files' }),
  navigateToAI: () => set({ sidebarSection: 'ai', bottomPanelVisible: false }),
  navigateToSerial: () => set({ sidebarSection: 'serial', bottomPanelVisible: false }),
  navigateToBuild: () => set({ sidebarSection: 'build', bottomPanelVisible: true, bottomPanelTab: 'build' }),
}));
