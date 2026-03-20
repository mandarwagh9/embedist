# Embedist

<div align="center">

**AI-Native Embedded Development Environment**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/mandarwagh9/embedist)](https://github.com/mandarwagh9/embedist/stargazers)
[![Version](https://img.shields.io/badge/version-v0.8.5-blue)](https://github.com/mandarwagh9/embedist/releases)
[![Windows](https://img.shields.io/badge/Windows-0078D4?logo=windows&logoColor=white)](https://github.com/mandarwagh9/embedist/releases)

</div>

---

## Overview

Embedist is a Windows desktop application that combines AI assistance with embedded firmware development. Built with Tauri 2, React, and TypeScript, it brings board-aware AI debugging, real-time serial monitoring, and PlatformIO build integration into a single cohesive environment.

Open any project folder — ESP32, Arduino, or any embedded codebase — and get context-aware AI assistance that understands your hardware. Build, upload, monitor serial output, and iterate faster with AI that knows your board.

## Features

- 🤖 **Multi-Provider AI** — Chat, Plan, and Agent modes with support for OpenAI, Anthropic, Google, DeepSeek, Ollama, and custom vLLM endpoints
- 🔍 **Board-Aware Context** — AI debugging uses detected board info (ESP32 Dev Module, Arduino Uno, etc.) for accurate, hardware-specific fixes
- 📡 **Serial Monitor** — Real-time device communication with configurable baud rates and auto-connect
- 🔨 **Build & Upload** — PlatformIO CLI integration with live output streaming, parsed errors/warnings in a Problems panel, and a Stop Build button
- 📁 **File Explorer** — Context menus (rename, delete, copy path, reveal in explorer), breadcrumbs navigation, Command Palette (Ctrl+Shift+P), Recent Files, inline rename, multi-select
- 📝 **Tab Management** — Multi-tab editing with Monaco Editor, dirty indicators, save/close/pin operations, and keyboard shortcuts
- ⌨️ **Keyboard Shortcuts** — VS Code-style keybindings for all major operations
- 🎨 **Dark Theme** — Professional monochrome design with CSS variables
- ⚡ **Fast & Lightweight** — Tauri 2 Rust backend, ~5.7 MB executable, native performance

## Downloads

### Latest Release: v0.8.5

[![Download embedist.exe](https://img.shields.io/badge/Download-embedist.exe-blue)](https://github.com/mandarwagh9/embedist/releases/download/v0.8.5/embedist.exe)

Download the executable and run it directly — no installation required.

**[All Releases](https://github.com/mandarwagh9/embedist/releases)**

---

## Getting Started

### Quick Start

1. Download `embedist.exe` from [Releases](https://github.com/mandarwagh9/embedist/releases)
2. Run the application
3. Press `Ctrl+O` or use `File > Open Folder` to open a project directory
4. Configure your AI provider in `Settings` (`Ctrl+,`)
5. Start coding and debugging with AI assistance

### Prerequisites

| Requirement | Description |
|-------------|-------------|
| **Windows** | Windows 10/11 (64-bit) |
| **PlatformIO** | Optional — required for build & upload functionality |
| **AI API Key** | Optional — required for AI debugging features |

### Build from Source

```bash
# Clone the repository
git clone https://github.com/mandarwagh9/embedist.git
cd embedist/embedist

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev

# Build production executable
npm run tauri build
```

The executable will be generated at `src-tauri/target/release/embedist.exe`.

#### Rust Dependencies

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Run linter
cd src-tauri && cargo clippy
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open Folder |
| `Ctrl+S` | Save File |
| `Ctrl+Alt+S` / `Ctrl+K+S` | Save All |
| `Ctrl+W` | Close Tab |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+J` | Toggle Bottom Panel |
| `Ctrl+,` | Open Settings |
| `Ctrl+Shift+E` | Focus File Explorer |
| `Ctrl+Shift+X` | Focus AI Assistant |
| `Ctrl+Shift+L` | Focus Serial Monitor |
| `Ctrl+Shift+B` | Focus Build Panel |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+1` | AI Chat Mode |
| `Ctrl+2` | AI Plan Mode |
| `Ctrl+3` | AI Agent Mode |

---

## Supported Boards

### ESP32 Family
- ESP32 Dev Module
- ESP32 WROOM / WROVER
- ESP32 S3
- ESP32 C3 / C6
- ESP32 CAM
- NodeMCU-32S

### Arduino Family
- Arduino Uno / Nano / Mega
- Arduino Pro Mini
- Arduino Leonardo
- Arduino Due
- Arduino Zero
- ESP8266 (via Arduino framework)

### Other
- Any board supported by PlatformIO

---

## Architecture

Embedist is built on a modern, lightweight stack optimized for performance and developer experience.

| Layer | Technology |
|-------|------------|
| Desktop Framework | [Tauri 2](https://tauri.app/) — native WebView |
| Frontend | React 18 + TypeScript (strict mode) |
| Code Editor | Monaco Editor (VS Code's editor) |
| State Management | Zustand with `localStorage` persistence |
| AI Integration | OpenAI, Anthropic, Google, DeepSeek, Ollama, vLLM |
| Build System | PlatformIO CLI (`pio`, `pio run`, `pio device monitor`) |
| Serial Communication | Web Serial API (Chrome/Edge) |
| Styling | CSS Variables — no framework |

### Directory Structure

```
embedist/
├── src/
│   ├── components/
│   │   ├── AI/          # AIChatPanel, MessageBubble, CodeBlock, MarkdownRenderer,
│   │   │                # StreamingIndicator, FeedbackPanel, AgentActivityPanel,
│   │   │                # PromptSuggestions, PlanToolbar
│   │   ├── Build/       # BuildPanel, ProblemsPanel
│   │   ├── Editor/      # Monaco editor wrapper
│   │   ├── FileExplorer/ # FileExplorer, ContextMenu, Breadcrumbs,
│   │   │                  # CommandPalette, RecentFiles
│   │   ├── Layout/      # Sidebar, MenuBar, StatusBar, TitleBar
│   │   ├── Serial/      # SerialMonitor
│   │   └── Settings/    # Settings panels
│   ├── stores/          # aiStore, fileStore, settingsStore, uiStore
│   ├── hooks/           # useAI, useAgent, useBuild, useFileSystem,
│   │                    # useSerial, usePlanContext
│   ├── lib/             # ai-prompts.ts, rag.ts, agent-tools.ts
│   └── types/           # Shared TypeScript types
├── src-tauri/
│   └── src/
│       ├── commands/    # ai.rs, filesystem.rs, platformio.rs, serial.rs
│       ├── lib.rs       # App entry, plugin init, command registration
│       └── main.rs      # Binary entry
├── AGENTS.md             # Developer guide
└── package.json
```

---

## Known Issues

- Agent Mode: Non-tool-call providers (DeepSeek, Ollama, Google) fall back to text-only responses and do not execute tools
- Drag-and-drop files in the File Explorer is not yet implemented
- Settings toggle for "default implementation mode" is not exposed in the Settings UI

---

## Windows SmartScreen & Code Signing

When downloading and running unsigned executables, Windows SmartScreen may display a warning screen:

```
Windows Defender SmartScreen prevented an unrecognized app from starting.
This could put your PC at risk.
More info → Run anyway
```

This is **not a virus or malware warning**. It is a standard Windows security feature that flags any executable that:

1. Is **not signed** with a code signing certificate from a trusted Certificate Authority (CA)
2. Has **low download reputation** (new or low-traffic applications)

### Why Embedist Shows This Warning

Embedist is currently distributed as an **unsigned** executable. As an independent open-source project, it has not yet obtained a commercial code signing certificate. Windows SmartScreen treats all unsigned applications the same way — regardless of whether they are benign or malicious.

### How to Run Embedist Anyway

1. Click **"More info"** on the SmartScreen warning
2. Click **"Run anyway"**
3. The app will launch normally

This is a one-time action per downloaded file. Windows remembers your choice for that specific file.

### The Fix: Code Signing

The permanent solution is to **sign the executable** with a code signing certificate from a trusted CA. This causes SmartScreen to show the publisher's verified identity instead of an "unrecognized app" warning.

| Certificate Type | Cost | Result |
|---|---|---|
| **EV (Extended Validation)** | ~$288–599/yr | **Instant** SmartScreen trust — no warning |
| **OV (Organization Validation)** | ~$179–349/yr | Gradual reputation build — weeks to months |
| **Azure Artifact Signing** | Free (limited availability) | Instant trust if eligible (US/CA/EU/UK) |

**EV certificates** (e.g., [Sectigo](https://sectigostore.com), [SSL.com](https://www.ssl.com), [DigiCert](https://www.digicert.com)) are the industry standard for desktop applications. They provide **instant** SmartScreen reputation because Microsoft trusts the rigorous identity vetting process behind them.

**OV certificates** are cheaper but do not provide instant trust — the signed app still needs time to build reputation through downloads and executions.

**Azure Artifact Signing** is Microsoft's own free signing service ($0/month), but availability is restricted to organizations and developers in the USA, Canada, EU, and UK.

### For Contributors

If you are building Embedist from source, the resulting executable will also be unsigned. The same SmartScreen warning may appear for locally-built binaries. This is expected behavior for unsigned software and does not indicate a problem with the source code or build process.

---

## Changelog

### [v0.8.5](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.5) — 2026-03-20
- **Fix**: TitleBar now shows actual project name from store instead of hardcoded "No Project Open"
- **Fix**: File tree now persists on app restart

### [v0.8.4](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.4)
- **Fix**: Stop Build button now works via PID-based process killing
- **Fix**: Board detection uses `pio boards --json-output` dynamically
- **Fix**: All Ctrl+1/2/3 mode shortcuts registered and functional
- **Fix**: Ctrl+Alt+S / Ctrl+K+S shortcuts for Save All
- **Fix**: Build error parsing wired to Problems panel
- **Fix**: `navigator.serial` type safety improved
- **Fix**: Version number read from `package.json`
- **Fix**: `Math.random()` replaced with `crypto.randomUUID()` for deterministic IDs
- **Fix**: Deprecated `document.execCommand` replaced with `navigator.clipboard` API
- **Refactor**: AGENTS.md developer guide rewritten

### [v0.8.3](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.3)
- **UX**: Applied Fitts's Law (larger hit areas), Hick's Law (grouped menus), Doherty Threshold (skeleton loading), Postel's Law (fuzzy search)
- **Fix**: File contents persist across app restarts
- **Fix**: File Explorer reloads previously expanded folders
- **Fix**: Activity panel can be collapsed in Agent mode
- **Fix**: Input layout improved, plan approval flow corrected

### [v0.8.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.0)
- **New**: Context menu with rename, delete, copy path, reveal in explorer
- **New**: Breadcrumbs navigation
- **New**: Command Palette (Ctrl+Shift+P)
- **New**: Recent Files panel
- **New**: Inline rename in file tree
- **New**: Multi-select files
- **New**: Modified file indicators
- **New**: Refresh button and reveal in Explorer

### [v0.7.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.7.0)
- **New**: AI Chat UI complete redesign with streaming support
- **New**: Code blocks with syntax highlighting and copy button
- **New**: Feedback panel for AI responses
- **New**: Plan toolbar for approval workflow
- **New**: Agent Activity Panel
- **Fix**: Agent Mode — messages visible, approve triggers build, tool support

---

## Contributing

See [AGENTS.md](AGENTS.md) for developer setup, code conventions, build commands, and release process.

---

## Acknowledgments

Thanks to **[Jiya Mehta](https://github.com/JiyaMehta-6)** for brainstorming the concept and helping shape Embedist's vision.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for embedded developers

</div>
