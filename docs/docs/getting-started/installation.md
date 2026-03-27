---
sidebar_position: 1
---

# Installation

This guide will help you install Embedist on your system.

## Quick Install (Recommended)

### Option 1: Download EXE

1. Download `embedist.exe` from the [Releases](https://github.com/mandarwagh9/embedist/releases) page
2. Run the application directly — no installation required

### Option 2: NSIS Installer

1. Download `Embedist_0.17.0_x64-setup.exe` from [Releases](https://github.com/mandarwagh9/embedist/releases)
2. Run the installer
3. Follow the installation wizard

> **Windows SmartScreen**: If you see a SmartScreen warning, click "More info" then "Run anyway" to launch Embedist.

## Build from Source

If you want to build Embedist from source:

### Prerequisites

- **Node.js** 18.0 or higher
- **Rust** 1.70 or higher
- **npm** or **yarn**
- **PlatformIO** (optional, for building projects)

### Build Steps

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

## Platform-Specific Setup

### Windows

For building from source:

1. Install [Node.js](https://nodejs.org/) (LTS version recommended)
2. Install [Rust](https://rustup.rs/)
3. Install Visual Studio Build Tools

### macOS

```bash
# Using Homebrew
brew install node rust

# Install PlatformIO
pip install platformio
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install nodejs npm rustc cargo

# Install PlatformIO
pip3 install platformio
```

## First-Run Setup

On first launch, Embedist will guide you through:

1. **Setup Wizard** — Configure PlatformIO if needed
2. **Open a Project** — Use `Ctrl+O` to open your embedded project folder
3. **Configure AI** — Go to Settings (`Ctrl+,`) to add your AI provider

## Verify Installation

After launching Embedist, you should see the main interface with:
- File Explorer (left sidebar)
- Code Editor (center)
- AI Assistant (right panel)
- Status Bar (bottom)

## Next Steps

- [Quick Start Guide](/getting-started/quick-start) - Get started with your first project
- [Project Setup](/getting-started/project-setup) - Learn how to create and manage projects
