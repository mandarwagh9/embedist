---
sidebar_position: 1
---

# Installation

This guide will help you install Embedist on your system.

## Prerequisites

Before installing Embedist, ensure you have the following:

- **Node.js** 18.0 or higher
- **Rust** 1.70 or higher
- **npm** or **yarn**
- **PlatformIO** (optional, for building projects)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/embedist/embedist.git
cd embedist
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Rust dependencies (if building locally)
cd src-tauri && cargo install
```

### 3. Run Embedist

```bash
# Development mode
npm run tauri dev

# Production build
npm run tauri build
```

## Platform-Specific Setup

### Windows

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

## Verify Installation

After running `npm run tauri dev`, you should see the Embedist welcome screen.

## Next Steps

- [Quick Start Guide](/getting-started/quick-start) - Get started with your first project
- [Project Setup](/getting-started/project-setup) - Learn how to create and manage projects
