---
sidebar_position: 1
---

# Architecture Overview

Embedist is built on a modern architecture combining a Tauri desktop app with a React frontend.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Embedist Desktop App                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React     │  │   Monaco    │  │    Tauri Backend       │  │
│  │   Frontend  │  │   Editor    │  │    (Rust)              │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         └────────────────┼─────────────────────┘                │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────────────────┐  │
│  │                    IPC Bridge                             │  │
│  └───────────────────────┼───────────────────────────────────┘  │
│                          │                                       │
│  ┌──────────────┐  ┌─────┴─────┐  ┌────────────────────────┐  │
│  │  AI Provider │  │  Serial   │  │   Build System         │  │
│  │  Manager     │  │  Monitor  │  │   (PlatformIO)         │  │
│  └──────────────┘  └───────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend (React + TypeScript)
- **Monaco Editor**: Full-featured code editor with C/C++ support
- **Serial Monitor**: Web Serial API integration
- **AI Chat Panel**: Interface for AI interactions
- **Project Explorer**: File tree navigation

### Backend (Rust + Tauri)
- **File Operations**: Read/write project files
- **Serial Communication**: Native serial port access
- **Build Management**: PlatformIO process handling
- **Board Detection**: Hardware identification

### AI Layer
- **Provider Manager**: Multi-provider support
- **RAG Engine**: Retrieval-augmented generation
- **Knowledge Base**: Hardware-specific information

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Tauri 2 |
| Frontend | React 18 + TypeScript |
| Code Editor | Monaco Editor |
| State Management | Zustand |
| Serial Communication | Web Serial API + Rust serial |
| Build System | PlatformIO CLI |
| AI Integration | OpenAI SDK + Custom Providers |
| Documentation | Docusaurus |
