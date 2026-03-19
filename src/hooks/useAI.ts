import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore } from '../stores/aiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ragEngine } from '../lib/rag';
import { SYSTEM_PROMPTS, MODE_SWITCH_REMINDERS } from '../lib/ai-prompts';
import type { AIMode } from '../lib/ai-prompts';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function useAI() {
  const {
    mode,
    activeProvider,
    chatMessages,
    planMessages,
    debugMessages,
    addMessage,
    clearMessages,
    setLoading,
  } = useAIStore();
  
  const customEndpoints = useSettingsStore((state) => state.customEndpoints);
  const providers = useSettingsStore((state) => state.providers);
  const defaultBoard = useSettingsStore((state) => state.build.defaultBoard);

  const messages = mode === 'plan' ? planMessages : mode === 'debug' ? debugMessages : chatMessages;
  const isLoading = useAIStore((state) => state.isLoading);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.content.startsWith('Error:')) {
      useAIStore.getState().clearMessages();
    }
  }, [mode]);

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

  const sendMessage = useCallback(async (content: string, boardType?: string): Promise<AIResponse | null> => {
    if (!hasActiveProvider()) {
      return null;
    }

    addMessage({ role: 'user', content });
    setLoading(true);

    try {
      const currentMessages = useAIStore.getState().getMessages();
      const context = getContextForQuery(content, boardType);
      const modeConfig = SYSTEM_PROMPTS[mode];
      
      const systemPrompt = `${modeConfig.system}

Knowledge Base:
${context || 'No relevant context found.'}`;

      const allMessages: AIMessage[] = [
        { id: 'system-prompt', role: 'system', content: systemPrompt },
        ...currentMessages,
        { id: `temp-${Date.now()}`, role: 'user', content },
      ];

      const customEndpoint = getActiveEndpoint();
      let response: AIResponse;

      if (customEndpoint) {
        console.log('[useAI] Using custom endpoint:', customEndpoint.name, 'ID:', customEndpoint.id);
        response = await invoke<AIResponse>('chat_completion', {
          messages: allMessages,
          model: customEndpoint.model || null,
          provider: customEndpoint.id,
          apiKey: customEndpoint.apiKey,
          baseUrl: customEndpoint.baseUrl,
        });
      } else {
        response = await invoke<AIResponse>('chat_completion', {
          messages: allMessages,
          model: null,
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
  }, [mode, addMessage, setLoading, getContextForQuery, hasActiveProvider, getActiveEndpoint]);

  const clearAllMessages = useCallback(() => {
    useAIStore.getState().clearAllMessages();
  }, []);

  const switchMode = useCallback((newMode: AIMode) => {
    useAIStore.getState().setMode(newMode);
    
    const reminder = MODE_SWITCH_REMINDERS[newMode];
    if (reminder) {
      addMessage({ role: 'system', content: reminder });
    }
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
