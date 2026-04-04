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
  feedback?: 'positive' | 'negative';
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CustomModel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export type PlanPhase = 'explore' | 'design' | 'review' | 'ready' | 'clarify';

export type PlanExplorerMode = 'idle' | 'exploring' | 'planning';

export type AgentStatus = 'idle' | 'running' | 'done';

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  type: 'read' | 'write' | 'build' | 'shell' | 'search' | 'info' | 'error' | 'done';
  message: string;
  details?: string;
}

export interface ToolProgress {
  toolId: string;
  toolName: string;
  stage: 'starting' | 'running' | 'complete' | 'error';
  message: string;
  percent?: number;
  elapsedMs?: number;
}

export interface PendingPermission {
  toolName: string;
  toolDescription: string;
  arguments: string;
}

interface AIState {
  mode: AIMode;
  activeProvider: string;
  providers: AIProvider[];
  customModels: CustomModel[];
  messages: AIMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  lastAssistantMessageId: string | null;

  planPhase: PlanPhase;
  planContent: string;
  isEditingPlan: boolean;
  planToApprove: string | null;
  planExplorerMode: PlanExplorerMode;
  selectedFiles: string[];

  agentStatus: AgentStatus;
  agentTask: string | null;
  agentActivityLog: ActivityLogEntry[];
  agentRunInBackground: boolean;
  toolProgress: ToolProgress | null;
  pendingPermission: PendingPermission | null;
  showPermissionDialog: boolean;
  lastPermissionDecision: 'allow' | 'deny' | 'allowAll' | 'denyAll' | null;

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
  setStreaming: (streaming: boolean, content?: string) => void;
  appendStreamingContent: (content: string) => void;
  setMessageFeedback: (id: string, feedback: 'positive' | 'negative' | undefined) => void;

  setPlanPhase: (phase: PlanPhase) => void;
  setPlanContent: (content: string) => void;
  setIsEditingPlan: (editing: boolean) => void;
  setPlanToApprove: (content: string | null) => void;
  setPlanExplorerMode: (mode: PlanExplorerMode) => void;
  toggleSelectedFile: (path: string) => void;
  clearSelectedFiles: () => void;

  setAgentStatus: (status: AgentStatus) => void;
  setAgentTask: (task: string | null) => void;
  setAgentRunInBackground: (runInBackground: boolean) => void;
  setToolProgress: (progress: ToolProgress | null) => void;
  setPendingPermission: (permission: PendingPermission | null) => void;
  setShowPermissionDialog: (show: boolean) => void;
  setPermissionDecision: (decision: 'allow' | 'deny' | 'allowAll' | 'denyAll' | null) => void;
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
      isStreaming: false,
      streamingContent: '',
      lastAssistantMessageId: null,

      planPhase: 'explore',
      planContent: '',
      isEditingPlan: false,
      planToApprove: null,
      planExplorerMode: 'idle' as PlanExplorerMode,
      selectedFiles: [],

      agentStatus: 'idle',
      agentTask: null,
      agentActivityLog: [],
      agentRunInBackground: false,
      toolProgress: null,
      pendingPermission: null,
      showPermissionDialog: false,
      lastPermissionDecision: null,

      setMode: (mode) => set({
        mode,
        planPhase: mode === 'plan' ? 'explore' : get().planPhase,
        isEditingPlan: false,
        planToApprove: null,
        agentStatus: mode === 'agent' ? 'idle' : get().agentStatus,
        agentTask: mode === 'agent' ? null : get().agentTask,
        agentActivityLog: mode === 'agent' ? [] : get().agentActivityLog,
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
        const id = `msg-${crypto.randomUUID()}`;
        const fullMessage: AIMessage = {
          ...message,
          mode,
          id,
          timestamp: Date.now(),
        };
        set((state) => ({
          messages: [...state.messages, fullMessage],
          lastAssistantMessageId: message.role === 'assistant' ? id : state.lastAssistantMessageId,
        }));
      },

      clearMessages: () => set({ messages: [] }),

      clearAllMessages: () => set({ messages: [] }),

      setLoading: (loading) => set({ isLoading: loading }),

      setStreaming: (streaming, content = '') => set({
        isStreaming: streaming,
        streamingContent: content,
      }),

      appendStreamingContent: (content) => set((state) => ({
        streamingContent: state.streamingContent + content,
      })),

      setMessageFeedback: (id, feedback) => set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, feedback } : m
        ),
      })),

      setPlanPhase: (phase) => set({ planPhase: phase }),
      setPlanContent: (content) => set({ planContent: content }),
      setIsEditingPlan: (editing) => set({ isEditingPlan: editing }),
      setPlanToApprove: (content) => set({ planToApprove: content }),
      setPlanExplorerMode: (mode) => set({ planExplorerMode: mode }),
      toggleSelectedFile: (path) => set((state) => ({
        selectedFiles: state.selectedFiles.includes(path)
          ? state.selectedFiles.filter(p => p !== path)
          : [...state.selectedFiles, path]
      })),
      clearSelectedFiles: () => set({ selectedFiles: [] }),

      setAgentStatus: (status) => set({ agentStatus: status }),
      setAgentTask: (task) => set({ agentTask: task }),
      setAgentRunInBackground: (runInBackground) => set({ agentRunInBackground: runInBackground }),
      setToolProgress: (progress) => set({ toolProgress: progress }),
      setPendingPermission: (permission) => set({ pendingPermission: permission, showPermissionDialog: permission !== null }),
      setShowPermissionDialog: (show) => set({ showPermissionDialog: show }),
      setPermissionDecision: (decision: 'allow' | 'deny' | 'allowAll' | 'denyAll' | null) => set({ lastPermissionDecision: decision, pendingPermission: null, showPermissionDialog: false }),
      addActivityLog: (entry) => set((state) => ({
        agentActivityLog: [...state.agentActivityLog, entry].slice(-200),
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
