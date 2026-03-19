import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore } from '../stores/aiStore';
import { ragEngine } from '../lib/rag';

interface AIMessage {
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

interface AIProviderConfig {
  id: string;
  name: string;
  api_key: string;
  base_url?: string;
  default_model: string;
}

export function useAI() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeProvider, addProvider, removeProvider, setActiveProvider } = useAIStore();

  const getContextForQuery = useCallback((query: string, boardType?: string): string => {
    if (boardType) {
      return ragEngine.getBoardContext(boardType, query);
    }
    return ragEngine.getRelevantContext(query);
  }, []);

  const sendMessage = useCallback(async (content: string, boardType?: string) => {
    if (!activeProvider) {
      setError('No AI provider configured. Please add one in Settings.');
      return null;
    }

    const userMessage: AIMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const context = getContextForQuery(content, boardType);
      const systemPrompt = `You are an expert embedded systems developer assistant. 
Your name is Embedist.
You specialize in ESP32, Arduino, and embedded C/C++ development.
Use the following knowledge base to provide accurate, hardware-specific answers:

${context || 'No relevant context found.'}

Provide concise, actionable answers. Include code examples when relevant.`;

      const allMessages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMessage,
      ];

      const response = await invoke<AIResponse>('chat_completion', {
        messages: allMessages,
        model: null,
      });

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: response.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, messages, getContextForQuery]);

  const loadProviders = useCallback(async () => {
    try {
      const stored = await invoke<AIProviderConfig[]>('get_ai_providers');
      stored.forEach((p) => addProvider({
        id: p.id,
        name: p.name,
        type: 'cloud',
        models: [p.default_model],
        apiKey: p.api_key,
        baseUrl: p.base_url,
      }));
    } catch (err) {
      console.error('Failed to load AI providers:', err);
    }
  }, [addProvider]);

  const saveProvider = useCallback(async (config: { id: string; name: string; api_key: string; base_url?: string; default_model: string }) => {
    try {
      await invoke('add_ai_provider', { config });
      addProvider({
        id: config.id,
        name: config.name,
        type: 'cloud',
        models: [config.default_model],
        apiKey: config.api_key,
        baseUrl: config.base_url,
      });
      if (!activeProvider) {
        await invoke('set_active_provider', { providerId: config.id });
        setActiveProvider(config.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, [activeProvider, addProvider, setActiveProvider]);

  const deleteProvider = useCallback(async (providerId: string) => {
    try {
      await invoke('remove_ai_provider', { providerId });
      removeProvider(providerId);
      if (activeProvider === providerId) {
        setActiveProvider('openai');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, [activeProvider, removeProvider, setActiveProvider]);

  const selectProvider = useCallback(async (providerId: string) => {
    try {
      await invoke('set_active_provider', { providerId });
      setActiveProvider(providerId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, [setActiveProvider]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadProviders,
    saveProvider,
    deleteProvider,
    selectProvider,
    clearMessages,
    getContextForQuery,
  };
}
