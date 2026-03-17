# Embedist

<div align="center">

**AI-Native Embedded Development Environment**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/embedist/embedist)](https://github.com/embedist/embedist/stargazers)

</div>

## Overview

Embedist is an AI-native embedded development environment designed specifically for embedded systems. It understands both software and hardware context, and assists developers in writing, debugging, and optimizing firmware for real devices.

## Features

- 🤖 **Hardware-Aware AI Debugging** - Board-specific context for accurate fixes
- 📡 **Integrated Serial Monitor** - Real-time device communication
- 🔨 **Build & Upload** - PlatformIO integration
- 🔌 **Multi-Provider AI** - OpenAI, Anthropic, Google, DeepSeek, Ollama, Custom

## Screenshots

Coming soon...

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- PlatformIO (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/embedist/embedist.git
cd embedist/embedist

# Install dependencies
npm install

# Run development server
npm run tauri dev
```

See [Documentation](https://embedist.dev) for detailed setup instructions.

## Architecture

Embedist is built with:
- **Tauri 2** - Desktop framework
- **React** + TypeScript - Frontend
- **Monaco Editor** - Code editing
- **Zustand** - State management

## Documentation

- [Getting Started](docs/getting-started/installation.md)
- [Architecture](docs/architecture/overview.md)
- [Features](docs/features/code-editor.md)
- [AI Providers](docs/ai-providers/overview.md)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/development/contributing.md).

## License

MIT License - see [LICENSE](LICENSE) for details.
