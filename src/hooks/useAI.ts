import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore, AIMessage } from '../stores/aiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ragEngine } from '../lib/rag';
import { buildPlanContext } from './usePlanContext';
import { SYSTEM_PROMPTS } from '../lib/ai-prompts';
import type { AIMode } from '../lib/ai-prompts';

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface APIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: AIMode;
}

export function useAI() {
  const {
    mode,
    activeProvider,
    messages,
    addMessage,
    clearMessages,
    setLoading,
  } = useAIStore();

  const customEndpoints = useSettingsStore((state) => state.customEndpoints);
  const providers = useSettingsStore((state) => state.providers);
  const defaultBoard = useSettingsStore((state) => state.build.defaultBoard);

  const isLoading = useAIStore((state) => state.isLoading);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.content.startsWith('Error:')) {
      useAIStore.getState().clearMessages();
    }
  }, [mode, messages]);

  const getActiveEndpoint = useCallback(() => {
    const customEndpoint = customEndpoints.find(ep => ep.baseUrl && ep.apiKey);
    return customEndpoint || null;
  }, [customEndpoints]);

  const hasActiveProvider = useCallback(() => {
    const customEndpoint = getActiveEndpoint();
    if (customEndpoint) return true;
    if (activeProvider && providers[activeProvider as keyof typeof providers]?.apiKey) return true;
    return false;
  }, [activeProvider, providers, getActiveEndpoint]);

  const getContextForQuery = useCallback((query: string, boardType?: string): string => {
    try {
      const board = boardType || defaultBoard;
      if (board) {
        return ragEngine.getBoardContext(board, query);
      }
      return ragEngine.getRelevantContext(query);
    } catch (err) {
      console.warn('[useAI] Failed to get RAG context:', err);
      return '';
    }
  }, [defaultBoard]);

  const getApprovedPlanFromMessages = useCallback((msgs: AIMessage[]): string | null => {
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (m.role === 'system' && m.content.startsWith('## Plan to Implement')) {
        const planEnd = m.content.indexOf('\n\n---\n');
        if (planEnd !== -1) {
          return m.content.substring(0, planEnd);
        }
        return m.content;
      }
    }
    return null;
  }, []);

  const sendMessage = useCallback(async (content: string, boardType?: string): Promise<AIResponse | null> => {
    if (!hasActiveProvider()) {
      return null;
    }

    addMessage({ role: 'user', content });
    setLoading(true);

    try {
      const currentMessages = useAIStore.getState().messages;
      const context = getContextForQuery(content, boardType);
      const modeConfig = SYSTEM_PROMPTS[mode];

      let systemPrompt = modeConfig.system;

      if (mode === 'plan') {
        try {
          const planContext = await buildPlanContext(content);
          if (planContext) {
            systemPrompt += `\n\n## Current Project Context\n${planContext}`;
          }
        } catch {
        }
      } else if (mode === 'chat') {
        const approvedPlan = getApprovedPlanFromMessages(currentMessages);
        if (approvedPlan) {
          systemPrompt += `\n\n## Approved Implementation Plan\n${approvedPlan}`;
        }
      }

      systemPrompt += `\n\nKnowledge Base:\n${context || 'No relevant context found.'}`;

      const allMessages: APIMessage[] = [
        { id: 'system-prompt', role: 'system', content: systemPrompt, mode },
        ...currentMessages,
        { id: `temp-${Date.now()}`, role: 'user', content, mode },
      ];

      const customEndpoint = getActiveEndpoint();
      let response: AIResponse;

      if (customEndpoint) {
        response = await invoke<AIResponse>('chat_completion', {
          messages: allMessages,
          model: customEndpoint.model || null,
          provider: customEndpoint.id,
          apiKey: customEndpoint.apiKey,
          baseUrl: customEndpoint.baseUrl,
          tools: null,
        });
      } else {
        response = await invoke<AIResponse>('chat_completion', {
          messages: allMessages,
          model: null,
          tools: null,
        });
      }

      addMessage({ role: 'assistant', content: response.content });
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[useAI] sendMessage error:', err);
      addMessage({ role: 'assistant', content: `Error: ${errorMessage}` });
      return null;
    } finally {
      setLoading(false);
    }
  }, [mode, addMessage, setLoading, getContextForQuery, hasActiveProvider, getActiveEndpoint, getApprovedPlanFromMessages]);

  const clearAllMessages = useCallback(() => {
    useAIStore.getState().clearAllMessages();
  }, []);

  const switchMode = useCallback((newMode: AIMode) => {
    const currentMode = useAIStore.getState().mode;
    if (currentMode === newMode) return;
    if (currentMode === 'agent') {
      useAIStore.getState().setAgentStatus('idle');
      useAIStore.getState().clearActivityLog();
      useAIStore.getState().setAgentTask(null);
    }
    addMessage({
      role: 'system',
      content: `[Switched to ${newMode.charAt(0).toUpperCase() + newMode.slice(1)} mode]`,
    });
    useAIStore.getState().setMode(newMode);
  }, [addMessage]);

  return {
    mode,
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    clearAllMessages,
    switchMode,
    getContextForQuery,
    hasActiveProvider: hasActiveProvider(),
  };
}
