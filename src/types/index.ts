import type { AIMode } from '../lib/ai-prompts';

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

export interface OpenTab {
  id: string;
  title: string;
  path: string;
  modified: boolean;
  pinned: boolean;
  content?: string;
}

export interface SerialPort {
  path: string;
  friendlyName?: string;
}

export interface SerialConfig {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
}

export interface SerialMessage {
  type: 'sent' | 'received' | 'system';
  data: string;
  timestamp: Date;
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  models: string[];
  apiKey?: string;
  baseUrl?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode: AIMode;
  feedback?: 'positive' | 'negative';
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CustomModel {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export type PlanPhase = 'explore' | 'design' | 'review' | 'ready' | 'clarify';

export type AgentStatus = 'idle' | 'running' | 'done';

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  type: 'read' | 'write' | 'build' | 'shell' | 'search' | 'info' | 'error' | 'done';
  message: string;
  details?: string;
}

export interface PlatformInfo {
  os: string;
  arch: string;
}

export interface BuildResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  duration?: number;
}

export interface Board {
  id: string;
  name: string;
  type: string;
}
