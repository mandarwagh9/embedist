import { invoke } from '@tauri-apps/api/core';
import { useFileStore } from '../../../stores/fileStore';
import { useUIStore } from '../../../stores/uiStore';

export interface ProjectContext {
  rootPath: string;
  directoryTree?: string;
  platformioBoard?: string;
  toolchain: 'platformio' | 'arduino-cli' | 'esp-idf';
  availableBoards?: string[];
  serialPort?: string;
  serialBaud?: number;
}

export interface BoardInfo {
  id: string;
  name: string;
  platform: string;
  mcu?: string;
  frequency?: string;
  flash_size?: string;
  ram_size?: string;
}

export async function buildProjectContext(): Promise<ProjectContext> {
  const fileStore = useFileStore.getState();
  const uiStore = useUIStore.getState();
  
  const rootPath = fileStore.rootPath || '';
  
  let toolchain: ProjectContext['toolchain'] = 'platformio';
  let platformioBoard: string | undefined;
  
  try {
    const boards = await invoke<BoardInfo[]>('list_boards', { query: '' });
    if (boards.length > 0) {
      platformioBoard = boards[0].name;
      toolchain = 'platformio';
    }
  } catch {
    try {
      const hasEspIdf = await checkForEspIdfProject(rootPath);
      if (hasEspIdf) {
        toolchain = 'esp-idf';
      }
    } catch {
      const hasArduino = await checkForArduinoProject(rootPath);
      if (hasArduino) {
        toolchain = 'arduino-cli';
      }
    }
  }
  
  return {
    rootPath,
    platformioBoard,
    toolchain,
    serialPort: uiStore.serialPort || undefined,
    serialBaud: uiStore.serialBaudRate,
  };
}

async function checkForArduinoProject(path: string): Promise<boolean> {
  try {
    interface FileEntry {
      name: string;
      is_file: boolean;
    }
    const files = await invoke<FileEntry[]>('list_directory', { path, root: path });
    return files.some(f => f.is_file && f.name.endsWith('.ino'));
  } catch {
    return false;
  }
}

async function checkForEspIdfProject(path: string): Promise<boolean> {
  try {
    interface FileEntry {
      name: string;
      is_file: boolean;
    }
    const files = await invoke<FileEntry[]>('list_directory', { path, root: path });
    const names = files.map(f => f.name);
    return names.includes('CMakeLists.txt') && names.includes('sdkconfig');
  } catch {
    return false;
  }
}

export function formatContextForPrompt(context: ProjectContext): string {
  let output = `## Current Project Context\n\n`;
  output += `**Project Root**: ${context.rootPath || 'No project open'}\n\n`;
  
  if (context.platformioBoard) {
    output += `**Board**: ${context.platformioBoard}\n`;
    output += `**Toolchain**: ${context.toolchain}\n\n`;
  }
  
  if (context.serialPort) {
    output += `**Serial**: ${context.serialPort} @ ${context.serialBaud} baud\n\n`;
  }
  
  return output;
}

export function getBoardSpecificGuidance(board: string | undefined): string {
  if (!board) return '';
  
  const lower = board.toLowerCase();
  
  let guidance = '\n## Board-Specific Guidance\n\n';
  
  if (lower.includes('esp8266')) {
    guidance += `### ESP8266 Notes
- Memory: 80KB flash, 50KB RAM available for sketches
- WiFi: Use WiFi.mode(WIFI_STA) for station mode
- Common pins: GPIO4 (D2), GPIO5 (D1) for I2C
- Bootloader: 74480 baud, AT commands: 115200 baud
- LED: Built-in on GPIO2 (inverted)\n`;
  } else if (lower.includes('esp32')) {
    guidance += `### ESP32 Notes
- Dual-core: Can run WiFi on one core, app on other
- RAM: ~300KB available (varies by partition)
- WiFi: Use WiFi.mode(WIFI_STA) for station mode
- BLE: Available on most ESP32 modules
- PSRAM: Check board config if external PSRAM used\n`;
  } else if (lower.includes('arduino') || lower.includes('uno') || lower.includes('nano')) {
    guidance += `### Arduino Notes
- ATmega328P: 32KB flash, 2KB RAM
- Avoid large string allocations in loop()
- Use PROGMEM for constant data
- I2C: A4 (SDA), A5 (SCL)\n`;
  }
  
  return guidance;
}

export function getToolchainCommands(toolchain: string): string {
  let cmds = '\n## Toolchain Commands\n\n';
  
  if (toolchain === 'platformio') {
    cmds += '- Build: `pio run`\n';
    cmds += '- Upload: `pio run --target upload`\n';
    cmds += '- Clean: `pio run --target clean`\n';
    cmds += '- List boards: `pio boards`\n';
    cmds += '- Monitor: `pio device monitor`\n';
  } else if (toolchain === 'arduino-cli') {
    cmds += '- Compile: `arduino-cli compile`\n';
    cmds += '- Upload: `arduino-cli upload`\n';
    cmds += '- Board list: `arduino-cli board list`\n';
  } else if (toolchain === 'esp-idf') {
    cmds += '- Build: `idf.py build`\n';
    cmds += '- Flash: `idf.py -p PORT flash`\n';
    cmds += '- Monitor: `idf.py -p PORT monitor`\n';
  }
  
  return cmds;
}
