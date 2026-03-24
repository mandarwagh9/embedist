import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore } from '../stores/aiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileStore } from '../stores/fileStore';
import { buildPlanContext } from './usePlanContext';
import { SYSTEM_PROMPTS } from '../lib/ai-prompts';
import { getAllToolDefinitions, executeTool, type ToolCall } from '../lib/agent-tools';

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tool_calls: ToolCall[];
}

interface ActivityEntry {
  id: string;
  timestamp: number;
  type: 'read' | 'write' | 'build' | 'shell' | 'search' | 'info' | 'error' | 'done';
  message: string;
  details?: string;
}

const MAX_ITERATIONS = 50;
const PATH_SENSITIVE_TOOLS = ['write_file', 'create_file', 'create_folder'];

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/').toLowerCase().replace(/^\/([a-z]):/, '$1:');
}

function isPathSafe(projectRoot: string, path: string): boolean {
  if (!projectRoot) return false;
  const root = normalizePath(projectRoot);
  const target = normalizePath(path);
  if (root.endsWith('/')) {
    return target.startsWith(root) || target === root.slice(0, -1);
  }
  return target.startsWith(root + '/') || target === root;
}

export function useAgent() {
  const {
    activeProvider,
    addMessage,
    setLoading,
    setAgentStatus,
    addActivityLog,
    clearActivityLog,
    setAgentTask,
    agentStatus,
    agentActivityLog,
  } = useAIStore();

  const customEndpoints = useSettingsStore((s) => s.customEndpoints);
  const providerConfigs = useSettingsStore((s) => s.providers);
  const aiParameters = useSettingsStore((s) => s.aiParameters);

  const isRunningRef = useRef(false);
  const cancelRef = useRef(false);

  const getActiveEndpoint = useCallback(() => {
    const ep = customEndpoints.find(e => e.baseUrl && e.apiKey);
    return ep || null;
  }, [customEndpoints]);

  const hasActiveProvider = useCallback(() => {
    const ep = getActiveEndpoint();
    if (ep) return true;
    const p = providerConfigs[activeProvider as keyof typeof providerConfigs];
    if (p?.apiKey) return true;
    return false;
  }, [activeProvider, providerConfigs, getActiveEndpoint]);

  const getActiveModel = useCallback(() => {
    const ep = getActiveEndpoint();
    if (ep) return { apiKey: ep.apiKey, baseUrl: ep.baseUrl, model: ep.model, provider: ep.id };
    const p = providerConfigs[activeProvider as keyof typeof providerConfigs];
    if (p?.apiKey) return { apiKey: p.apiKey, baseUrl: undefined, model: p.model, provider: activeProvider };
    return null;
  }, [activeProvider, providerConfigs, getActiveEndpoint]);

  const callAI = useCallback(async (
    msgs: Array<{ id: string; role: string; content: string }>,
    tools?: boolean
  ): Promise<AIResponse | null> => {
    const modelConfig = getActiveModel();
    if (!modelConfig) return null;

    const toolDefs = tools ? getAllToolDefinitions() : undefined;

    try {
      const response = await invoke<AIResponse>('chat_completion', {
        messages: msgs,
        model: modelConfig.model || null,
        provider: modelConfig.provider || null,
        apiKey: modelConfig.apiKey || null,
        baseUrl: modelConfig.baseUrl || null,
        tools: toolDefs || null,
        temperature: aiParameters.temperature,
        maxTokens: aiParameters.maxTokens,
        topP: aiParameters.topP,
      });
      return response;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }, [getActiveModel, aiParameters]);

  const buildSystemPrompt = useCallback(async (): Promise<string> => {
    const modeConfig = SYSTEM_PROMPTS['agent'];
    let prompt = modeConfig.system;

    const { rootPath } = useFileStore.getState();
    if (rootPath) {
      const context = await buildPlanContext('');
      prompt = prompt.replace('**PROJECT ROOT: The project root directory is provided in the ## Current Project Context section below. ALL files you read or write MUST be inside it. Never touch files outside this directory.**', `**PROJECT ROOT: ${rootPath}**

ALL files you read or write MUST be inside this directory. Never reference files outside it.`);
      prompt += `\n\n## Current Project Context\n${context}`;
    } else {
      prompt = prompt.replace(
        '**PROJECT ROOT: The project root directory is provided in the ## Current Project Context section below. ALL files you read or write MUST be inside it. Never touch files outside this directory.**',
        '**WARNING: No project is open. Do NOT write files unless the user specifies a directory path.**'
      );
    }

    const currentMessages = useAIStore.getState().messages;
    const approvedPlan = extractApprovedPlan(currentMessages);
    if (approvedPlan) {
      prompt += `\n\n## Approved Implementation Plan\n${approvedPlan}`;
    }

    return prompt;
  }, []);

  const extractApprovedPlan = (msgs: Array<{ role: string; content: string }>): string | null => {
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (m.role === 'system' && m.content.startsWith('## Plan to Implement')) {
        const end = m.content.indexOf('\n\n---\n');
        if (end > 0) return m.content.substring(0, end);
        return m.content;
      }
    }
    return null;
  };

  const logActivity = useCallback((
    type: ActivityEntry['type'],
    message: string,
    details?: string
  ) => {
    const entry: ActivityEntry = {
      id: `act-${crypto.randomUUID()}`,
      timestamp: Date.now(),
      type,
      message,
      details,
    };
    addActivityLog(entry);
    return entry;
  }, [addActivityLog]);

  const getIconForTool = (name: string): ActivityEntry['type'] => {
    switch (name) {
      case 'read_file': return 'read';
      case 'write_file': return 'write';
      case 'build_project': return 'build';
      case 'run_shell': return 'shell';
      case 'search_code': return 'search';
      case 'create_file':
      case 'create_folder': return 'write';
      default: return 'info';
    }
  };

  const safeExecuteTool = async (
    projectRoot: string,
    toolName: string,
    toolId: string,
    args: Record<string, unknown>
  ) => {
    if (PATH_SENSITIVE_TOOLS.includes(toolName)) {
      const pathArg = args.path as string | undefined;
      if (pathArg && !isPathSafe(projectRoot, pathArg)) {
        return {
          callId: toolId,
          toolCallId: toolId,
          success: false,
          output: `PATH SAFETY ERROR: "${pathArg}" is outside the project root "${projectRoot}". All file paths must be inside the project root.`,
        };
      }
    }
    return executeTool(toolId, toolName, args);
  };

  const startAgentTask = useCallback(async (task: string) => {
    if (!hasActiveProvider()) {
      logActivity('error', 'No AI provider configured', 'Please add an AI provider in Settings.');
      return;
    }

    isRunningRef.current = true;
    cancelRef.current = false;

    clearActivityLog();
    setAgentTask(task);
    setAgentStatus('running');
    setLoading(true);

    logActivity('info', 'Starting agent task', task);

    try {
      const systemPrompt = await buildSystemPrompt();
      const projectRoot = useFileStore.getState().rootPath || '';

      const conversationMessages: Array<{ id: string; role: string; content: string; tool_call_id?: string }> = [
        { id: 'system', role: 'system', content: systemPrompt },
      ];

      const currentMessages = useAIStore.getState().messages;
      for (const msg of currentMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          conversationMessages.push({
            id: msg.id,
            role: msg.role,
            content: msg.content,
          });
        }
      }

      conversationMessages.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: task,
      });

      let iteration = 0;

      while (isRunningRef.current && iteration < MAX_ITERATIONS) {
        iteration++;

        if (cancelRef.current) {
          logActivity('info', 'Agent task cancelled by user');
          break;
        }

        setLoading(true);

        let response: AIResponse | null = null;
        let lastError = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await callAI(conversationMessages, true);
            break;
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            if (attempt < 2) {
              logActivity('info', `Retrying API call (attempt ${attempt + 2}/3)`, lastError);
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
        }

        if (!response) {
          logActivity('error', 'Failed to get AI response', lastError);
          addMessage({ role: 'assistant', content: `I encountered an error: ${lastError}` });
          break;
        }

        if (response.content && response.content.trim()) {
          addMessage({ role: 'assistant', content: response.content });
          conversationMessages.push({
            id: `asst-${Date.now()}-${iteration}`,
            role: 'assistant',
            content: response.content,
          });
        }

        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const tc of response.tool_calls) {
            if (cancelRef.current) break;

            const toolIcon = getIconForTool(tc.name);
            logActivity(toolIcon, `${tc.name}...`, tc.arguments);

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.arguments);
            } catch {
              args = {};
            }

            const result = await safeExecuteTool(projectRoot, tc.name, tc.id, args);

            const resultType: ActivityEntry['type'] = result.success ? toolIcon : 'error';
            logActivity(resultType, `${tc.name} → ${result.success ? 'OK' : 'FAILED'}`, result.output.substring(0, 300));

            conversationMessages.push({
              id: `tool-${tc.id}`,
              role: 'tool',
              tool_call_id: tc.id,
              content: result.success
                ? `Tool "${tc.name}" succeeded:\n${result.output}`
                : `Tool "${tc.name}" failed:\n${result.output}`,
            });
          }
        } else {
          if (response.content && response.content.trim()) {
            logActivity('done', 'Agent complete', response.content.substring(0, 200));
          } else {
            logActivity('done', 'Agent complete', 'No more actions needed.');
          }
          break;
        }
      }

      if (iteration >= MAX_ITERATIONS) {
        logActivity('error', 'Max iterations reached', 'The agent ran for too long. Break the task into smaller steps.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logActivity('error', 'Agent error', msg);
      addMessage({ role: 'assistant', content: `Error: ${msg}` });
    } finally {
      isRunningRef.current = false;
      setLoading(false);
      setAgentStatus('done');
    }
  }, [hasActiveProvider, buildSystemPrompt, callAI, addMessage, setLoading, setAgentStatus, clearActivityLog, logActivity, setAgentTask]);

  const cancelAgentTask = useCallback(() => {
    cancelRef.current = true;
    isRunningRef.current = false;
    logActivity('info', 'Cancelling...', 'Stopping the agent task.');
    setAgentStatus('idle');
    setLoading(false);
  }, [logActivity, setAgentStatus, setLoading]);

  return {
    startAgentTask,
    cancelAgentTask,
    agentStatus,
    agentActivityLog,
    isRunning: agentStatus === 'running',
  };
}
