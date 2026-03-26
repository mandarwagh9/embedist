---
sidebar_position: 1
---

# AI Modes

Embedist provides four specialized AI modes, each designed for different workflows.

## Overview

| Mode | Purpose | Tools |
|------|---------|-------|
| **Chat** | Q&A, learning, general help | None |
| **Plan** | Project planning, milestones | None |
| **Agent** | Autonomous code implementation | Full file/system access |
| **Debug** | Hardware-aware debugging | File read/search tools |

## Chat Mode

Chat mode is your friendly assistant for:
- Understanding hardware concepts
- Explaining code snippets
- General programming questions
- Learning new frameworks

**How to use**: Press `Ctrl+1` or click the Chat tab.

## Plan Mode

Plan mode helps you structure your projects:
- Break down features into milestones
- Define implementation steps
- Review and approve before building

**How to use**: Press `Ctrl+2` or click the Plan tab.

## Agent Mode

Agent mode is autonomous:
- Reads your project files
- Creates and modifies code
- Runs builds and uploads
- Uses PlatformIO CLI directly

**Tools available**:
- File read/write
- Execute shell commands
- PlatformIO build/upload
- Serial monitor interaction

**How to use**: Press `Ctrl+3` or click the Agent tab.

## Debug Mode

Debug mode is hardware-aware debugging with file access:
- Reads project files to understand context
- Searches code for error patterns
- Accesses build errors and serial logs
- Uses board-specific knowledge

**Tools available**:
- `read_file` - Read any project file
- `search_code` - Search for patterns in code
- `list_directory` - Browse project structure
- `get_error_details` - Access build errors

**How to use**: Click the Debug tab or use keyboard shortcut.

## Keyboard Shortcuts

| Shortcut | Mode |
|----------|------|
| `Ctrl+1` | Chat |
| `Ctrl+2` | Plan |
| `Ctrl+3` | Agent |
| `Ctrl+4` | Debug |

## Provider Support

- **Chat & Plan**: All providers supported
- **Agent**: Requires tool-calling capable providers (OpenAI, Anthropic)
- **Debug**: Requires tool-calling capable providers (OpenAI, Anthropic)

Non-tool-call providers (DeepSeek, Ollama, Google) will fall back to text-only responses in Agent and Debug modes.
