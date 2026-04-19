import { invoke } from '@tauri-apps/api/core';
import { useAIStore } from '../stores/aiStore';
import { useFileStore } from '../stores/fileStore';
import { useSettingsStore } from '../stores/settingsStore';
import { isBlocked, shouldPromptForPermission } from './tool-permissions';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolResult {
  callId: string;
  toolCallId: string;
  success: boolean;
  output: string;
}

interface ToolExecuteFn {
  (args: Record<string, unknown>): Promise<unknown>;
}

interface ToolEntry {
  definition: ToolDefinition;
  execute: ToolExecuteFn;
}

const toolRegistry: Record<string, ToolEntry> = {};

export function registerTool(name: string, def: ToolDefinition, exec: ToolExecuteFn) {
  toolRegistry[name] = { definition: def, execute: exec };
}

registerTool('read_file', {
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read contents of a file. Use for understanding existing code before making changes.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  const content = await invoke<string>('read_file', { path: args.path as string, root });
  return content;
});

registerTool('write_file', {
  type: 'function',
  function: {
    name: 'write_file',
    description: 'Create or overwrite a file with content. Use for creating new files or modifying existing ones.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path for the file' },
        content: { type: 'string', description: 'Full file content to write' },
      },
      required: ['path', 'content'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  await invoke('write_file', { path: args.path as string, content: args.content as string, root });
  useFileStore.getState().setFileContent(args.path as string, args.content as string);
  return `Written ${args.path}`;
});

