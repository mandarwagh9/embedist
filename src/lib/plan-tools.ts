import { invoke } from '@tauri-apps/api/core';
import { useFileStore } from '../stores/fileStore';
import type { ToolDefinition, ToolResult } from './agent-tools';

export function getPlanToolDefinitions(): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the internet for information about boards, sensors, libraries, tutorials, datasheets, pinout diagrams, and best practices.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query. Be specific: include board name, component model, and what you need to know.' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'read_file',
        description: 'Read the contents of any file in the project.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute path to the file' },
          },
          required: ['path'],
        },
      },
    },
    {
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
    },
    {
      type: 'function',
      function: {
        name: 'get_directory_tree',
        description: 'Get the full directory tree structure.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Root directory path' },
            depth: { type: 'number', description: 'Maximum depth (default 3)' },
          },
          required: ['path'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_code',
        description: 'Search for text patterns in source files.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Root path to search in' },
            pattern: { type: 'string', description: 'Text pattern to find' },
            filePattern: { type: 'string', description: 'Optional file glob pattern (e.g. "*.cpp")' },
          },
          required: ['path', 'pattern'],
        },
      },
    },
  ];
}

export async function executePlanTool(callId: string, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case 'web_search': {
        const results = await invoke<Array<{ title: string; url: string; snippet: string }>>('web_search', {
          query: args.query as string,
        });
        const output = results.map((r, i) => `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n');
        return { callId, toolCallId: callId, success: true, output: output || 'No search results found.' };
      }

      case 'read_file': {
        const root = useFileStore.getState().rootPath;
        const content = await invoke<string>('read_file', { path: args.path as string, root });
        return { callId, toolCallId: callId, success: true, output: content };
      }

      case 'list_directory': {
        const root = useFileStore.getState().rootPath;
        const entries = await invoke<Array<{ name: string; path: string; is_dir: boolean; is_file: boolean }>>('list_directory', { path: args.path as string, root });
        const output = entries.map(e => `${e.is_dir ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
        return { callId, toolCallId: callId, success: true, output: output || 'Directory is empty.' };
      }

      case 'get_directory_tree': {
        const root = useFileStore.getState().rootPath;
        const tree = await invoke<{ name: string; path: string; is_dir: boolean; children: unknown[] }>('get_directory_tree', {
          path: args.path as string,
          depth: (args.depth as number) || 3,
          root,
        });
        const formatTree = (node: typeof tree, indent = 0): string => {
          const prefix = '  '.repeat(indent);
          let result = `${prefix}${node.is_dir ? '[DIR]' : '[FILE]'} ${node.name}\n`;
          if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
              result += formatTree(child as typeof tree, indent + 1);
            }
          }
          return result;
        };
        return { callId, toolCallId: callId, success: true, output: formatTree(tree) };
      }

      case 'search_code': {
        const results = await invoke<Array<{ path: string; line_number: number; content: string }>>('grep_search', {
          root_path: args.path as string,
          pattern: args.pattern as string,
          file_pattern: args.filePattern as string | null,
          max_results: 50,
        });
        const output = results.map(r => `${r.path}:${r.line_number}: ${r.content}`).join('\n');
        return { callId, toolCallId: callId, success: true, output: output || 'No matches found.' };
      }

      default:
        return { callId, toolCallId: callId, success: false, output: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { callId, toolCallId: callId, success: false, output: `Error: ${msg}` };
  }
}
