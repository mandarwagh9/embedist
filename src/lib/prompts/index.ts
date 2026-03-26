import { AIMode } from '../ai-prompts';
import agentPrompt from './modes/agent.md?raw';
import debugPrompt from './modes/debug.md?raw';
import chatPrompt from './modes/chat.md?raw';
import planPrompt from './modes/plan.md?raw';

export interface PromptConfig {
  name: string;
  description: string;
  icon: string;
  system: string;
  emptyState: {
    title: string;
    description: string;
  };
  context: {
    categories: string[];
    maxResults: number;
  };
}

export const PROMPTS: Record<AIMode, PromptConfig> = {
  chat: {
    name: 'Chat Assistant',
    description: 'Quick Q&A about embedded development',
    icon: 'chat',
    system: chatPrompt,
    emptyState: {
      title: 'Chat Assistant',
      description: 'Ask me anything about your embedded code, hardware connections, or debugging issues...',
    },
    context: {
      categories: ['hardware', 'error', 'code'],
      maxResults: 3,
    },
  },

  plan: {
    name: 'Project Planner',
    description: 'Collaborative project planning',
    icon: 'plan',
    system: planPrompt,
    emptyState: {
      title: 'Plan Mode',
      description: 'Describe what you want to build, and I\'ll create a structured implementation plan...',
    },
    context: {
      categories: ['hardware', 'code', 'patterns'],
      maxResults: 5,
    },
  },

  debug: {
    name: 'Debug Assistant',
    description: 'Systematic debugging assistance',
    icon: 'debug',
    system: debugPrompt,
    emptyState: {
      title: 'Debug Assistant',
      description: 'Paste an error message or describe the issue. Let\'s debug it together...',
    },
    context: {
      categories: ['error', 'code'],
      maxResults: 5,
    },
  },

  agent: {
    name: 'Agent Mode',
    description: 'Autonomous code implementation',
    icon: 'agent',
    system: agentPrompt,
    emptyState: {
      title: 'Agent Mode',
      description: 'Describe what you want me to implement. I will work autonomously...',
    },
    context: {
      categories: ['code', 'hardware', 'project'],
      maxResults: 3,
    },
  },
};

export function getSystemPrompt(mode: AIMode): string {
  return PROMPTS[mode]?.system || '';
}

export function getPromptConfig(mode: AIMode): PromptConfig {
  return PROMPTS[mode];
}

export { agentPrompt, debugPrompt, chatPrompt, planPrompt };
