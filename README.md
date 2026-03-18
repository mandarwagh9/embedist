# Embedist

<div align="center">

**AI-Native Embedded Development Environment**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/mandarwagh9/embedist)](https://github.com/mandarwagh9/embedist/stargazers)
[![Version](https://img.shields.io/badge/version-v0.2.0-blue)](https://github.com/mandarwagh9/embedist/releases)
[![Windows](https://img.shields.io/badge/Windows-0078D4?logo=windows&logoColor=white)](https://github.com/mandarwagh9/embedist/releases)

</div>

## Overview

Embedist is an AI-native embedded development environment designed specifically for embedded systems. It understands both software and hardware context, and assists developers in writing, debugging, and optimizing firmware for ESP32, Arduino, and other microcontrollers.

## Features

- 🤖 **Hardware-Aware AI Debugging** - Board-specific context for accurate fixes
- 📡 **Integrated Serial Monitor** - Real-time device communication
- 🔨 **Build & Upload** - PlatformIO integration
- 🔌 **Multi-Provider AI** - OpenAI, Anthropic, Google, DeepSeek, Ollama, Custom endpoints
- 📁 **File Explorer** - Open folders, browse projects
- 📝 **Tab Management** - Close, pin, context menu with right-click
- ⌨️ **Keyboard Shortcuts** - VS Code-style shortcuts
- 🎨 **Monochrome Dark Theme** - Professional, distraction-free design

## Downloads

### Windows x64
[![Download](https://img.shields.io/badge/Download-embedist.exe-blue)](https://github.com/mandarwagh9/embedist/releases/download/v0.2.0/embedist.exe)

**[Latest Release (v0.2.0)](https://github.com/mandarwagh9/embedist/releases)** - Download the executable and run it directly. No installation required.

## Getting Started

### Quick Start
1. Download `embedist.exe` from [Releases](https://github.com/mandarwagh9/embedist/releases)
2. Run the application
3. Use `File > Open Folder` (Ctrl+O) to open a project folder
4. Start coding!

### Prerequisites

| Requirement | Description |
|-------------|-------------|
| Windows | Windows 10/11 (64-bit) |
| PlatformIO | Optional - for build & upload functionality |
| AI API Keys | Optional - for AI debugging features |

### Build from Source

```bash
# Clone repository
git clone https://github.com/mandarwagh9/embedist.git
cd embedist/embedist

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

The executable will be at `src-tauri/target/release/embedist.exe`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open Folder |
| `Ctrl+S` | Save File |
| `Ctrl+Shift+S` | Save All |
| `Ctrl+W` | Close Tab |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+J` | Toggle Bottom Panel |
| `Ctrl+,` | Open Settings |
| `Ctrl+Shift+E` | Explorer |
| `Ctrl+Shift+X` | AI Assistant |
| `Ctrl+Shift+L` | Serial Monitor |
| `Ctrl+Shift+B` | Build Panel |

## Supported Boards

### ESP32 Family
- ESP32 Dev Module
- ESP32 WROOM
- ESP32 S3
- ESP32 C3
- ESP32 CAM
- NodeMCU-32S

### Arduino Family
- Arduino Uno
- Arduino Mega
- Arduino Nano
- Arduino Pro Mini
- Arduino Due
- Arduino Leonardo
- ESP8266
- Arduino Zero

## Architecture

Embedist is built with modern, lightweight technologies:

| Layer | Technology |
|-------|------------|
| Desktop Framework | [Tauri 2](https://tauri.app/) |
| Frontend | React + TypeScript |
| Code Editor | Monaco Editor |
| State Management | Zustand |
| Styling | CSS Variables |

### Directory Structure

```
embedist/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── stores/             # Zustand stores
│   ├── hooks/              # Custom hooks
│   └── lib/                # Utilities & knowledge base
├── src-tauri/              # Rust backend
│   ├── src/commands/       # Tauri commands
│   └── capabilities/       # Permissions
└── docs/                   # Documentation
```

## Documentation

- [Getting Started](docs/getting-started/installation.md)
- [Architecture](docs/architecture/overview.md)
- [Features](docs/features/code-editor.md)
- [AI Providers](docs/ai-providers/overview.md)

## Roadmap

- [ ] Real PlatformIO integration (build/upload)
- [ ] Hardware debugging (JTAG/SWD)
- [ ] Project templates (ESP32, Arduino)
- [ ] Git integration
- [ ] Terminal emulator
- [ ] Custom board configurations

## Known Issues

- Build/Upload commands are mocked (coming in v0.3.0)
- Serial monitor requires Chromium-based browser features

## Acknowledgments

Thanks to **[Jiya Mehta](https://github.com/JiyaMehta-6)** for brainstorming the concept and helping shape Embedist's vision.

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/development/contributing.md).

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for embedded developers

</div>
