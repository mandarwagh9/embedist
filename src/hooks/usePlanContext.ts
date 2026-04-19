import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useFileStore } from '../stores/fileStore';
import { useAIStore } from '../stores/aiStore';
import { ragEngine } from '../lib/rag';
import type { FileNode } from '../stores/fileStore';

const KEY_FILE_PATTERNS = [
  /\.ino$/,
  /\.cpp$/,
  /\.c$/,
  /\.h$/,
  /platformio\.ini$/,
  /sdkconfig$/,
  /CMakeLists\.txt$/,
  /Makefile$/,
  /\.pio$/,
];

function flattenTree(nodes: FileNode[]): string {
  const lines: string[] = [];
  for (const node of nodes) {
    const icon = node.isDir ? '[DIR]' : '[FILE]';
    lines.push(`${icon} ${node.name}`);
    if (node.children) {
      const subLines = flattenTree(node.children);
      for (const sl of subLines.split('\n')) {
        lines.push('  ' + sl);
      }
    }
  }
  return lines.join('\n');
}

async function readKeyFile(path: string, maxLines = 50): Promise<{ name: string; path: string; preview: string } | null> {
  try {
    const root = useFileStore.getState().rootPath;
    const content = await invoke<string>('read_file', { path, root });
    const lines = content.split('\n');
    const preview = lines.slice(0, maxLines).join('\n');
    const truncated = lines.length > maxLines ? `\n... (${lines.length - maxLines} more lines)` : '';
    const name = path.replace(/\\/g, '/').split('/').pop() || path;
    return { name, path, preview: preview + truncated };
  } catch (err) {
    console.warn('Failed to read file for plan context:', err);
    return null;
  }
}

export function getPlanContextData(): {
  rootPath: string | null;
  projectName: string | null;
  files: FileNode[];
  isPlatformIOProject: boolean;
  detectedBoard: string | null;
} {
  return useFileStore.getState();
}

export async function buildPlanContext(query: string): Promise<string> {
  const { rootPath, projectName, files, isPlatformIOProject, detectedBoard } = getPlanContextData();
  const { selectedFiles } = useAIStore.getState();

  if (!rootPath) {
    return 'No project is currently open.';
  }

  const parts: string[] = [];

  const countFiles = (nodes: FileNode[]): { files: number; dirs: number } => {
    let files = 0;
    let dirs = 0;
    for (const node of nodes) {
      if (node.isDir) {
        dirs++;
        if (node.children) {
          const sub = countFiles(node.children);
          files += sub.files;
          dirs += sub.dirs;
        }
      } else {
        files++;
      }
    }
    return { files, dirs };
  };

  const counts = countFiles(files);
  const boardInfo = isPlatformIOProject && detectedBoard
    ? `\n- PlatformIO project detected`
    : '\n- Standard project';
  const boardDetail = detectedBoard ? `\n- Board: ${detectedBoard}` : '';

  parts.push(`## Project Summary
Project: ${projectName || 'Unnamed'}
Root: ${rootPath}
Structure: ${counts.files} files, ${counts.dirs} directories${boardInfo}${boardDetail}`);

  const expanded = files.map(n => ({ ...n, expanded: true }));
  parts.push(`\n## File Tree\n${flattenTree(expanded)}`);

  const collectKeyFiles = (nodes: FileNode[]): string[] => {
    const paths: string[] = [];
    for (const node of nodes) {
      if (node.isFile && KEY_FILE_PATTERNS.some(p => p.test(node.name))) {
        paths.push(node.path);
      }
      if (node.children) {
        paths.push(...collectKeyFiles(node.children));
      }
    }
    return paths;
  };

  const keyPaths = collectKeyFiles(files);
  const keyFileResults = await Promise.all(keyPaths.map(p => readKeyFile(p)));
  const keyFiles = keyFileResults.filter((r): r is NonNullable<typeof r> => r !== null).slice(0, 8);

  if (selectedFiles.length > 0) {
    const selectedPreviews = await Promise.all(selectedFiles.slice(0, 6).map(p => readKeyFile(p, 80)));
    const validSelected = selectedPreviews.filter((r): r is NonNullable<typeof r> => r !== null);
    if (validSelected.length > 0) {
      parts.push('\n## User-Selected Files\n');
      for (const file of validSelected) {
        parts.push(`\n### ${file.name} (${file.path})\n\`\`\`\n${file.preview}\n\`\`\``);
      }
    }
  }

  if (keyFiles.length > 0) {
    parts.push('\n## Key Files\n');
    for (const file of keyFiles) {
      parts.push(`\n### ${file.name} (${file.path})\n\`\`\`\n${file.preview}\n\`\`\``);
    }
  }

  let boardContext = '';
  if (detectedBoard) {
    boardContext = ragEngine.getBoardContext(detectedBoard, query || 'board capabilities');
    boardContext = boardContext ? `\n\n${boardContext}` : '';
  }
  parts.push(`\n## Board Information\n${detectedBoard ? `Board: ${detectedBoard}${boardContext}` : (isPlatformIOProject ? 'PlatformIO project detected but board not identified. Check platformio.ini.' : 'No board detected. Open a PlatformIO project or set the board in Settings.')}`);

  return parts.join('\n');
}

