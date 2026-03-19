# AGENTS.md - Embedist Development Guide

**Project**: AI-native embedded development environment (Tauri 2 + React + TypeScript + Rust)
**Platform**: Windows only
**Latest release**: v0.6.0

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
cargo check         # Quick type check
cargo build         # Debug build
cargo build --release  # Release build
cargo clippy         # Lint (run before committing Rust code)
```

### Running Single Test
```bash
# No test framework currently set up. Manual testing via:
npm run tauri dev   # Full app in dev mode
```

---

## Code Style

### TypeScript / React Conventions

**File naming**: `PascalCase.tsx` for components, `camelCase.ts` for others.
**Component files**: Co-locate CSS in `ComponentName.css` next to `ComponentName.tsx`.

**Imports order**:
1. React/framework imports (`react`, `@tauri-apps/api`)
2. Internal type imports (`../types`, `./types`)
3. Store imports (`../../stores/`)
4. Hook imports (`../../hooks/`)
5. Component imports (`../../components/`)
6. Utility/lib imports (`../../lib/`)
7. CSS imports (`./Component.css`)

**State management**: Use Zustand with `persist` middleware for persistent state. Follow the existing pattern:
- Define TypeScript interface for state shape
- Use `create<Interface>()` with `persist((set, get) => ({...}))`
- Use `set(state => ({ ... }))` for immutable updates

**Error handling**: Use `err instanceof Error ? err.message : String(err)` pattern for error extraction. Wrap async operations in try/catch, always call `setLoading(false)` in `finally`.

**Hooks**: Custom hooks in `src/hooks/` that wrap Tauri `invoke` calls. Use `useCallback` for functions passed as deps to child components. Use `useEffect` for side effects.

**No comments**: Do not add explanatory comments unless explicitly requested.

### Rust Conventions

**Module structure**: `src-tauri/src/commands/` with one file per domain (`platformio.rs`, `ai.rs`, `serial.rs`, `filesystem.rs`), registered in `mod.rs` and `lib.rs`.

**Tauri commands**: Use `#[tauri::command]` attribute, return `Result<T, String>` for fallible operations. Use `serde` for serialization (`#[derive(Serialize, Deserialize)]`).

**Error handling**: Use `anyhow::Result` for application errors, `thiserror` for typed errors. Propagate with `?`.

**State management**: Use `tauri::State<T>` with `parking_lot::Mutex` for interior mutability. Default state structs with `#[derive(Default)]`.

**Naming**: snake_case for variables/functions, PascalCase for types, SCREAMING_SNAKE_CASE for constants.

---

## Project Architecture

### Frontend
```
src/
├── components/      # UI (AI, Build, Common, Editor, FileExplorer, Layout, Serial, Settings)
├── stores/          # Zustand stores (aiStore, fileStore, settingsStore, uiStore)
├── hooks/           # Custom hooks (useAI, useBuild, useFileSystem, useSerial)
├── lib/             # Utilities (ai-prompts.ts, rag.ts, knowledge/)
├── types/           # Shared types (index.ts)
└── styles/          # Global CSS (global.css, styles.css)
```

### Backend
```
src-tauri/src/
├── lib.rs           # App entry, plugin init, command registration
├── main.rs          # Binary entry (calls lib::run())
└── commands/        # Tauri commands (ai.rs, filesystem.rs, platformio.rs, serial.rs)
```

### Zustand Stores
- `fileStore`: File tree, open tabs, file contents, dirty state, PlatformIO detection
- `uiStore`: Sidebar, bottom panel, tabs, cursor position, serial/build state
- `settingsStore`: Editor/serial/build settings, AI providers, persisted via `localStorage`
- `aiStore`: AI mode (chat/plan/debug), per-mode message histories, active provider

---

## Git Workflow

- **Branch**: `main` (single branch, no feature branches required)
- **Commits**: Small, focused commits. One feature or fix per commit.
- **Before committing Rust**: Run `cargo clippy` and fix all warnings
- **Before committing TypeScript**: Run `npm run build` to catch type errors
- **Releases**: After each feature, tag and push. Deprecated old releases via GitHub UI.
- **EXE in releases**: Always include `embedist.exe` in the release assets

---

## Common Patterns

### Adding a new Tauri command
1. Add function with `#[tauri::command]` in appropriate `src-tauri/src/commands/*.rs`
2. Export from `commands/mod.rs`
3. Register in `lib.rs` `invoke_handler`
4. Import and call via `invoke()` in TypeScript hook

### Adding a new store
1. Create `stores/NewStore.ts` with Zustand pattern
2. Import in `App.tsx` if needed at app level

### Adding a keyboard shortcut
1. Add handler in `App.tsx` `useEffect` (app-level) or `MenuBar.tsx` `useEffect` (menu-specific)
2. Use `e.ctrlKey || e.metaKey` pattern for cross-platform compatibility
3. Always `e.preventDefault()` to avoid browser defaults

### Adding a UI component
1. Create `src/components/Category/ComponentName.tsx` + `ComponentName.css`
2. Export as named export: `export function ComponentName() { ... }`
3. Import in parent component

---

## Known Issues / TODO

- `parseErrors` in `useBuild.ts` is defined but unused (could integrate error parsing)
- Edit menu uses deprecated `document.execCommand` (could upgrade to Clipboard API)
- Drag-drop files in FileExplorer is a stub
- Stop build button doesn't stop the process
- Ctrl+Alt+S (Save All) shortcut not registered in App.tsx
- Recent Files, file rename/delete, theme settings, AI model params, board auto-detect not implemented
