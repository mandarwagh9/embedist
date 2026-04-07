# AGENTS.md - Embedist Development Guide

**Project**: AI-native embedded development environment (Tauri 2 + React + TypeScript + Rust)  
**Platform**: Windows only | **Git**: `embedist/embedist/` | **Version**: v0.34.0

---

## Quick Start

```bash
# Clone and setup
git clone https://github.com/mandarwagh9/embedist.git
cd embedist/embedist

# Install dependencies
npm install

# Run in development
npm run tauri dev
```

---

## Build Commands

### Frontend
```bash
npm run dev          # Dev server on http://localhost:1420
npm run build        # TypeScript check + Vite build (fails on any error)
npm run preview      # Preview production build
npm run lint         # ESLint check
```

### Full Tauri App
```bash
npm run tauri dev    # Run in development mode with hot reload
npm run tauri build  # Build release EXE → src-tauri/target/release/embedist.exe
```

### Rust
```bash
cargo check          # Quick type check without building
cargo build          # Debug build
cargo build --release # Release build (optimized)
cargo clippy         # Lint - MUST fix all warnings before committing
cargo fmt            # Format code
cargo test           # No tests yet (manual testing only)
```

### Pre-commit Checklist
```bash
npm run build && cd src-tauri && cargo clippy
```

---

## Code Style

### TypeScript / React
- **Files**: `PascalCase.tsx` (components), `camelCase.ts` (utilities/hooks/stores/types)
- **CSS**: Co-located `.css` file for each `.tsx`
- **Imports order**: React → types → stores → hooks → components → lib → CSS
- **TypeScript**: `strict: true`, no `any`, explicit types required
- **Zustand**: Use `create<Interface>()` + `persist`, immutable updates via `set(state => ({...}))`
- **CRITICAL**: In async functions, use `getState()` not hook closure values
- **Error handling**: try/catch with `finally` for cleanup
- **No comments** unless explicitly requested

### Rust
- **Modules**: `commands/` - one file per domain (`ai.rs`, `filesystem.rs`, `platformio.rs`, `serial.rs`)
- **Commands**: `#[tauri::command]`, return `Result<T, String>`
- **State**: `tauri::State<T>` with `parking_lot::Mutex`
- **Naming**: `snake_case` (vars), `PascalCase` (types), `SCREAMING_SNAKE_CASE` (consts)
- **Format**: `cargo fmt` before commit, fix all clippy warnings

---

## Architecture

### Frontend (`src/`)

```
src/
├── components/
│   ├── AI/           # AIChatPanel, MessageBubble, ModeToggle, PlanPanel, AgentToolbar
│   ├── Build/        # BuildPanel (PlatformIO integration)
│   ├── Common/       # ErrorBoundary, Toast, CommandPalette, ToolPermissionDialog
│   ├── Editor/       # Monaco editor wrapper, useMonacoEditor hook
│   ├── FileExplorer/ # FileExplorer, TreeItem, ContextMenu, Breadcrumbs, RecentFiles
│   ├── Layout/       # TitleBar, MenuBar, Sidebar, TabBar, StatusBar, BottomPanel
│   ├── Serial/       # SerialMonitor (Web Serial API)
│   └── Settings/    # SettingsModal, SetupWizard, sections for AI/Editor/Build/Serial
├── stores/
│   ├── aiStore.ts       # AI messages, mode, agent state, streaming
│   ├── fileStore.ts     # File tree, tabs, content, persistence
│   ├── settingsStore.ts # AI providers, editor config, theme, persisted
│   └── uiStore.ts        # Sidebar, bottom panel, modals
├── hooks/
│   ├── useAI.ts          # Chat, streaming, provider handling
│   ├── useAgent.ts       # Agent loop, tool execution, activity log
│   ├── useBuild.ts       # PlatformIO build/upload, output streaming
│   ├── useFileSystem.ts  # File operations, directory listing
│   ├── useSerial.ts      # Web Serial API connection
│   ├── useFileWatcher.ts # File change events
│   └── useAIProviderSync.ts # Zustand ↔ Rust provider sync
├── lib/
│   ├── prompts/modes/   # agent.md, plan.md, debug.md, chat.md (system prompts)
│   ├── agent-tools.ts    # Tool definitions for Agent mode
│   ├── plan-tools.ts     # Tool definitions for Plan mode
│   ├── debug-tools.ts    # Tool definitions for Debug mode
│   ├── ai-prompts.ts     # Prompt loading, mode configuration
│   └── rag.ts            # RAG engine for project context
└── types/
    └── index.ts          # Shared TypeScript interfaces
```

### Backend (`src-tauri/src/`)

```
src-tauri/src/
├── lib.rs              # App entry, plugin init, command registration
├── main.rs             # Binary entry point
└── commands/
    ├── mod.rs          # Re-exports
    ├── ai.rs           # OpenAI/Anthropic/DeepSeek/Ollama/Google/custom API
    ├── filesystem.rs   # File ops, path validation, shell commands
    ├── platformio.rs   # Build, upload, board detection
    ├── serial.rs       # Serial port listing (not used - Web Serial)
    ├── pty.rs          # PTY for terminal
    └── watch.rs        # File system watcher
```

---

## AI Modes

| Mode | Tools | Purpose | Provider Support |
|------|-------|---------|------------------|
| **Chat** | None | Q&A about your code | All |
| **Plan** | read_file, search_code, web_search | Collaborative project planning | All |
| **Debug** | read_file, search_code, list_directory, get_error_details | Board-aware error debugging | All |
| **Agent** | All file/build/shell tools | Autonomous code implementation | OpenAI, Anthropic, Custom (tool calling) |

