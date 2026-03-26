---
sidebar_position: 1
---

# Welcome to Embedist

Embedist is an **AI-native embedded development environment** designed specifically for embedded systems. It understands both software and hardware context, helping developers write, debug, and optimize firmware for real devices.

## Key Features

### 🤖 Hardware-Aware AI Debugging
Embedist understands your specific board (ESP32, Arduino, STM32), pin configurations, and hardware constraints. It provides specific, actionable fixes rather than generic suggestions. Includes Debug mode with file access tools.

### 📡 Integrated Serial Monitor
Real-time serial communication with your embedded devices directly in the application. Auto-detect baud rates and filter logs.

### 🔨 Build & Upload
Built-in PlatformIO integration for compiling and flashing firmware to your devices.

### 🔌 Multi-Provider AI
Use your preferred AI provider with multiple modes:
- **Chat** — Ask questions, get hardware-aware answers
- **Plan** — Collaborate on project plans before coding
- **Agent** — Autonomous code implementation with tools
- **Debug** — Hardware-aware debugging with file access tools

Supported providers:
- **OpenAI** (GPT-4o, GPT-4o-mini)
- **Anthropic** (Claude 3.5 Sonnet)
- **Google** (Gemini Pro/Flash)
- **DeepSeek** (DeepSeek Chat)
- **Ollama** (Local models)
- **Custom endpoints** (Add your own)

### 📚 Hardware Knowledge Base
RAG-powered system with:
- Board pin mappings
- Common error patterns
- Peripheral configurations
- Memory constraints

## Why Embedist?

Current AI tools lack awareness of:
- The target board
- Pin configurations
- Hardware constraints
- Runtime behavior

As a result, they generate generic code that often doesn't work in real systems. Embedist solves this by providing hardware-aware intelligence.

## Getting Started

Ready to start? Head to the [Installation Guide](/getting-started/installation) to set up Embedist.
