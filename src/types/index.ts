export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  expanded?: boolean;
}

export interface ProjectFile {
  name: string;
  path: string;
  content: string;
  language: string;
}
