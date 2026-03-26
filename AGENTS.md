# AGENTS.md - Embedist Development Guide

**Project**: AI-native embedded development environment (Tauri 2 + React + TypeScript + Rust)
**Platform**: Windows only
**Git repo**: `embedist/embedist/` (not the root `embedist/` directory)
**Latest release**: v0.15.0

---

## Build Commands

### Frontend (React/TypeScript)
```bash
cd embedist/embedist
npm run dev          # Dev server on http://localhost:1420
npm run build        # TypeScript check + Vite build → dist/
npm run preview      # Preview production build
```

### Full Tauri App
```bash
npm run tauri dev    # Run in development mode
npm run tauri build  # Build release EXE → src-tauri/target/release/embedist.exe
```

### Rust Backend
```bash
cd embedist/embedist/src-tauri
cargo check             # Quick type check
cargo build             # Debug build
cargo build --release   # Release build
cargo clippy            # Lint — fix all warnings before committing
```

### Running Single Test
No test framework is currently set up. All testing is manual via `npm run tauri dev`.

### Pre-commit Checklist
```bash
# TypeScript
cd embedist/embedist && npm run build

# Rust
cd embedist/embedist/src-tauri && cargo clippy
```

---

## Code Style

### TypeScript / React

**File naming**: `PascalCase.tsx` for components, `camelCase.ts` for utilities/hooks/stores/types.
**CSS co-location**: Every `.tsx` component has a sibling `.css` file.

**Imports order** (strict, top to bottom):
1. React/framework (`react`, `@tauri-apps/api`)
2. Internal type imports (`../types`, `./types`)
3. Store imports (`../../stores/`)
4. Hook imports (`../../hooks/`)
5. Component imports (`../../components/`)
6. Utility/lib imports (`../../lib/`)
7. CSS import (`./Component.css`)

**TypeScript strictness** (tsconfig.json):
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- Always use explicit types for function parameters and return values
- Never use `any`; use `unknown` + type narrowing if needed

**State management (Zustand)**:
- Define a TypeScript `interface` for the store state
- Use `create<Interface>()` with `persist((set, get) => ({...}))`
- Immutable updates: `set(state => ({ ...state, field: newValue }))`
- **Critical**: Agents reading store state inside async functions must use `get()` (not captured closure values) — stale closures are a common bug source. Example: `const messages = useAIStore.getState().messages` inside `startAgentTask`, NOT `const { messages } = useAIStore()` from a hook.

**Error handling**: Wrap async ops in try/catch, always reset loading state in `finally`. Extract errors with `err instanceof Error ? err.message : String(err)`.

**Hooks**: Custom hooks live in `src/hooks/` and wrap Tauri `invoke` calls. Use `useCallback` for functions passed as props. Use `useEffect` for side effects (subscribe to store changes, keyboard listeners, etc.).

**No comments**: Do not add explanatory comments unless explicitly requested.

### Rust

**Module structure**: `src-tauri/src/commands/` — one file per domain (`ai.rs`, `filesystem.rs`, `platformio.rs`, `serial.rs`), all re-exported from `mod.rs` via `pub use filesystem::*`.

**Tauri commands**: Use `#[tauri::command]`, return `Result<T, String>` for fallible operations. Serialize with `#[derive(Serialize, Deserialize)]` from serde.

**Error handling**: Use `anyhow::Result` for application errors, `thiserror` for typed errors. Propagate with `?`.

**State management**: Use `tauri::State<T>` with `parking_lot::Mutex` for interior mutability. Default state structs with `#[derive(Default)]`.

**Naming**: `snake_case` for variables/functions, `PascalCase` for types, `SCREAMING_SNAKE_CASE` for constants.

**Formatting**: Run `cargo fmt` before committing. Clippy warnings are errors — fix them all.

---

## Project Architecture

### Frontend (`src/`)
```
components/
  AI/          # AIChatPanel, MessageBubble, CodeBlock, MarkdownRenderer,
               # StreamingIndicator, FeedbackPanel, AgentActivityPanel,
               # PromptSuggestions, PlanToolbar
  Build/       # Build panel components
  Common/      # Shared UI (resizable panels, etc.)
  Editor/      # Monaco editor wrapper
  FileExplorer/# FileExplorer, ContextMenu, Breadcrumbs, CommandPalette,
               # RecentFiles
  Layout/      # Sidebar, MenuBar, StatusBar
  Serial/      # Serial monitor
  Settings/    # Settings panel
stores/        # Zustand: aiStore, fileStore, settingsStore, uiStore
hooks/         # useAI, useAgent, useBuild, useFileSystem, useSerial, usePlanContext
lib/           # prompts/, rag.ts, agent-tools.ts, debug-tools.ts
types/         # index.ts (shared types)
```

