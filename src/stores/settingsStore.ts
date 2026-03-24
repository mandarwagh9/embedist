import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProviderConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface SettingsState {
  isOpen: boolean;
  activeSection: string;
  providers: {
    openai: ProviderConfig;
    anthropic: ProviderConfig;
    google: ProviderConfig;
    deepseek: ProviderConfig;
    ollama: ProviderConfig;
    custom: ProviderConfig;
  };
  customEndpoints: Array<{
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
  }>;
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    theme: 'embedist-dark' | 'vs-dark' | 'light';
    autoSave: boolean;
    autoSaveDelay: number;
  };
  serial: {
    baudRate: number;
    lineEnding: 'CR' | 'LF' | 'CRLF';
    autoScroll: boolean;
  };
  build: {
    platformioPath: string;
    defaultBoard: string;
    uploadSpeed: number;
  };
  defaultImplementationMode: 'chat' | 'agent';
  aiParameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  open: () => void;
  close: () => void;
  setActiveSection: (section: string) => void;
  updateProvider: (provider: string, config: Partial<ProviderConfig>) => void;
  addCustomEndpoint: (endpoint: { id?: string; name: string; baseUrl: string; apiKey: string; model: string }) => void;
  removeCustomEndpoint: (id: string) => void;
  updateEditor: (config: Partial<SettingsState['editor']>) => void;
  updateSerial: (config: Partial<SettingsState['serial']>) => void;
  updateBuild: (config: Partial<SettingsState['build']>) => void;
  setDefaultImplementationMode: (mode: 'chat' | 'agent') => void;
  updateAiParameters: (config: Partial<SettingsState['aiParameters']>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isOpen: false,
      activeSection: 'ai',
      providers: {
        openai: { apiKey: '', model: 'gpt-4o-mini', enabled: true },
        anthropic: { apiKey: '', model: 'claude-3-5-sonnet-20241014', enabled: false },
        google: { apiKey: '', model: 'gemini-2.0-flash', enabled: false },
        deepseek: { apiKey: '', model: 'deepseek-chat', enabled: false },
        ollama: { apiKey: '', model: 'llama3.2', enabled: false },
        custom: { apiKey: '', model: '', enabled: false },
      },
      customEndpoints: [],
      editor: {
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        tabSize: 4,
        wordWrap: false,
        minimap: true,
        theme: 'embedist-dark',
        autoSave: false,
        autoSaveDelay: 2000,
      },
      serial: {
        baudRate: 115200,
        lineEnding: 'CRLF',
        autoScroll: true,
      },
      build: {
        platformioPath: 'pio',
        defaultBoard: 'esp32dev',
        uploadSpeed: 921600,
      },
      defaultImplementationMode: 'agent',
      aiParameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1.0,
      },

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setActiveSection: (section) => set({ activeSection: section }),

      updateProvider: (provider, config) => set((state) => ({
        providers: {
          ...state.providers,
          [provider]: { ...state.providers[provider as keyof typeof state.providers], ...config },
        },
      })),

      addCustomEndpoint: (endpoint) => set((state) => ({
        customEndpoints: [
          ...state.customEndpoints,
          { ...endpoint, id: `custom-${Date.now()}` },
        ],
      })),

      removeCustomEndpoint: (id) => set((state) => ({
        customEndpoints: state.customEndpoints.filter((e) => e.id !== id),
      })),

      updateEditor: (config) => set((state) => ({
        editor: { ...state.editor, ...config },
      })),

      updateSerial: (config) => set((state) => ({
        serial: { ...state.serial, ...config },
      })),

      updateBuild: (config) => set((state) => ({
        build: { ...state.build, ...config },
      })),

      setDefaultImplementationMode: (mode) => set({ defaultImplementationMode: mode }),

      updateAiParameters: (config) => set((state) => ({
        aiParameters: { ...state.aiParameters, ...config },
      })),
    }),
    { name: 'embedist-settings' }
  )
);
