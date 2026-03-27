# AGENTS.md - Embedist Development Guide

**Project**: AI-native embedded development environment (Tauri 2 + React + TypeScript + Rust)
**Platform**: Windows only
**Git repo**: `embedist/embedist/` (not the root `embedist/` directory)
**Latest release**: v0.16.1

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
               # PromptSuggestions, PlanToolbar, AgentToolbar
  Build/       # BuildPanel, ProblemsPanel
  Common/      # Toast, Dialog, ErrorBoundary
  Editor/      # CodeEditor (Monaco wrapper), useMonacoEditor
  FileExplorer/# FileExplorer, ContextMenu, Breadcrumbs, CommandPalette,
               # RecentFiles, TreeItem
  Layout/      # Sidebar, MenuBar, TitleBar, StatusBar, BottomPanel, TabBar
  Serial/      # SerialMonitor
  Settings/    # SettingsModal, SettingsSidebar, AI/Editor/Serial/Build sections
stores/        # aiStore, fileStore, settingsStore, uiStore (Zustand)
hooks/         # useAI, useAgent, useBuild, useFileSystem, useSerial, usePlanContext
lib/
  prompts/    # Mode-specific system prompts (chat.md, plan.md, agent.md, debug.md)
  knowledge/  # RAG knowledge base (board JSON files)
  ai-prompts.ts   # AIMode type, system prompts definitions
  agent-tools.ts  # Agent mode tool definitions and execution
  debug-tools.ts  # Debug mode tool definitions
  rag.ts          # TF-IDF based RAG engine
types/         # index.ts (shared types)
```

### Backend (`src-tauri/src/`)
```
lib.rs         # App entry, plugin init, invoke_handler registration
main.rs        # Binary entry
commands/
  ai.rs        # Multi-provider AI API calls (OpenAI, Anthropic, DeepSeek, Ollama, Google, custom)
  filesystem.rs # File CRUD, directory ops, grep, shell, reveal in explorer
  platformio.rs # Build, upload, board detection, PlatformIO CLI
  serial.rs    # Serial port listing, state management
```

### Zustand Stores

- **aiStore** (`src/stores/aiStore.ts`): AI mode (chat/plan/agent/debug), activeProvider, providers, messages, planPhase, agentStatus, agentActivityLog
- **fileStore** (`src/stores/fileStore.ts`): File tree (FileNode[]), open tabs, fileContents/originalContents Maps, dirty state, PlatformIO detection, context menu, renaming, selection
- **uiStore** (`src/stores/uiStore.ts`): Sidebar section/width, bottom panel height, serial/build state, cursor position
- **settingsStore** (`src/stores/settingsStore.ts`): Providers (API keys), editor/serial/build settings, AI parameters, customEndpoints

---

## AI Modes Implementation

### Four Modes

| Mode | System Prompt | Tools | Use Case |
|------|--------------|-------|----------|
| **Chat** | General embedded assistant | None | Q&A, learning |
| **Plan** | 5-phase workflow (Explore→Design→Review→Plan→Ready) | read_file, search_code, web_search | Project planning |
| **Debug** | Systematic debugging | read_file, search_code, list_directory, get_error_details | Hardware-aware debugging |
| **Agent** | Autonomous implementation | All file/build/shell tools | Code implementation |

### AI Mode Hooks

- **useAI.ts**: Handles Chat/Plan/Debug modes via `sendMessage()` function. Builds system prompt with project context, RAG context, and mode-specific instructions. Supports tool calling for debug mode.
- **useAgent.ts**: Handles Agent mode via `startAgentTask()` function. Runs loop of AI call → tool execution → response until no tools called or max iterations (50). Path safety enforcement for file writes.

### Tool Systems

**Agent Tools** (`src/lib/agent-tools.ts`):
- `read_file(path)`: Read file contents via Tauri `invoke('read_file')`
- `write_file(path, content)`: Create/overwrite file
- `create_file(parent, name)`: Create empty file
- `create_folder(parent, name)`: Create directory
- `list_directory(path)`: List directory entries
- `get_directory_tree(path, depth?)`: Get recursive tree structure
- `search_code(path, pattern, filePattern?)`: Grep search in files
- `build_project(projectPath)`: Run PlatformIO build
- `run_shell(command, cwd?)`: Execute shell command

**Debug Tools** (`src/lib/debug-tools.ts`):
- `read_file(path)`: Read any project file
- `search_code(path, pattern, filePattern?)`: Search code patterns
- `list_directory(path)`: Browse project structure
- `get_error_details()`: Access build errors

### Provider Support (`src-tauri/src/commands/ai.rs`)

| Provider | Tool Support | API |
|----------|--------------|-----|
| **OpenAI** | Full (function calling) | api.openai.com/v1/chat/completions |
| **Anthropic** | Full (tool use) | api.anthropic.com/v1/messages |
| **DeepSeek** | Text-only (no function calling) | api.deepseek.com |
| **Ollama** | Text-only (no tools) | localhost:11434 |
| **Google** | Text-only (no tools) | generativelanguage.googleapis.com |
| **Custom** | Varies (OpenAI-compatible) | User-provided base URL |

---

## State Management Deep Dive

### Critical: Store Access in Async Functions

```typescript
// WRONG - stale closure bug
const { messages } = useAIStore();
useEffect(() => { sendMessage(messages); }, [messages]);