### Backend (`src-tauri/src/`)
```
lib.rs         # App entry, plugin init, invoke_handler registration
main.rs       # Binary entry
commands/
  ai.rs        # AI API calls (OpenAI, Anthropic, vLLM, etc.)
  filesystem.rs # File CRUD + PlatformIO commands
  platformio.rs # Build/upload commands
  serial.rs    # Serial port communication
```

### Zustand Stores
- **fileStore**: File tree, open tabs, file contents (Maps), dirty state, PlatformIO detection
- **uiStore**: Sidebar, bottom panel, tabs, cursor position, serial/build state
- **settingsStore**: Editor/serial/build settings, AI providers, persisted via `localStorage`
- **aiStore**: AI mode (chat/plan/agent/debug), per-mode message histories, streaming state, feedback

---

## Git Workflow

- **Branch**: `main` only — no feature branches required
- **Commits**: One logical change per commit. Small, focused, descriptive messages.
- **Releases**: Tag and push after each meaningful fix or feature. Use `gh release create` with the EXE.
- **EXE**: Always include `embedist.exe` (from `src-tauri/target/release/embedist.exe`) in release assets.

### Release Commands
```bash
gh release create v0.x.x --title "v0.x.x" --notes "Changelog"
gh release upload v0.x.x embedist/embedist/src-tauri/target/release/embedist.exe
```

---

## Common Patterns

### Adding a Tauri command
1. Add `#[tauri::command]` fn in `src-tauri/src/commands/<domain>.rs`
2. Re-export from `commands/mod.rs` with `pub use <domain>::*`
3. Register in `lib.rs` `invoke_handler`
4. Call from TypeScript via `invoke()` in a hook

### Adding a store
1. Create `stores/NewStore.ts` with Zustand `persist` pattern
2. Import in `App.tsx` if needed at app level

### Adding a keyboard shortcut
1. Add handler in `App.tsx` `useEffect` (app-level) or `MenuBar.tsx` `useEffect`
2. Use `e.ctrlKey` for cross-platform compatibility
3. Always `e.preventDefault()` to suppress browser defaults

### Adding a UI component
1. Create `src/components/Category/ComponentName.tsx` + `ComponentName.css`
2. Named export: `export function ComponentName() { ... }`
3. Import in parent component

---

## Critical Agent Notes

- **Agent Mode state**: `startAgentTask` in `useAgent.ts` must call `useAIStore.getState()` (not React hook closure) to get current `messages` and `mode`.
- **Store closure bugs**: When adding to store state in async flows, always read fresh state via `get()` or `getState()`, not destructured values from `useStore()` at render time.
- **File persistence**: `activeFileTab.content` in `App.tsx` is the fallback for unsaved content on restart. If adding new content sources, sync to `fileContents` Map in `fileStore`.
- **RefreshRoot merge**: `refreshRoot` in `useFileSystem.ts` must merge with existing tree (via `setFiles` with merged entries), not replace the root. The `updateInTree` helper exists for this.
- **Prompts module**: System prompts are now in dedicated files under `src/lib/prompts/modes/` (agent.md, debug.md, chat.md, plan.md). Use `src/lib/prompts/index.ts` to load them.
- **Debug tools**: Debug mode now has file access tools (read_file, search_code, list_directory, get_error_details) defined in `src/lib/debug-tools.ts`.
- **Build state**: `BuildState` (in `platformio.rs`) is managed via `tauri::State` in `lib.rs`. When adding async commands that use state, ensure the state is passed as `tauri::State<'_, BuildState>` parameter and returns `Result<T, String>`.
- **Build cancellation**: `stop_build` uses PID-based killing (via `taskkill` on Windows). The child PID is stored in `BuildState.child_id`.

---

## Known Issues / TODO

- Drag-drop files in FileExplorer is a stub
- Agent Mode: Non-tool-call providers (DeepSeek, Ollama, Google) fall back to text-only (no tool execution)
- Agent Mode: Settings toggle for "default implementation mode" not exposed in Settings UI
- Debug tools only work with providers that support tool calling (OpenAI, Anthropic)
- Recent Files, file rename/delete, theme settings, AI model params, board auto-detect not implemented
- Agent Mode: DeepSeek, Ollama, Google fall back to text-only (no tool execution)
- Settings toggle for "default implementation mode" not exposed in Settings UI
- `SerialConfig` struct in `serial.rs` generates dead_code warning
