import { useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAIStore } from '../stores/aiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useFileStore } from '../stores/fileStore';
import { buildPlanContext } from './usePlanContext';
import { getPromptConfig } from '../lib/prompts';
import { getAllToolDefinitions, executeTool, type ToolCall } from '../lib/agent-tools';
import { isBlocked } from '../lib/tool-permissions';
import { toast } from '../components/Common/Toast';

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

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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

interface ActivityEntry {
  id: string;
  timestamp: number;
  type: 'read' | 'write' | 'build' | 'shell' | 'search' | 'info' | 'error' | 'done';
  message: string;
  details?: string;
}

const MAX_ITERATIONS = 50;
const FILE_SYSTEM_TOOLS = ['read_file', 'list_directory', 'get_directory_tree', 'search_code'];
const MUTATING_TOOLS = ['write_file', 'create_file', 'create_folder'];
const PROJECT_SCOPED_TOOLS = [...FILE_SYSTEM_TOOLS, 'build_project', 'run_shell', ...MUTATING_TOOLS];

function normalizePath(p: string): string {
  const normalized = p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/([a-zA-Z]):/, '$1:');
  return /^[a-zA-Z]:/.test(normalized) || normalized.startsWith('//')
    ? normalized.toLowerCase()
    : normalized;
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
  const platformioPath = useSettingsStore((s) => s.build.platformioPath);

  const isRunningRef = useRef(false);
  const cancelRef = useRef(false);

  const getActiveEndpoint = useCallback(() => {
    const ep = customEndpoints.find(e => e.id === activeProvider && e.baseUrl && e.apiKey);
    return ep || null;
  }, [customEndpoints, activeProvider]);

  const hasActiveProvider = useCallback(() => {
    if (activeProvider === 'ollama') return true;
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
    msgs: ConversationMessage[],
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
    const modeConfig = getPromptConfig('agent');
    let prompt = modeConfig.system;

    const { rootPath, detectedBoard } = useFileStore.getState();
    if (rootPath) {
      const context = await buildPlanContext('');
      prompt += `\n\n## Current Project Context\n${context}`;
      if (detectedBoard) {
        prompt += `\n**Detected Board**: ${detectedBoard}\n`;
      }
    } else {
      prompt += `\n\n## Current Project Context\n\n**WARNING: No project is open. Do NOT write files unless the user specifies a directory path.**`;
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
    if (PROJECT_SCOPED_TOOLS.includes(toolName) && !projectRoot) {
      return {
        callId: toolId,
        toolCallId: toolId,
        success: false,
        output: `PROJECT ROOT REQUIRED: Tool "${toolName}" requires an open project folder. Open a folder first, then retry.`,
      };
    }

    let pathArg: string | undefined;
    if (toolName === 'write_file') {
      pathArg = args.path as string | undefined;
    } else if (toolName === 'create_file' || toolName === 'create_folder') {
      pathArg = args.parent as string | undefined;
    } else if (toolName === 'build_project') {
      pathArg = (args.projectPath as string | undefined) || projectRoot;
      if (!args.projectPath && projectRoot) {
        args.projectPath = projectRoot;
      }
    } else if (toolName === 'run_shell') {
      pathArg = (args.cwd as string | undefined) || projectRoot;
      if (!args.cwd && projectRoot) {
        args.cwd = projectRoot;
      }
    } else if (toolName === 'search_code' || toolName === 'read_file' || toolName === 'list_directory' || toolName === 'get_directory_tree') {
      pathArg = (args.path as string | undefined) || projectRoot;
      if (!args.path && projectRoot) {
        args.path = projectRoot;
      }
    }

    if (PROJECT_SCOPED_TOOLS.includes(toolName)) {
      if (!pathArg || !pathArg.trim()) {
        return {
          callId: toolId,
          toolCallId: toolId,
          success: false,
          output: `PATH SAFETY ERROR: Tool "${toolName}" is missing a valid project path argument.`,
        };
      }

      if (!isPathSafe(projectRoot, pathArg)) {
        return {
          callId: toolId,
          toolCallId: toolId,
          success: false,
          output: `PATH SAFETY ERROR: "${pathArg}" is outside the project root "${projectRoot}".`,
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

    try {
      const pioStatus = await invoke<{ installed: boolean; version: string }>('check_platformio', {
        platformioPath: platformioPath || null,
      });
      if (!pioStatus.installed) {
        logActivity('error', 'PlatformIO not found', 'PlatformIO is not installed or not reachable. Install PlatformIO and make sure the CLI path in Settings points to a working pio executable.');
        return;
      }
    } catch (err) {
      logActivity('error', 'PlatformIO check failed', `Could not verify PlatformIO installation. Build commands may fail. Error: ${err}`);
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

      const conversationMessages: ConversationMessage[] = [
        { id: 'system', role: 'system', content: systemPrompt },
      ];

      const currentMessages = useAIStore.getState().messages;
      for (const msg of currentMessages) {
        if ((msg.role === 'user' || msg.role === 'assistant') && msg.mode === 'agent') {
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
        content: `Task: ${task}\n\nIMPORTANT: Before writing any code, read platformio.ini to identify the board type, platform, and libraries. Then read the existing source files to understand the current code structure.`,
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
          if (cancelRef.current) break;
          try {
            response = await callAI(conversationMessages, true);
            break;
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            if (attempt < 2 && !cancelRef.current) {
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
          addMessage({ role: 'assistant', content: response.content, usage: response.usage });
          conversationMessages.push({
            id: `asst-${Date.now()}-${iteration}`,
            role: 'assistant',
            content: response.content,
            usage: response.usage,
          });
        }

        if (response.tool_calls && response.tool_calls.length > 0) {
          const toolCallsForMessage: Array<{ id: string; name: string; args: string; output: string; success: boolean; elapsedMs?: number }> = [];

          conversationMessages.push({
            id: `asst-tools-${Date.now()}-${iteration}`,
            role: 'assistant',
            content: response.content || '',
            tool_calls: response.tool_calls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: tc.arguments,
              },
            })),
          });

          for (const tc of response.tool_calls) {
            if (cancelRef.current) break;

            if (isBlocked(tc.name)) {
              logActivity('error', `${tc.name} blocked`, `This tool is blocked. Change permission in Settings.`);
              conversationMessages.push({
                id: `tool-${tc.id}`,
                role: 'tool',
                tool_call_id: tc.id,
                content: `Tool "${tc.name}" is blocked. The user has configured to always block this tool.`,
              });
              toolCallsForMessage.push({ id: tc.id, name: tc.name, args: tc.arguments, output: `Tool "${tc.name}" is blocked.`, success: false });
              continue;
            }

            const toolIcon = getIconForTool(tc.name);
            logActivity(toolIcon, `${tc.name}...`, tc.arguments);

            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.arguments);
            } catch (err) {
              console.error('Failed to parse tool arguments:', err);
              args = {};
            }

            const startTime = Date.now();
            const result = await safeExecuteTool(projectRoot, tc.name, tc.id, args);
            const elapsedMs = Date.now() - startTime;

            const resultType: ActivityEntry['type'] = result.success ? toolIcon : 'error';
            logActivity(resultType, `${tc.name} → ${result.success ? 'OK' : 'FAILED'}`, result.output.substring(0, 300));

            toolCallsForMessage.push({
              id: tc.id,
              name: tc.name,
              args: tc.arguments,
              output: result.output,
              success: result.success,
              elapsedMs,
            });

            if (result.success) {
              const fileName = typeof args.path === 'string' ? args.path.split(/[/\\]/).pop() : '';
              if (tc.name === 'write_file') {
                toast('success', `File "${fileName}" saved`);
              } else if (tc.name === 'create_file') {
                toast('success', `File "${fileName}" created`);
              } else if (tc.name === 'create_folder') {
                toast('success', `Folder "${fileName}" created`);
              } else if (tc.name === 'build_project') {
                toast('success', 'Build completed successfully');
              }
            } else {
              if (tc.name === 'build_project') {
                toast('error', 'Build failed — check the error output');
              }
            }

            const toolResultContent = result.success
              ? `Tool "${tc.name}" succeeded:\n${result.output}`
              : `Tool "${tc.name}" failed:\n${result.output}\n\nFix the errors and try again.`;

            conversationMessages.push({
              id: `tool-${tc.id}`,
              role: 'tool',
              tool_call_id: tc.id,
              content: toolResultContent,
            });
          }

          if (toolCallsForMessage.length > 0) {
            addMessage({ role: 'assistant', content: '', toolCalls: toolCallsForMessage });
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
        toast('warning', 'Agent reached max iterations. Try a simpler task.');
      } else if (cancelRef.current) {
        toast('info', 'Agent task cancelled');
      } else {
        toast('success', 'Agent task completed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logActivity('error', 'Agent error', msg);
      addMessage({ role: 'assistant', content: `Error: ${msg}` });
      toast('error', `Agent error: ${msg.substring(0, 100)}`);
    } finally {
      isRunningRef.current = false;
      setLoading(false);
      if (!cancelRef.current) {
        setAgentStatus('done');
      }
    }
  }, [hasActiveProvider, buildSystemPrompt, callAI, addMessage, setLoading, setAgentStatus, clearActivityLog, logActivity, setAgentTask, platformioPath]);

  const cancelAgentTask = useCallback(() => {
    cancelRef.current = true;
    isRunningRef.current = false;
    invoke('stop_build').catch((err) => {
      console.warn('[useAgent] stop_build failed during cancel:', err);
    });
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
