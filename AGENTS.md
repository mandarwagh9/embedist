# AGENTS.md - Embedist Development Guide

**Project**: AI-native embedded development environment (Tauri 2 + React + TypeScript + Rust)  
**Platform**: Windows only | **Git**: `embedist/embedist/` | **Version**: v0.34.0

---

## Build Commands

### Frontend
```bash
cd embedist/embedist
npm run dev          # Dev server on http://localhost:1420
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build
```

### Full Tauri App
```bash
npm run tauri dev    # Run in development mode
npm run tauri build  # Build release EXE → src-tauri/target/release/embedist.exe
```

### Rust
```bash
cd embedist/embedist/src-tauri
cargo check          # Quick type check
cargo build --release # Release build
cargo clippy         # Lint - fix all warnings before committing
cargo fmt            # Format code
```

### Single Test
No test framework - all testing is manual via `npm run tauri dev`.

### Pre-commit
```bash
cd embedist/embedist && npm run build
cd embedist/embedist/src-tauri && cargo clippy
```

---

## Code Style

### TypeScript / React
- **Files**: `PascalCase.tsx` (components), `camelCase.ts` (utilities/hooks/stores/types)
- **CSS**: Co-located `.css` file for each `.tsx`
- **Imports order**: React → types → stores → hooks → components → lib → CSS
- **TypeScript**: `strict: true`, no `any`, explicit types required
- **Zustand**: Use `create<Interface>()` + `persist`, immutable updates via `set(state => ({...}))`
- **CRITICAL**: In async functions, use `getState()` not hook closure values: `const msgs = useAIStore.getState().messages`
- **Error handling**: try/catch with `finally` for cleanup, extract errors: `err instanceof Error ? err.message : String(err)`
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
- **components/**: AI, Build, Common, Editor, FileExplorer, Layout, Serial, Settings
- **stores/**: aiStore, fileStore, settingsStore, uiStore (Zustand with persist)
- **hooks/**: useAI, useAgent, useBuild, useFileSystem, useSerial
- **lib/**: agent-tools.ts, debug-tools.ts, ai-prompts.ts, rag.ts
- **types/**: index.ts

### Backend (`src-tauri/src/`)
- `lib.rs`: App entry, command registration
- `commands/`: ai.rs (OpenAI/Anthropic/DeepSeek/Ollama/Google), filesystem.rs, platformio.rs, serial.rs

---

## AI Modes

| Mode | Tools | Purpose |
|------|-------|---------|
| Chat | None | Q&A |
| Plan | read_file, search_code, web_search | Planning (5-phase) |
| Debug | read_file, search_code, list_directory, get_error_details | Debugging |
| Agent | All file/build/shell tools | Implementation |

Only OpenAI and Anthropic support tool calling. DeepSeek/Ollama/Google are text-only.

---

## Critical Patterns

### Store Access in Async Functions
```typescript
// WRONG - stale closure
const { messages } = useAIStore();
await sendMessage(messages);

// CORRECT - fresh state
const messages = useAIStore.getState().messages;
await sendMessage(messages);
```

### Adding a Tauri Command
1. Add `#[tauri::command]` in `src-tauri/src/commands/<domain>.rs`
2. Re-export from `commands/mod.rs` with `pub use <domain>::*`
3. Register in `lib.rs` `invoke_handler`
4. Call from TypeScript: `invoke('command_name', params)`

---

## Git Workflow
- Branch: `main` only
- Releases: `gh release create v0.x.x --title "v0.x.x" --notes "..."`
- EXE: Include `src-tauri/target/release/embedist.exe` in release assets

---

## Known Issues
- Windows PTY terminal resize is a no-op due to ConPTY limitations
- Drag-drop files in FileExplorer is a stub
- `SerialConfig` in serial.rs has dead_code warning

---

## Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open Folder |
| Ctrl+S | Save File |
| Ctrl+, | Open Settings |
| Ctrl+B | Toggle Sidebar |
| Ctrl+J | Toggle Bottom Panel |
| Ctrl+Shift+E | Focus File Explorer |
| Ctrl+Shift+X | Focus AI Assistant |
| Ctrl+1-4 | Switch AI Mode (Chat/Plan/Agent/Debug) |