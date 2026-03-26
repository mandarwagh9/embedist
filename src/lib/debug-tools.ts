import { invoke } from '@tauri-apps/api/core';

export interface DebugToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
      }>;
      required: string[];
    };
  };
}

export interface DebugToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface DebugToolResult {
  callId: string;
  toolCallId: string;
  success: boolean;
  output: string;
}

interface DebugToolEntry {
  definition: DebugToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

const debugToolRegistry: Record<string, DebugToolEntry> = {};

export function registerDebugTool(name: string, def: DebugToolDefinition, exec: (args: Record<string, unknown>) => Promise<unknown>) {
  debugToolRegistry[name] = { definition: def, execute: exec };
}

registerDebugTool('read_file', {
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read contents of a file to inspect code, error messages, or configuration.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  const content = await invoke<string>('read_file', { path: args.path as string });
  return content;
});

registerDebugTool('search_code', {
  type: 'function',
  function: {
    name: 'search_code',
    description: 'Search for code patterns in files. Use to find function definitions, error handling, or specific code patterns.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        path: { type: 'string', description: 'Directory path to search in (optional, defaults to project root)' },
      },
      required: ['pattern'],
    },
  },
}, async (args) => {
  const pattern = args.pattern as string;
  const path = args.path as string | undefined;
  const result = await invoke<{path: string, line_number: number, content: string}[]>('grep_search', { 
    rootPath: path || '.', 
    pattern, 
    filePattern: null,
    maxResults: 50 
  });
  if (result.length === 0) return 'No matches found';
  return result.map(r => `${r.path}:${r.line_number}: ${r.content}`).join('\n');
});

registerDebugTool('list_directory', {
  type: 'function',
  function: {
    name: 'list_directory',
    description: 'List files in a directory. Use to explore project structure or find specific files.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the directory' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  interface FileEntry {
    name: string;
    path: string;
    is_dir: boolean;
    is_file: boolean;
  }
  const files = await invoke<FileEntry[]>('list_directory', { path: args.path as string });
  return files.map(f => f.is_dir ? `${f.name}/` : f.name).join('\n');
});

registerDebugTool('get_directory_tree', {
  type: 'function',
  function: {
    name: 'get_directory_tree',
    description: 'Get the directory tree structure of a project. Use to understand the project layout.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the directory' },
        depth: { type: 'number', description: 'Maximum depth to traverse (optional, default 3)' },
      },
      required: ['path'],
    },
  },
}, async (args) => {
  interface TreeNode {
    name: string;
    path: string;
    is_dir: boolean;
    children: TreeNode[];
  }
  const tree = await invoke<TreeNode>('get_directory_tree', { 
    path: args.path as string, 
    depth: args.depth as number | undefined || 3 
  });
  
  function formatTree(node: TreeNode, indent: string = ''): string {
    let result = `${indent}${node.is_dir ? '📁 ' : '📄 '}${node.name}\n`;
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        result += formatTree(child, indent + '  ');
      }
    }
    return result;
  }
  
  return formatTree(tree);
});

registerDebugTool('run_shell', {
  type: 'function',
  function: {
    name: 'run_shell',
    description: 'Run a shell command to execute builds, tests, or other operations. Use to reproduce errors.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to run' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
      },
      required: ['command'],
    },
  },
}, async (args) => {
  const result = await invoke<{stdout: string, stderr: string, return_code: number}>('run_shell', { 
    command: args.command as string, 
    cwd: args.cwd as string | undefined || null 
  });
  if (result.return_code !== 0) {
    return `Exit code: ${result.return_code}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`;
  }
  return result.stdout || '(no output)';
});

registerDebugTool('get_error_details', {
  type: 'function',
  function: {
    name: 'get_error_details',
    description: 'Get detailed information about a build or runtime error. Use after seeing an error message to understand the root cause.',
    parameters: {
      type: 'object',
      properties: {
        errorMessage: { type: 'string', description: 'The error message to analyze' },
      },
      required: ['errorMessage'],
    },
  },
}, async (args) => {
  const error = args.errorMessage as string;
  const lower = error.toLowerCase();
  
  if (lower.includes('esp8266') || lower.includes('esp32')) {
    if (lower.includes('wifi') || lower.includes('connection')) {
      return `WiFi Connection Error Analysis:
- Check SSID/password correctness
- Verify board supports WiFi mode (ESP8266/ESP32 only)
- Ensure 2.4GHz network (not 5GHz)
- Check power supply (WiFi draws 200-300mA)
- Common fix: Add delay(1000) before WiFi.begin()`;
    }
    if (lower.includes('memory') || lower.includes('stack') || lower.includes('heap')) {
      return `Memory Error Analysis:
- ESP8266: 80KB flash, 50KB RAM available
- ESP32: ~300KB RAM available
- Tips:
  * Use F() macro for constant strings
  * Avoid String class in loops
  * Use static arrays instead of dynamic
  * Check for memory leaks in loop()`;
    }
  }
  
  if (lower.includes('i2c') || lower.includes('wire')) {
    return `I2C Error Analysis:
- Check wiring: SDA→GPIO4(D2), SCL→GPIO5(D1) on ESP8266
- Add pull-up resistors (4.7KΩ to VCC)
- Run I2C scanner to find device address
- Check device supports I2C (some sensors use SPI)
- Verify 100kHz or 400kHz speed matches device`;
  }
  
  if (lower.includes('spi')) {
    return `SPI Error Analysis:
- Check MISO/MOSI/CLK connections
- Verify CS pin selection
- Ensure common ground
- Check voltage compatibility (3.3V vs 5V)
- Try lower clock speed`;
  }
  
  if (lower.includes('serial') || lower.includes('uart')) {
    return `Serial/UART Error Analysis:
- Verify baud rate matches (common: 115200, 9600)
- Check TX/RX aren't swapped
- USB-serial chips need drivers (CH340, CP2102)
- ESP8266 bootloader: 74480 baud
- Add while(!Serial) for blocking wait`;
  }
  
  if (lower.includes('compile') || lower.includes('error:')) {
    return `Compilation Error Analysis:
- Check for typos in function names
- Verify library versions
- Check board selection in platformio.ini
- Common fixes:
  * Add missing #include headers
  * Check for missing semicolons
  * Verify variable types match
  * Check library documentation`;
  }
  
  return `Error pattern not recognized. Please provide more context about:
- What board/framework are you using?
- What were you trying to do when the error occurred?
- Does the error happen at compile time or runtime?`;
});

export function getDebugToolDefinitions(): DebugToolDefinition[] {
  return Object.values(debugToolRegistry).map(t => t.definition);
}

export async function executeDebugTool(callId: string, name: string, args: Record<string, unknown>): Promise<DebugToolResult> {
  const tool = debugToolRegistry[name];
  if (!tool) {
    return { callId, toolCallId: callId, success: false, output: `Unknown tool: ${name}` };
  }
  try {
    const output = await tool.execute(args);
    return { callId, toolCallId: callId, success: true, output: typeof output === 'string' ? output : JSON.stringify(output) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { callId, toolCallId: callId, success: false, output: `Error: ${msg}` };
  }
}