registerTool('create_file', {
  type: 'function',
  function: {
    name: 'create_file',
    description: 'Create an empty file at a specific location.',
    parameters: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent directory path' },
        name: { type: 'string', description: 'File name (not full path)' },
      },
      required: ['parent', 'name'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  const path = await invoke<string>('create_file', { parent: args.parent as string, name: args.name as string, root });
  useFileStore.getState().setFileContent(path, '');
  return path;
});

registerTool('create_folder', {
  type: 'function',
  function: {
    name: 'create_folder',
    description: 'Create a directory (and any intermediate directories).',
    parameters: {
      type: 'object',
      properties: {
        parent: { type: 'string', description: 'Parent directory path' },
        name: { type: 'string', description: 'Folder name (not full path)' },
      },
      required: ['parent', 'name'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  const path = await invoke<string>('create_folder', { parent: args.parent as string, name: args.name as string, root });
  return path;
});

registerTool('list_directory', {
  type: 'function',
  function: {
    name: 'list_directory',
    description: 'List files and folders in a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  const entries = await invoke<Array<{
    name: string;
    path: string;
    is_dir: boolean;
    is_file: boolean;
    size: number;
  }>>('list_directory', { path: args.path as string, root });
  return entries.map(e => `${e.is_dir ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
});

registerTool('get_directory_tree', {
  type: 'function',
  function: {
    name: 'get_directory_tree',
    description: 'Get the full directory tree structure starting from a root.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Root directory path' },
        depth: { type: 'number', description: 'Maximum depth (default 3)' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  const tree = await invoke<{
    name: string;
    path: string;
    is_dir: boolean;
    children: unknown[];
  }>('get_directory_tree', { path: args.path as string, depth: (args.depth as number) ?? 3, root });

  function formatNode(node: typeof tree, indent: number): string {
    const prefix = '  '.repeat(indent);
    const icon = node.is_dir ? '[DIR]' : '[FILE]';
    let result = `${prefix}${icon} ${node.name}\n`;
    if (node.is_dir && node.children) {
      for (const child of node.children as typeof tree[]) {
        result += formatNode(child, indent + 1);
      }
    }
    return result;
  }

  return formatNode(tree, 0);
});

registerTool('search_code', {
  type: 'function',
  function: {
    name: 'search_code',
    description: 'Search for text patterns in files within a directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Root directory to search in' },
        pattern: { type: 'string', description: 'Text pattern to find' },
        filePattern: { type: 'string', description: 'File name pattern e.g. "*.cpp" or "*main*" (optional)' },
      },
      required: ['path', 'pattern'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  const results = await invoke<Array<{
    path: string;
    line_number: number;
    content: string;
  }>>('grep_search', {
    root_path: args.path as string,
    pattern: args.pattern as string,
    file_pattern: (args.filePattern as string) ?? null,
    max_results: 50,
    root,
  });

  if (results.length === 0) return 'No matches found.';
  return results.map(r => `${r.path}:${r.line_number}: ${r.content}`).join('\n');
});

registerTool('build_project', {
  type: 'function',
  function: {
    name: 'build_project',
    description: 'Build the PlatformIO project.',
    parameters: {
      type: 'object',
      properties: {
        projectPath: { type: 'string', description: 'Absolute path to project root (directory with platformio.ini)' },
      },
      required: ['projectPath'],
    },
  },
}, async (args) => {
  const result = await invoke<{
    success: boolean;
    stdout: string;
    stderr: string;
    return_code: number;
    duration_ms: number;
  }>('build_project', { projectPath: args.projectPath as string });

  if (result.success) {
    return `Build successful (${result.duration_ms}ms)\n\n--- Build Output ---\n${result.stdout}`;
  }
  return `Build FAILED (${result.duration_ms}ms)\n\n--- Stdout ---\n${result.stdout}\n\n--- Stderr ---\n${result.stderr}`;
});

registerTool('run_shell', {
  type: 'function',
  function: {
    name: 'run_shell',
    description: 'Run an arbitrary shell command.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
      },
      required: ['command'],
    },
  },
}, async (args) => {
  const root = useFileStore.getState().rootPath;
  const result = await invoke<{
    stdout: string;
    stderr: string;
    return_code: number;
  }>('run_shell', {
    command: args.command as string,
    cwd: (args.cwd as string) ?? null,
    root,
  });

  const output = `Exit code: ${result.return_code}\n\n--- Stdout ---\n${result.stdout}\n\n--- Stderr ---\n${result.stderr}`;
  return output;
});

export function getAllToolDefinitions(): ToolDefinition[] {
  return Object.values(toolRegistry).map(t => t.definition);
}

export async function executeTool(callId: string, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const tool = toolRegistry[name];
  if (!tool) {
    return { callId, toolCallId: callId, success: false, output: `Unknown tool: ${name}` };
  }

  if (isBlocked(name)) {
    return { callId, toolCallId: callId, success: false, output: `Tool "${name}" is blocked. Change permission in Settings.` };
  }

  if (shouldPromptForPermission(name)) {
    const toolDef = tool.definition.function;
    const argStr = JSON.stringify(args);
    useAIStore.getState().setPendingPermission({
      toolName: name,
      toolDescription: toolDef.description,
      arguments: argStr,
    });

    const timeout = setTimeout(() => {
      useAIStore.getState().setPermissionDecision('deny');
    }, 30000);

    await new Promise<void>((resolve) => {
      const check = () => {
        const pending = useAIStore.getState().pendingPermission;
        if (pending === null) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });

    const decision = useAIStore.getState().lastPermissionDecision;
    useAIStore.getState().setPermissionDecision(null);

    if (decision === 'deny') {
      return { callId, toolCallId: callId, success: false, output: `Tool "${name}" was denied by user.` };
    }
    if (decision === 'denyAll') {
      useSettingsStore.getState().setToolPermission(name, 'block');
      return { callId, toolCallId: callId, success: false, output: `Tool "${name}" was denied and blocked for future.` };
    }
    if (decision === 'allowAll') {
      useSettingsStore.getState().setToolPermission(name, 'allow');
    }
  }

  try {
    useAIStore.getState().setToolProgress({
      toolId: callId,
      toolName: name,
      stage: 'starting',
      message: `Executing ${name}...`,
      elapsedMs: 0,
    });

    useAIStore.getState().setToolProgress({
      toolId: callId,
      toolName: name,
      stage: 'running',
      message: `Running ${name}...`,
      percent: 50,
      elapsedMs: 0,
    });

    const startTime = Date.now();
    const output = await tool.execute(args);
    const elapsedMs = Date.now() - startTime;

    useAIStore.getState().setToolProgress({
      toolId: callId,
      toolName: name,
      stage: 'complete',
      message: `${name} completed`,
      percent: 100,
      elapsedMs,
    });

    setTimeout(() => useAIStore.getState().setToolProgress(null), 2000);

    return { callId, toolCallId: callId, success: true, output: typeof output === 'string' ? output : JSON.stringify(output) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    useAIStore.getState().setToolProgress({
      toolId: callId,
      toolName: name,
      stage: 'error',
      message: msg,
      elapsedMs: 0,
    });

    setTimeout(() => useAIStore.getState().setToolProgress(null), 3000);

    return { callId, toolCallId: callId, success: false, output: `Error: ${msg}` };
  }
}

export function getToolNames(): string[] {
  return Object.keys(toolRegistry);
}
