---
sidebar_position: 2
---

# Components

Detailed breakdown of Embedist's core components.

## 1. Code Editor

The Monaco-based code editor provides:

- **Syntax Highlighting**: C/C++, Arduino, ESP-IDF
- **IntelliSense**: Auto-completion for Arduino/ESP32 APIs
- **Multi-file Editing**: Tab-based interface
- **Error Highlighting**: Inline error markers
- **Find & Replace**: Regex support

### Key Files
- `src/components/Editor/CodeEditor.tsx`
- `src/components/Editor/EditorTabs.tsx`
- `src/components/Editor/EditorSidebar.tsx`

## 2. Serial Monitor

Real-time serial communication featuring:

- **Auto-detect Ports**: List available COM ports
- **Baud Rate Selection**: 9600, 115200, etc.
- **Log Streaming**: Real-time output display
- **Command Input**: Send commands to device
- **Log Filtering**: Filter by regex/keywords

### Key Files
- `src/components/Serial/SerialMonitor.tsx`
- `src/components/Serial/SerialToolbar.tsx`
- `src/components/Serial/SerialOutput.tsx`

## 3. AI Debugger

The core intelligent component:

- **Context Gathering**: Collects project code, errors, logs
- **Knowledge Base**: RAG system with hardware info
- **Provider Integration**: Multiple AI providers
- **Fix Suggestions**: Specific, actionable responses

### Key Files
- `src/lib/ai/providerManager.ts`
- `src/lib/ai/ragEngine.ts`
- `src/components/AI/AIChatPanel.tsx`

## 4. Board Manager

Hardware management:

- **Auto-detection**: Identify connected boards
- **Pin Mappings**: Board-specific pin configurations
- **Memory Info**: RAM/Flash constraints
- **Peripherals**: Supported peripherals list

### Key Files
- `src/lib/embedded/boardDatabase.ts`
- `src/lib/embedded/pinMappings.ts`

## 5. Build System

Integration with PlatformIO:

- **Compilation**: Build firmware
- **Upload**: Flash to device
- **Error Parsing**: Extract and display errors
- **Progress Display**: Build progress indicators

### Key Files
- `src/hooks/useBuild.ts`
- `src-tauri/src/commands/build.rs`

## State Management

Embedist uses Zustand for state management:

| Store | Purpose |
|-------|---------|
| `projectStore` | Project files, tabs, active file |
| `aiStore` | AI providers, chat history |
| `serialStore` | Connection, logs, port |
| `settingsStore` | User preferences |
