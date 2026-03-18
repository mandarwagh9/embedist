import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  role: 'user' | 'assistant';
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
  activeProvider: string;
  providers: AIProvider[];
  customModels: CustomModel[];
  messages: AIMessage[];
  isLoading: boolean;
  
  setActiveProvider: (id: string) => void;
  addProvider: (provider: AIProvider) => void;
  updateProvider: (id: string, updates: Partial<AIProvider>) => void;
  removeProvider: (id: string) => void;
  addCustomModel: (model: CustomModel) => void;
  removeCustomModel: (id: string) => void;
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
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
    (set) => ({
      activeProvider: 'openai',
      providers: defaultProviders,
      customModels: [],
      messages: [],
      isLoading: false,

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
      
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        }],
      })),
      
      clearMessages: () => set({ messages: [] }),
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'embedist-ai-store',
    }
  )
);
