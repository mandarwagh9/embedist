export interface FileNode {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  isFile: boolean;
  size: number;
  modified?: number;
  children?: FileNode[];
  expanded?: boolean;
}

export interface ProjectFile {
  name: string;
  path: string;
  content: string;
  language: string;
}
