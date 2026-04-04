export type AIMode = 'chat' | 'plan' | 'debug' | 'agent';

interface ModeConfig {
  name: string;
  description: string;
  icon: string;
  emptyState: {
    title: string;
    description: string;
  };
  context: {
    categories: string[];
    maxResults: number;
  };
}

export const SYSTEM_PROMPTS: Record<AIMode, ModeConfig> = {
  chat: {
    name: 'Chat Assistant',
    description: 'Quick Q&A about embedded development',
    icon: 'chat',
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
    emptyState: {
      title: 'Plan Mode',
      description: "Describe what you want to build, and I'll create a structured implementation plan...",
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
    emptyState: {
      title: 'Debug Assistant',
      description: "Paste an error message or describe the issue. Let's debug it together...",
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