### Tool-Calling Providers
Only OpenAI, Anthropic, and compatible custom endpoints support tool calling. DeepSeek/Ollama/Google are text-only — Agent mode will show a warning banner.

---

## Critical Patterns

### Store Access in Async Functions
```typescript
// WRONG - stale closure value
const { messages } = useAIStore();
await sendMessage(messages);

// CORRECT - fresh state from store
const messages = useAIStore.getState().messages;
await sendMessage(messages);
```

### Adding a Tauri Command
1. Add `#[tauri::command]` in `src-tauri/src/commands/<domain>.rs`
2. Re-export from `commands/mod.rs` with `pub use <domain>::*`
3. Register in `lib.rs` `invoke_handler`
4. Call from TypeScript: `invoke('command_name', params)`

### State Persistence
- Zustand stores use `persist` middleware with `localStorage`
- `partialize` controls which fields are saved
- Map fields require custom `onRehydrateStorage` to convert objects back to Maps

---

## Debugging

### Frontend
- Open DevTools: `F12` or right-click → Inspect
- Check Console for errors
- Use React DevTools browser extension

### Rust Backend
- Logs via `log::info!()`, `log::error!()` 
- Check `tauri.conf.json` → `build → devtools: true`
- Panics: check terminal output or Windows Event Viewer

### Common Issues
- **"Not responding" on startup**: Check deferred initialization in useEffects (500ms+ delays)
- **Agent loses context**: Ensure `tool_calls` are included in conversation messages
- **API keys lost on restart**: Check `partialize` in settingsStore doesn't strip keys

---

## Release Process

```bash
# 1. Ensure clean build
npm run build && cargo clippy

# 2. Bump version (package.json, Cargo.toml, tauri.conf.json)
#    Example: v0.34.0 → v0.35.0

# 3. Build release
npm run tauri build

# 4. Commit version bump
git add -A && git commit -m "chore: bump version to v0.35.0"

# 5. Push
git push origin main

# 6. Create and push tag
git tag v0.35.0 && git push origin v0.35.0

# 7. Create GitHub release with artifacts
gh release create v0.35.0 --title "v0.35.0" --notes "..." \
  src-tauri/target/release/bundle/nsis/Embedist_0.35.0_x64-setup.exe

# 8. Upload portable EXE
gh release upload v0.35.0 src-tauri/target/release/embedist.exe --clobber
```

---

## Known Issues

| Issue | Impact | Workaround |
|-------|--------|------------|
| Windows PTY resize is no-op | Terminal can't resize | Use external terminal |
| FileExplorer drag-drop | Stub feature | Use context menu |
| `SerialConfig` dead_code warning | Rust lint warning | Ignore or remove |
| Agent with non-tool provider | Shows warning banner | Use OpenAI/Anthropic |

---

## Keyboard Shortcuts

### File Operations
| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open Folder |
| `Ctrl+S` | Save File |
| `Ctrl+Alt+S` | Save All |
| `Ctrl+W` | Close Tab |
| `Ctrl+Tab` | Cycle Tabs |

### Navigation
| Shortcut | Action |
|----------|--------|
| `Ctrl+,` | Open Settings |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+J` | Toggle Bottom Panel |
| `Ctrl+Shift+E` | Focus File Explorer |
| `Ctrl+Shift+X` | Focus AI Assistant |
| `Ctrl+Shift+L` | Focus Serial Monitor |
| `Ctrl+Shift+B` | Focus Build Panel |
| `Ctrl+Shift+P` | Command Palette |

### AI Modes
| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Chat Mode |
| `Ctrl+2` | Plan Mode |
| `Ctrl+3` | Agent Mode |
| `Ctrl+4` | Debug Mode |

### Build
| Shortcut | Action |
|----------|--------|
| `F5` | Build Project |
| `F6` | Upload Firmware |

### Editor
| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |
| `Ctrl+G` | Go to Line |
| `Ctrl+D` | Select Word |
| `Ctrl+Shift+L` | Select All Occurrences |
| `Alt+Shift+F` | Format Document |

---

## File Size Limits

| Operation | Limit |
|-----------|-------|
| File read | ~1MB recommended |
| WebSocket message | 16MB (Tauri limit) |
| Release EXE | ~5-10MB |

---

## Dependencies

### Frontend
- React 18+
- TypeScript (strict)
- Zustand (state)
- Monaco Editor
- Vite (build)

### Backend
- Tauri 2
- Rust (stable)
- reqwest (HTTP)
- regex (parsing)
- parking_lot (sync)
- urlencoding (URL parsing)

---

## Performance Notes

- Deferred initialization: heavy operations (file listing, board detection) have 200-500ms delays to prevent UI blocking
- Monaco loads async: use `isReady` state before rendering
- Zustand stores persist to localStorage: avoid storing large content
- File watcher uses Tauri events: don't block on file operations

---

## Testing

No automated test framework — all testing is manual:

1. Run `npm run tauri dev`
2. Open a PlatformIO project (ESP32/ESP8266/Arduino)
3. Test: file explorer, editor, AI modes, build, serial
4. Test: dark mode, theme toggle
5. Test: close and reopen app, verify persistence

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make changes following code style
4. Run `npm run build && cargo clippy`
5. Commit with descriptive message
6. Push and open PR

All changes go to `main` — no separate dev branch.