export function usePlanContext() {
  const { rootPath, projectName, files, isPlatformIOProject, detectedBoard } = useFileStore();

  const getProjectSummary = useCallback((): string => {
    if (!rootPath) return 'No project open.';

    const countFiles = (nodes: FileNode[]): { files: number; dirs: number } => {
      let files = 0;
      let dirs = 0;
      for (const node of nodes) {
        if (node.isDir) {
          dirs++;
          if (node.children) {
            const sub = countFiles(node.children);
            files += sub.files;
            dirs += sub.dirs;
          }
        } else {
          files++;
        }
      }
      return { files, dirs };
    };

    const counts = countFiles(files);
    const boardInfo = isPlatformIOProject && detectedBoard
      ? `\n- PlatformIO project detected`
      : '\n- Standard project';
    const boardDetail = detectedBoard ? `\n- Board: ${detectedBoard}` : '';

    return `Project: ${projectName || 'Unnamed'}
Root: ${rootPath}
Structure: ${counts.files} files, ${counts.dirs} directories${boardInfo}${boardDetail}`;
  }, [rootPath, projectName, files, isPlatformIOProject, detectedBoard]);

  const getFileTree = useCallback((): string => {
    if (!rootPath) return 'No project open.';
    const expanded = files.map(n => ({ ...n, expanded: true }));
    return flattenTree(expanded);
  }, [rootPath, files]);

  const getKeyFiles = useCallback(async (): Promise<Array<{ name: string; path: string; preview: string }>> => {
    if (!rootPath) return [];

    const collectKeyFiles = (nodes: FileNode[]): string[] => {
      const paths: string[] = [];
      for (const node of nodes) {
        if (node.isFile && KEY_FILE_PATTERNS.some(p => p.test(node.name))) {
          paths.push(node.path);
        }
        if (node.children) {
          paths.push(...collectKeyFiles(node.children));
        }
      }
      return paths;
    };

    const keyPaths = collectKeyFiles(files);
    const results = await Promise.all(keyPaths.map(p => readKeyFile(p)));
    return results.filter((r): r is NonNullable<typeof r> => r !== null).slice(0, 10);
  }, [rootPath, files]);

  const getBoardInfo = useCallback((query = ''): string => {
    if (!detectedBoard) {
      if (isPlatformIOProject) {
        return 'Board detected as PlatformIO project but specific board not identified. Check platformio.ini for board configuration.';
      }
      return 'No board detected. Open a PlatformIO project or set the board in Settings.';
    }
    const boardContext = ragEngine.getBoardContext(detectedBoard, query || 'board capabilities');
    return boardContext
      ? `Board: ${detectedBoard}\n\n${boardContext}`
      : `Board: ${detectedBoard} (no additional context available)`;
  }, [detectedBoard, isPlatformIOProject]);

  return {
    getProjectSummary,
    getFileTree,
    getKeyFiles,
    getBoardInfo,
    rootPath,
    projectName,
    detectedBoard,
    isPlatformIOProject,
  };
}
