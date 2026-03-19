import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIMode } from '../lib/ai-prompts';

export interface AIProvider {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  models: string[];
  apiKey?: string;
  baseUrl?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface CustomModel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

interface AIState {
  mode: AIMode;
  activeProvider: string;
  providers: AIProvider[];
  customModels: CustomModel[];
  chatMessages: AIMessage[];
  planMessages: AIMessage[];
  debugMessages: AIMessage[];
  isLoading: boolean;
  
  setMode: (mode: AIMode) => void;
  setActiveProvider: (id: string) => void;
  addProvider: (provider: AIProvider) => void;
  updateProvider: (id: string, updates: Partial<AIProvider>) => void;
  removeProvider: (id: string) => void;
  addCustomModel: (model: CustomModel) => void;
  removeCustomModel: (id: string) => void;
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  clearAllMessages: () => void;
  setLoading: (loading: boolean) => void;
  
  getMessages: () => AIMessage[];
  getMessageCount: (mode: AIMode) => number;
  getOtherModesWithMessages: () => Array<{ mode: AIMode; count: number }>;
}

const defaultProviders: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'cloud',
    models: ['claude-3-5-sonnet-20241014', 'claude-3-opus-20240229'],
  },
  {
    id: 'google',
    name: 'Google',
    type: 'cloud',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'cloud',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    type: 'local',
    models: ['llama3.2', 'mistral', 'qwen', 'phi'],
    baseUrl: 'http://localhost:11434/v1',
  },
];

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      mode: 'chat',
      activeProvider: 'openai',
      providers: defaultProviders,
      customModels: [],
      chatMessages: [],
      planMessages: [],
      debugMessages: [],
      isLoading: false,

      setMode: (mode) => set({ mode }),

      setActiveProvider: (id) => set({ activeProvider: id }),
      
      addProvider: (provider) => set((state) => ({
        providers: [...state.providers, provider],
      })),
      
      updateProvider: (id, updates) => set((state) => ({
        providers: state.providers.map(p =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),
      
      removeProvider: (id) => set((state) => ({
        providers: state.providers.filter(p => p.id !== id),
        activeProvider: state.activeProvider === id ? 'openai' : state.activeProvider,
      })),
      
      addCustomModel: (model) => set((state) => ({
        customModels: [...state.customModels, model],
      })),
      
      removeCustomModel: (id) => set((state) => ({
        customModels: state.customModels.filter(m => m.id !== id),
      })),
      
      addMessage: (message) => {
        const { mode } = get();
        const fullMessage: AIMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        
        set((state) => ({
          chatMessages: mode === 'chat' ? [...state.chatMessages, fullMessage] : state.chatMessages,
          planMessages: mode === 'plan' ? [...state.planMessages, fullMessage] : state.planMessages,
          debugMessages: mode === 'debug' ? [...state.debugMessages, fullMessage] : state.debugMessages,
        }));
      },
      
      clearMessages: () => {
        const { mode } = get();
        set((state) => ({
          chatMessages: mode === 'chat' ? [] : state.chatMessages,
          planMessages: mode === 'plan' ? [] : state.planMessages,
          debugMessages: mode === 'debug' ? [] : state.debugMessages,
        }));
      },

      clearAllMessages: () => set({
        chatMessages: [],
        planMessages: [],
        debugMessages: [],
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),

      getMessages: () => {
        const { mode, chatMessages, planMessages, debugMessages } = get();
        switch (mode) {
          case 'plan': return planMessages;
          case 'debug': return debugMessages;
          default: return chatMessages;
        }
      },

      getMessageCount: (mode: AIMode) => {
        const { chatMessages, planMessages, debugMessages } = get();
        switch (mode) {
          case 'plan': return planMessages.length;
          case 'debug': return debugMessages.length;
          default: return chatMessages.length;
        }
      },

      getOtherModesWithMessages: () => {
        const { mode, chatMessages, planMessages, debugMessages } = get();
        const others: Array<{ mode: AIMode; count: number }> = [];
        
        if (mode !== 'chat' && chatMessages.length > 0) {
          others.push({ mode: 'chat', count: chatMessages.length });
        }
        if (mode !== 'plan' && planMessages.length > 0) {
          others.push({ mode: 'plan', count: planMessages.length });
        }
        if (mode !== 'debug' && debugMessages.length > 0) {
          others.push({ mode: 'debug', count: debugMessages.length });
        }
        
        return others;
      },
    }),
    {
      name: 'embedist-ai-store',
      partialize: (state) => ({
        mode: state.mode,
        activeProvider: state.activeProvider,
        chatMessages: state.chatMessages,
        planMessages: state.planMessages,
        debugMessages: state.debugMessages,
      }),
    }
  )
);
