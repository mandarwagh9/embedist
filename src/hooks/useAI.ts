import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore, AIMessage } from '../stores/aiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileStore } from '../stores/fileStore';
import { ragEngine } from '../lib/rag';
import { buildPlanContext } from './usePlanContext';
import { getPromptConfig } from '../lib/prompts';
import { getDebugToolDefinitions, executeDebugTool, type DebugToolCall } from '../lib/debug-tools';
import { getPlanToolDefinitions, executePlanTool } from '../lib/plan-tools';
import type { AIMode } from '../lib/ai-prompts';

interface ToolCall {
  id: string;
  name: string;
  arguments: string | Record<string, unknown>;
}

function parseJsonToolCalls(content: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.name && (parsed.arguments || parsed.args)) {
        toolCalls.push({
          id: `json-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: parsed.name,
          arguments: parsed.arguments || parsed.args || {},
        });
      }
    } catch {
      continue;
    }
  }
  
  return toolCalls;
}

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tool_calls?: DebugToolCall[];
}

interface APIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  mode?: AIMode;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
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
  const aiParameters = useSettingsStore((state) => state.aiParameters);

  const isLoading = useAIStore((state) => state.isLoading);

  const getActiveEndpoint = useCallback(() => {
    const customEndpoint = customEndpoints.find(ep => ep.id === activeProvider && ep.baseUrl && ep.apiKey);
    return customEndpoint || null;
  }, [customEndpoints, activeProvider]);

  const hasActiveProvider = useCallback(() => {
    if (activeProvider === 'ollama') {
      return true;
    }
    const ep = customEndpoints.find(e => e.id === activeProvider && e.baseUrl && e.apiKey);
    if (ep) return true;
    if (providers[activeProvider as keyof typeof providers]?.apiKey) return true;
    return false;
  }, [activeProvider, providers, customEndpoints]);

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
    for (let i = msgs.length - 1; i >= 0; i--) {
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
      const modeConfig = getPromptConfig(mode);

      let systemPrompt = modeConfig.system;

      if (mode === 'plan') {
        try {
          const planContext = await buildPlanContext(content);
          if (planContext) {
            systemPrompt += `\n\n## Current Project Context\n${planContext}`;
          }
        } catch (err) {
          console.warn('Failed to build plan context:', err);
        }
      } else if (mode === 'chat') {
        const approvedPlan = getApprovedPlanFromMessages(currentMessages);
        if (approvedPlan) {
          systemPrompt += `\n\n## Approved Implementation Plan\n${approvedPlan}`;
        }
      } else if (mode === 'debug') {
        const fileStore = useFileStore.getState();
        if (fileStore.rootPath) {
          systemPrompt += `\n\n## Current Project\n**Root**: ${fileStore.rootPath}`;
        }
      }

      systemPrompt += `\n\nKnowledge Base:\n${context || 'No relevant context found.'}`;

      const allMessages: APIMessage[] = [
        { id: 'system-prompt', role: 'system', content: systemPrompt, mode },
        ...currentMessages,
      ];

      const customEndpoint = getActiveEndpoint();
      const useTools = mode === 'debug' || mode === 'plan';
      const toolDefs = useTools ? (mode === 'plan' ? getPlanToolDefinitions() : getDebugToolDefinitions()) : undefined;

      let response: AIResponse;

      if (customEndpoint) {
        const chatTemplateKwargs = customEndpoint.thinking ? { thinking: true } : undefined;
        response = await invoke<AIResponse>('chat_completion', {
          messages: allMessages,
          model: customEndpoint.model || null,
          provider: customEndpoint.id,
          apiKey: customEndpoint.apiKey,
          baseUrl: customEndpoint.baseUrl,
          tools: toolDefs || null,
          temperature: aiParameters.temperature,
          maxTokens: aiParameters.maxTokens,
          topP: aiParameters.topP,
          chatTemplate_kwargs: chatTemplateKwargs || null,
        });
      } else {
        response = await invoke<AIResponse>('chat_completion', {
          messages: allMessages,
          model: null,
          tools: toolDefs || null,
          temperature: aiParameters.temperature,
          maxTokens: aiParameters.maxTokens,
          topP: aiParameters.topP,
        });
      }

      const modelToolCalls = response.tool_calls || [];
      const parsedToolCalls = useTools && modelToolCalls.length === 0
        ? parseJsonToolCalls(response.content)
        : [];
      const toolCallsToExecute = useTools ? (modelToolCalls.length > 0 ? modelToolCalls : parsedToolCalls) : [];

      if (toolCallsToExecute.length > 0) {
        const planToolCalls: Array<{ id: string; name: string; args: string; output: string; success: boolean; elapsedMs?: number }> = [];

        allMessages.push({
          id: `assistant-tools-${Date.now()}`,
          role: 'assistant',
          content: response.content || '',
          mode,
          tool_calls: toolCallsToExecute.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
            },
          })),
        });

        for (const tc of toolCallsToExecute) {
          let args: Record<string, unknown> = {};
          try {
            if (typeof tc.arguments === 'string') {
              args = JSON.parse(tc.arguments);
            } else {
              args = tc.arguments as Record<string, unknown>;
            }
          } catch (err) {
            console.warn('Failed to parse tool arguments:', err);
            args = {};
          }

          const startTime = Date.now();
          const result = mode === 'plan'
            ? await executePlanTool(tc.id, tc.name, args)
            : await executeDebugTool(tc.id, tc.name, args);
          const elapsedMs = Date.now() - startTime;

          planToolCalls.push({
            id: tc.id,
            name: tc.name,
            args: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
            output: result.output,
            success: result.success,
            elapsedMs,
          });

          const toolResultMsg: APIMessage = {
            id: `tool-${tc.id}`,
            role: 'tool',
            content: result.output,
            mode,
            tool_call_id: tc.id,
          };
          allMessages.push(toolResultMsg);
        }

        const followUpChatTemplateKwargs = customEndpoint?.thinking ? { thinking: true } : undefined;

        const followUpResponse = await invoke<AIResponse>('chat_completion', {
          messages: allMessages,
          model: customEndpoint?.model || null,
          provider: customEndpoint?.id || null,
          apiKey: customEndpoint?.apiKey || null,
          baseUrl: customEndpoint?.baseUrl || null,
          tools: null,
          temperature: aiParameters.temperature,
          maxTokens: aiParameters.maxTokens,
          topP: aiParameters.topP,
          chatTemplate_kwargs: followUpChatTemplateKwargs || null,
        });
        
        response.content = followUpResponse.content;
        response.usage = followUpResponse.usage;

        addMessage({ role: 'assistant', content: response.content, usage: response.usage, toolCalls: planToolCalls });
        return response;
      }

      addMessage({ role: 'assistant', content: response.content, usage: response.usage });
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[useAI] sendMessage error:', err);
      addMessage({ role: 'assistant', content: `Error: ${errorMessage}` });
      return null;
    } finally {
      setLoading(false);
    }
  }, [mode, addMessage, setLoading, getContextForQuery, hasActiveProvider, getActiveEndpoint, getApprovedPlanFromMessages, aiParameters]);

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