// CORRECT - fresh state via getState()
const messages = useAIStore.getState().messages;
await sendMessage(messages);
```

### Persistence

- **aiStore**: mode, activeProvider, messages, customModels (persisted)
- **fileStore**: rootPath, projectName, openTabs, fileContents, isPlatformIOProject (persisted)
- **settingsStore**: All settings (persisted to localStorage via Zustand persist)

### Store Pattern Example

```typescript
export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      mode: 'chat',
      messages: [],
      setMode: (mode) => set({ mode }),
      addMessage: (message) => {
        const { mode } = get();
        const fullMessage = { ...message, mode, id: crypto.randomUUID(), timestamp: Date.now() };
        set((state) => ({ messages: [...state.messages, fullMessage] }));
      },
      // ...other state and methods
    }),
    { name: 'embedist-ai-store', partialize: (state) => ({ /* selective persistence */ }) }
  )
);
```

---

## Tauri Command Flow

```
React Hook (invoke) → Tauri IPC → Rust Handler (#[tauri::command]) → Return Result<T, String>
```

### Adding a New Command

1. Add `#[tauri::command]` function in `src-tauri/src/commands/<domain>.rs`
2. Re-export from `commands/mod.rs` with `pub use <domain>::*`
3. Register in `lib.rs` `invoke_handler` macro
4. Call from TypeScript via `invoke('command_name', params)` in a hook

### Example: Filesystem Commands

```rust
// Rust: src-tauri/src/commands/filesystem.rs
#[command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[command]
pub async fn run_shell(command: String, cwd: Option<String>) -> Result<ShellResult, String> {
    // Async shell execution with metacharacter validation
}
```

```typescript
// TypeScript: src/hooks/useFileSystem.ts
const content = await invoke<string>('read_file', { path });
await invoke('write_file', { path, content });
```

---

## Build System (PlatformIO)

### Rust Commands (`src-tauri/src/commands/platformio.rs`)

- `check_platformio()`: Verify PlatformIO installation
- `list_connected_boards()`: Get connected devices via `pio device list --json-output`
- `get_available_boards()`: List all supported boards via `pio boards --json-output`
- `build_project(state, project_path)`: Run `pio run -d <path>`
- `upload_firmware(state, project_path, port?)`: Run `pio run --target upload`
- `stop_build(state)`: Kill process via `taskkill /F /PID {pid}`

### Build State (`BuildState`)

```rust
pub struct BuildState {
    pub child_id: AsyncMutex<Option<u32>>,
}

impl Default for BuildState {
    fn default() -> Self { Self { child_id: AsyncMutex::new(None) } }
}
```

- Async mutex stores child PID for build cancellation
- `stop_build` uses Windows `taskkill` or Unix `kill -9`

---

## Serial Communication

### Architecture

- **Frontend**: Web Serial API (`navigator.serial`) — browser-based, NOT Rust backend
- **Backend**: Lists COM ports, manages state
- **Config**: Baud rate, line ending (CR/LF/CRLF), encoding

### Frontend (`src/hooks/useSerial.ts`)

```typescript
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 115200 });
const reader = port.readable.getReader();
while (true) { const { value } = await reader.read(); /* process data */ }
```

### Backend (`src-tauri/src/commands/serial.rs`)

- Lists available COM ports (Windows: 0-255)
- Returns port list for UI dropdown

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/stores/aiStore.ts` | AI state: mode, messages, providers, plan/agent status |
| `src/stores/fileStore.ts` | File state: tree, tabs, content, PlatformIO detection |
| `src/hooks/useAI.ts` | Chat/Plan/Debug mode: `sendMessage()`, RAG context, tool execution |
| `src/hooks/useAgent.ts` | Agent mode: `startAgentTask()` loop, path safety, tool execution |
| `src/lib/agent-tools.ts` | Agent tool registry: `registerTool()`, `executeTool()`, `getAllToolDefinitions()` |
| `src/lib/debug-tools.ts` | Debug tool definitions and execution |
| `src/lib/ai-prompts.ts` | AIMode type, SYSTEM_PROMPTS, MODE_SWITCH_REMINDERS |
| `src/lib/prompts/index.ts` | `getPromptConfig(mode)` loader for mode-specific prompts |
| `src/lib/rag.ts` | TF-IDF RAG engine: `getBoardContext()`, `getRelevantContext()` |
| `src-tauri/src/commands/ai.rs` | Multi-provider API: `chat_completion()`, OpenAI/Anthropic/DeepSeek/Ollama/Google |
| `src-tauri/src/commands/filesystem.rs` | File ops: read/write, create, delete, rename, grep, shell |
| `src-tauri/src/commands/platformio.rs` | Build system: build, upload, board detection |
| `src-tauri/src/lib.rs` | App init: plugin setup, command registration, state management |

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
- **Path safety**: Agent mode validates all file write paths are inside project root via `isPathSafe()` function.
- **Tool batching**: Agent mode emphasizes batching multiple tool calls in single response for efficiency.
- **Provider tool support**: Only OpenAI and Anthropic support tool calling. DeepSeek/Ollama/Google fall back to text-only.

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

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open Folder |
| `Ctrl+S` | Save File |
| `Ctrl+Shift+E` | Focus File Explorer |
| `Ctrl+Shift+X` | Focus AI Assistant |
| `Ctrl+Shift+L` | Focus Serial Monitor |
| `Ctrl+Shift+B` | Focus Build Panel |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+1` | Chat Mode |
| `Ctrl+2` | Plan Mode |
| `Ctrl+3` | Agent Mode |
| `Ctrl+4` | Debug Mode |
| `Ctrl+Tab` | Cycle Tabs |
| `Ctrl+W` | Close Tab |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+J` | Toggle Bottom Panel |
| `Ctrl+,` | Open Settings |