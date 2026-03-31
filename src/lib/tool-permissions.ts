import { useSettingsStore } from '../stores/settingsStore';

export type PermissionLevel = 'allow' | 'ask' | 'block';

export interface PermissionRequest {
  toolName: string;
  toolDescription: string;
  arguments: Record<string, unknown>;
}

export function checkPermission(toolName: string): PermissionLevel {
  const toolPermissions = useSettingsStore.getState().toolPermissions;
  return toolPermissions[toolName] || 'ask';
}

export function shouldPromptForPermission(toolName: string): boolean {
  const level = checkPermission(toolName);
  return level === 'ask';
}

export function isBlocked(toolName: string): boolean {
  return checkPermission(toolName) === 'block';
}

export function isAllowed(toolName: string): boolean {
  return checkPermission(toolName) === 'allow';
}