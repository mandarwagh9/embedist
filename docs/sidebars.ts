import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/quick-start', 'getting-started/project-setup'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/overview', 'architecture/components', 'architecture/ai-debugger'],
    },
    {
      type: 'category',
      label: 'Features',
      items: ['features/code-editor', 'features/serial-monitor', 'features/board-manager', 'features/build-upload'],
    },
    {
      type: 'category',
      label: 'AI Providers',
      items: ['ai-providers/overview', 'ai-providers/openai', 'ai-providers/anthropic', 'ai-providers/google', 'ai-providers/deepseek', 'ai-providers/ollama', 'ai-providers/custom-endpoints'],
    },
    {
      type: 'category',
      label: 'AI Modes',
      items: ['ai-modes/overview'],
    },
    {
      type: 'category',
      label: 'Development',
      items: ['development/setup', 'development/contributing', 'development/testing'],
    },
    {
      type: 'category',
      label: 'Troubleshooting',
      items: ['troubleshooting/common-issues', 'troubleshooting/faq'],
    },
  ],
};

export default sidebars;
