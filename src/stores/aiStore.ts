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
  mode: AIMode;
}

export interface CustomModel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export type PlanPhase = 'explore' | 'design' | 'review' | 'ready' | 'clarify';

export type AgentStatus = 'idle' | 'running' | 'done';

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  type: 'read' | 'write' | 'build' | 'shell' | 'search' | 'info' | 'error' | 'done';
  message: string;
  details?: string;
}

interface AIState {
  mode: AIMode;
  activeProvider: string;
  providers: AIProvider[];
  customModels: CustomModel[];
  messages: AIMessage[];
  isLoading: boolean;

  planPhase: PlanPhase;
  planContent: string;
  isEditingPlan: boolean;
  planToApprove: string | null;

  agentStatus: AgentStatus;
  agentTask: string | null;
  agentActivityLog: ActivityLogEntry[];

  setMode: (mode: AIMode) => void;
  setActiveProvider: (id: string) => void;
  addProvider: (provider: AIProvider) => void;
  updateProvider: (id: string, updates: Partial<AIProvider>) => void;
  removeProvider: (id: string) => void;
  addCustomModel: (model: CustomModel) => void;
  removeCustomModel: (id: string) => void;
      addMessage: (message: Omit<AIMessage, 'id' | 'timestamp' | 'mode'>) => void;
  clearMessages: () => void;
  clearAllMessages: () => void;
  setLoading: (loading: boolean) => void;

  setPlanPhase: (phase: PlanPhase) => void;
  setPlanContent: (content: string) => void;
  setIsEditingPlan: (editing: boolean) => void;
  setPlanToApprove: (content: string | null) => void;

  setAgentStatus: (status: AgentStatus) => void;
  setAgentTask: (task: string | null) => void;
  addActivityLog: (entry: ActivityLogEntry) => void;
  clearActivityLog: () => void;
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
      messages: [],
      isLoading: false,

      planPhase: 'explore',
      planContent: '',
      isEditingPlan: false,
      planToApprove: null,

      agentStatus: 'idle',
      agentTask: null,
      agentActivityLog: [],

      setMode: (mode) => set({
        mode,
        planPhase: mode === 'plan' ? 'explore' : get().planPhase,
        isEditingPlan: false,
        planToApprove: null,
        agentStatus: mode === 'agent' ? 'idle' : get().agentStatus,
      }),

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
          mode,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        set((state) => ({ messages: [...state.messages, fullMessage] }));
      },

      clearMessages: () => set({ messages: [] }),

      clearAllMessages: () => set({ messages: [] }),

      setLoading: (loading) => set({ isLoading: loading }),

      setPlanPhase: (phase) => set({ planPhase: phase }),
      setPlanContent: (content) => set({ planContent: content }),
      setIsEditingPlan: (editing) => set({ isEditingPlan: editing }),
      setPlanToApprove: (content) => set({ planToApprove: content }),

      setAgentStatus: (status) => set({ agentStatus: status }),
      setAgentTask: (task) => set({ agentTask: task }),
      addActivityLog: (entry) => set((state) => ({
        agentActivityLog: [...state.agentActivityLog, entry],
      })),
      clearActivityLog: () => set({ agentActivityLog: [] }),
    }),
    {
      name: 'embedist-ai-store',
      partialize: (state) => ({
        mode: state.mode,
        activeProvider: state.activeProvider,
        messages: state.messages,
        customModels: state.customModels,
      }),
    }
  )
);
