# Embedist — TODO Fix List

Generated from comprehensive codebase analysis. Last updated: v0.12.2.

## Legend
- **BROKEN**: Feature doesn't work at all
- **STUB**: Feature exists but does nothing
- **MISSING**: Feature not implemented
- **PARTIAL**: Partially implemented
- **FRAGILE**: Works but unreliably
- **UX**: Works but poor user experience
- **ARCH**: Architectural/design issue
- **SECURITY**: Security concern
- **LINT**: Compiler/linter warning

Effort: Trivial (1 line) | Low (<1hr) | Medium (1-4hr) | High (4+hr)

---

## 1. EDITOR

### 1.1 Language Detection — BROKEN
- Monaco editor always gets `language="cpp"` hardcoded in `App.tsx:262`
- No syntax highlighting for any file type except C++
- **Fix**: Implement extension-to-language mapping (`.py` → `python`, `.rs` → `rust`, `.json` → `json`, `.md` → `markdown`, `.h`/`.ino` → `cpp`)
- **Effort**: Low
- **Files**: `src/App.tsx`

### 1.2 Theme Selection UI — MISSING
- Custom `embedist-dark` theme defined in `CodeEditor.tsx` but no way to switch
- **Fix**: Add theme selection to `EditorSettings.tsx` (dark/light), store in `settingsStore.editor.theme`, apply via Monaco `setTheme()`
- **Effort**: Medium
- **Files**: `src/components/Settings/sections/EditorSettings.tsx`, `src/components/Editor/CodeEditor.tsx`, `src/stores/settingsStore.ts`

### 1.3 Auto-Save — MISSING
- No auto-save; unsaved changes lost on crash/close
- **Fix**: Add `autoSave: boolean` + `autoSaveDelay: number` to editor settings. Implement debounced save after `autoSaveDelay`ms of inactivity.
- **Effort**: Low
- **Files**: `src/stores/settingsStore.ts`, `src/components/Settings/sections/EditorSettings.tsx`, `src/App.tsx`

### 1.4 Monaco Keyboard Shortcuts — MISSING
- All shortcuts are app-level; Monaco-native shortcuts not registered
- Missing: `Ctrl+P` (Quick Open), `Ctrl+G` (Go to Line), `Ctrl+Shift+F` (Search in Files), `F1` (Command Palette), `Alt+Shift+F` (Format), `Ctrl+D` (Select Word), `Ctrl+Shift+L` (Select All Occurrences)
- **Fix**: Register Monaco commands via `monaco.commands.register()` in `CodeEditor.tsx`
- **Effort**: Medium
- **Files**: `src/components/Editor/CodeEditor.tsx`, `src/App.tsx`

### 1.5 Find & Replace — MISSING
- No Find (`Ctrl+F`) or Replace (`Ctrl+H`) in editor
- **Fix**: Enable Monaco's built-in search widget via `editor.getAction('actions.find')`
- **Effort**: Low
- **Files**: `src/components/Editor/CodeEditor.tsx`

### 1.6 Cursor Style Options — MISSING
- `cursorSmoothCaretAnimation: 'on'` hardcoded; no user control
- **Fix**: Add `smoothCaret` toggle to `EditorSettings.tsx`
- **Effort**: Low
- **Files**: `src/components/Editor/CodeEditor.tsx`, `src/components/Settings/sections/EditorSettings.tsx`

### 1.7 Bracket Pair Colorization — DISABLED
- `bracketPairColorization: { enabled: false }` in Monaco config
- **Fix**: Enable it
- **Effort**: Trivial
- **Files**: `src/components/Editor/CodeEditor.tsx`

### 1.8 Zoom Persistence — VERIFY
- `Ctrl++`/`Ctrl+-`/`Ctrl+0` modify fontSize in store but should be verified that Monaco `updateOptions` fires correctly on store change
- **Status**: Likely already working via the `useEffect` on `editorSettings` in `CodeEditor.tsx`. Needs verification.
- **Effort**: Verification only

---

## 2. FILE EXPLORER

### 2.1 Delete Key on Directories — BROKEN
- `FileExplorer.tsx` ~line 426: `!node.isDir` check — Delete key only works on files
- **Fix**: Remove the `!node.isDir` guard
- **Effort**: Trivial
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`

### 2.2 Breadcrumb Navigation — BROKEN
- `Breadcrumbs.tsx` renders correctly but `FileExplorer.tsx` passes empty `() => {}` stubs for `onNavigate` and `onNodeClick`
- **Fix**: Wire `onNodeClick` to navigate to directory, `onNavigate(null)` to collapse to root
- **Effort**: Low
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`, `src/components/FileExplorer/Breadcrumbs.tsx`

### 2.3 Drag and Drop — STUB
- `handleDrop()` only updates `isDragOver` visual state; no actual file handling
- **Fix**: Extract `e.dataTransfer.files` for external drops. For internal drops, use selected paths. Call Rust `rename_path`. Show progress for large moves.
- **Effort**: Medium
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`, `src-tauri/src/commands/filesystem.rs`

### 2.4 Command Palette Shortcut — MISSING
- `CommandPalette.tsx` exists but `Ctrl+Shift+P` is not bound
- **Fix**: Add `Ctrl+Shift+P` handler in `App.tsx` that toggles command palette overlay
- **Effort**: Low
- **Files**: `src/App.tsx`, `src/components/FileExplorer/FileExplorer.tsx`, `src/components/FileExplorer/CommandPalette.tsx`

### 2.5 File Icon by Extension — MISSING
- File explorer shows generic icons for most file types
- **Fix**: Add extension-based icon mapping (`.ino/.cpp/.h` → microcontroller, `.json` → data, `.md` → document, `.toml` → config, etc.)
- **Effort**: Low
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`

### 2.6 Reveal in Explorer — MISSING
- Context menu has "Reveal in Explorer" but `reveal_in_explorer` command in `lib.rs:58` is not wired
- **Fix**: Wire the context menu action to call the Tauri command
- **Effort**: Low
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`, `src/components/FileExplorer/ContextMenu.tsx`

### 2.7 Collapse All — MISSING
- `fileStore` has `collapseAll()` but no UI trigger
- **Fix**: Add "Collapse All" to context menu
- **Effort**: Low
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`, `src/components/FileExplorer/ContextMenu.tsx`

### 2.8 Multi-Select Delete Key — PARTIAL
- Delete key only works for single selection
- **Fix**: Extend keyboard Delete handler to process `selectedPaths` array
- **Effort**: Low
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`

### 2.9 File Tree Filtering — MISSING
- No way to filter the file tree (e.g., show only `.cpp` files)
- **Fix**: Add a filter input that hides non-matching nodes
- **Effort**: Low
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`

### 2.10 New File/Folder Filename Validation — UX
- No validation of special characters in filenames
- **Fix**: Validate against `\ / : * ? " < > |`, show parent path in placeholder, auto-select filename without extension
- **Effort**: Low
- **Files**: `src/components/FileExplorer/FileExplorer.tsx`

---

## 3. AI / AGENT MODE

### 3.1 Agent Mode with Non-Tool Providers — BROKEN UX
- DeepSeek/Ollama/Google return `tool_calls: vec![]` — agent silently falls back to text-only with no tools executing. Agent loops with no feedback.
- **Fix**: Before starting agent task, detect if provider supports tool calling. Show a warning banner in Agent mode when using DeepSeek/Ollama/Google: "This provider doesn't support tool calling. Use OpenAI, Anthropic, or a compatible custom endpoint."
- **Effort**: Low
- **Files**: `src/components/AI/AIChatPanel.tsx`, `src/hooks/useAgent.ts`

### 3.2 `defaultImplementationMode` Toggle — MISSING
- `settingsStore.ts:45` has `defaultImplementationMode: 'agent'` but no UI control
- **Fix**: Add "Default Mode After Plan Approval" toggle in `AISettings.tsx` with Chat/Agent options
- **Effort**: Low
- **Files**: `src/stores/settingsStore.ts`, `src/components/Settings/sections/AISettings.tsx`

### 3.3 AI Model Parameters — MISSING
- No temperature, top_p, max_tokens, presence_penalty, frequency_penalty controls
- **Fix**: Add "Advanced" section to `AISettings.tsx`. Store in `settingsStore`. Pass to Rust `chat_completion`. Modify `ai.rs` to accept and use these params.
- **Effort**: Medium
- **Files**: `src/stores/settingsStore.ts`, `src/components/Settings/sections/AISettings.tsx`, `src/hooks/useAI.ts`, `src/hooks/useAgent.ts`, `src-tauri/src/commands/ai.rs`

### 3.4 `PlanPhaseIndicator` Stub — STUB
- `src/components/AI/PlanPanel/PlanPhaseIndicator.tsx` returns `null`
- **Fix**: Implement phase progress indicator (5 steps: explore→design→review→clarify→ready, current highlighted)
- **Effort**: Low
- **Files**: `src/components/AI/PlanPanel/PlanPhaseIndicator.tsx`

### 3.5 Token Usage Display — MISSING
- Backend returns `TokenUsage` but frontend ignores it
- **Fix**: Display token count in StatusBar or `MessageBubble.tsx`. Add "Show Tokens" toggle in AISettings.
- **Effort**: Low
- **Files**: `src/components/AI/MessageBubble.tsx`, `src/stores/aiStore.ts`

### 3.6 Provider Model List Mismatch — BUG
- Store defaults and Settings UI model lists are not in sync (google, ollama, anthropic)
- **Fix**: Use a shared constant for model lists. Single source of truth in `settingsStore.ts` or a separate models file.
- **Effort**: Low
- **Files**: `src/stores/settingsStore.ts`, `src/components/Settings/sections/AISettings.tsx`

### 3.7 API Request Timeout — MISSING
- No timeout on AI API calls — requests can hang indefinitely
- **Fix**: Add `timeout` to `reqwest::Client::builder().timeout()`. 60s default.
- **Effort**: Low
- **Files**: `src-tauri/src/commands/ai.rs`

### 3.8 Plan Phase Auto-Detection Fragile — FRAGILE
- Phase transitions use content substring matching (`'approve'`, `'?'`) — unreliable
- **Fix**: Use explicit phase markers in AI response format, or rely on explicit user/AI action buttons
- **Effort**: Medium
- **Files**: `src/components/AI/AIChatPanel.tsx`

### 3.9 Plan Mode "Discard" — BROKEN
- Discard button doesn't clear plan messages from `aiStore.messages`
- **Fix**: Clear plan-related system messages from store on discard
- **Effort**: Low
- **Files**: `src/components/AI/PlanPanel/PlanToolbar.tsx`, `src/stores/aiStore.ts`

### 3.10 DeepSeek Tool Calling Support — MISSING
- DeepSeek supports function calling but `chat_deepseek` doesn't pass `tools` parameter
- **Fix**: Add `tools` parameter to `chat_deepseek` using OpenAI-compatible format
- **Effort**: Low
- **Files**: `src-tauri/src/commands/ai.rs`

### 3.11 Plan "Approve & Build" Error Case — UX
- When switching from plan to agent/chat, no error handling if the mode switch fails
- **Fix**: Add error handling with user feedback

---

## 4. BUILD / PLATFORMIO

### 4.1 Upload Param Name Mismatch — BROKEN (CRITICAL)
- `useBuild.ts:147-150` calls `upload_firmware` with `boardId: selectedBoard` (e.g., `"esp32dev"`)
- Rust `platformio.rs:215` expects `port: Option<String>` (e.g., `"COM3"`)
- PlatformIO uses `--upload-port` for the serial port, NOT the board ID
- **Impact**: Upload runs `pio run --target upload --upload-port esp32dev` — wrong
- **Fix**: Add a separate "Upload Port" selector to `BuildPanel.tsx` listing connected serial ports. Pass the port to `upload_firmware`. Remove the boardId pass-through.
- **Effort**: Medium
- **Files**: `src/hooks/useBuild.ts`, `src/components/Build/BuildPanel.tsx`, `src-tauri/src/commands/platformio.rs`

### 4.2 Problems List Not Clickable — MISSING
- Build errors/warnings are listed but clicking them does nothing
- **Fix**: On problem click, open the file in editor and scroll to the line number. Use `openFile()` from `fileStore`.
- **Effort**: Low
- **Files**: `src/components/Build/BuildPanel.tsx`, `src/stores/fileStore.ts`

### 4.3 Board Auto-Detection — MISSING
- `is_platformio_project` and `detectedBoard` exist but detection not implemented
- **Fix**: Parse `platformio.ini` for `board =` on project open. Auto-detect from `pio device list`.
- **Effort**: Medium
- **Files**: `src/hooks/useFileSystem.ts`, `src-tauri/src/commands/filesystem.rs`, `src/components/Layout/StatusBar.tsx`

### 4.4 Build Shortcut — MISSING
- No keyboard shortcut for Build
- **Fix**: Use `F5` for Build, `F6` for Upload (reassign `Ctrl+Shift+B` from sidebar nav)
- **Effort**: Low
- **Files**: `src/App.tsx`

### 4.5 `parseAnsiColor` Strip Only — UX
- `BuildPanel.tsx:97-105` strips ANSI codes but doesn't apply color styling
- **Fix**: Map ANSI codes (30-37, 90-97) to CSS color classes
- **Effort**: Low
- **Files**: `src/components/Build/BuildPanel.tsx`, `src/components/Build/BuildPanel.css`

### 4.6 Build Progress Stream — MISSING
- Build output only appears after completion; no live streaming
- **Fix**: Modify Rust `run_platformio_command` to yield output incrementally (Tauri events or streaming response). Frontend streams each line as it arrives.
- **Effort**: High
- **Files**: `src-tauri/src/commands/platformio.rs`, `src/hooks/useBuild.ts`

---

## 5. SERIAL

### 5.1 `SerialConfig` Dead Code — RUST WARNING
- `serial.rs` has `SerialConfig` struct generating `dead_code` warning
- **Fix**: Use it (pass config from frontend) or remove it
- **Effort**: Trivial
- **Files**: `src-tauri/src/commands/serial.rs`

### 5.2 Serial Code Duplication — ARCH
- `useSerial.ts` and `SerialMonitor.tsx` both implement Web Serial API logic independently
- **Fix**: Consolidate into `useSerial.ts`, have `SerialMonitor.tsx` be a thin wrapper
- **Effort**: Medium
- **Files**: `src/components/Serial/SerialMonitor.tsx`, `src/hooks/useSerial.ts`

### 5.3 Auto-Scroll Toggle — MISSING
- `settingsStore.serial.autoScroll` exists but `SerialMonitor.tsx` doesn't read it
- **Fix**: Read setting and conditionally auto-scroll
- **Effort**: Trivial
- **Files**: `src/components/Serial/SerialMonitor.tsx`

### 5.4 DTR/RTS Control — MISSING
- Serial connection has no DTR/RTS control
- **Fix**: Add DTR/RTS toggles to `SerialSettings.tsx` and pass to Web Serial `open()` (supports `dataTerminalReady: boolean`)
- **Effort**: Low
- **Files**: `src/components/Settings/sections/SerialSettings.tsx`, `src/hooks/useSerial.ts`

### 5.5 Save Serial Output — MISSING
- No way to save serial monitor output to a file
- **Fix**: Add "Save Output" button that writes received data to a file via Tauri
- **Effort**: Low
- **Files**: `src/components/Serial/SerialMonitor.tsx`

### 5.6 Clear on Connect — MISSING
- Serial output accumulates across connect/disconnect cycles
- **Fix**: Add "Clear on Connect" toggle in SerialSettings, auto-clear on connect
- **Effort**: Low
- **Files**: `src/components/Serial/SerialMonitor.tsx`, `src/components/Settings/sections/SerialSettings.tsx`, `src/stores/settingsStore.ts`

---

## 6. UI / UX

### 6.1 Toast / Notification System — MISSING
- No toast notifications for: save success, build success/failure, file created, agent complete, etc.
- **Fix**: Create `Toast.tsx` + `useToast()` hook. Use in saveFile, build/upload, agent completion, serial connect/disconnect.
- **Effort**: Low
- **Files**: New: `src/components/Common/Toast.tsx`, `src/App.tsx`

### 6.2 Close Unsaved Tab Confirmation — MISSING
- Closing a tab with unsaved changes doesn't prompt
- **Fix**: Check `tab.modified` before close. Show Tauri `dialog::confirm` if dirty.
- **Effort**: Low
- **Files**: `src/stores/fileStore.ts`, `src/components/Layout/TabBar.tsx`

### 6.3 Tab Navigation Shortcuts — MISSING
- No `Ctrl+Tab`/`Ctrl+Shift+Tab` to cycle tabs
- **Fix**: Add handlers in `App.tsx`
- **Effort**: Trivial
- **Files**: `src/App.tsx`

### 6.4 Editor Context Menu — MISSING
- No right-click context menu in Monaco (undo, cut, copy, paste, select all)
- **Fix**: Register Monaco actions for context menu
- **Effort**: Low
- **Files**: `src/components/Editor/CodeEditor.tsx`

### 6.5 Sidebar Width Persistence — PARTIAL
- `sidebarWidth` in `uiStore` may not be persisted
- **Fix**: Add to persist middleware
- **Effort**: Trivial
- **Files**: `src/stores/uiStore.ts`

### 6.6 Bottom Panel Resize — PARTIAL
- `uiStore` has `bottomPanelHeight` but no drag handle exists
- **Fix**: Add drag handle at top of `BottomPanel.tsx`
- **Effort**: Low
- **Files**: `src/components/Layout/BottomPanel.tsx`, `src/stores/uiStore.ts`

### 6.7 App Version Mismatch — BUG
- `tauri.conf.json:4` has `"version": "0.1.0"` but codebase is v0.11.5
- **Fix**: Update to current version
- **Effort**: Trivial
- **Files**: `src-tauri/tauri.conf.json`

### 6.8 Devtools Disabled — MISSING
- No devtools enabled
- **Fix**: Add `devtools: true` to `tauri.conf.json` window config
- **Effort**: Trivial
- **Files**: `src-tauri/tauri.conf.json`

### 6.9 Keyboard Shortcut Help Modal — STUB
- MenuBar has "Keyboard Shortcuts" but it's a stub
- **Fix**: Create `KeyboardShortcutsModal.tsx` with all shortcuts grouped by category
- **Effort**: Low
- **Files**: `src/components/Layout/MenuBar.tsx`, new component

### 6.10 Unsaved Changes in Title Bar — MISSING
- TitleBar shows static title; doesn't reflect unsaved files
- **Fix**: Update window title to include `•` when any tab is modified
- **Effort**: Trivial
- **Files**: `src/components/Layout/TitleBar.tsx`, `src-tauri/src/lib.rs`

### 6.11 CSP Overly Permissive — SECURITY
- `tauri.conf.json` CSP includes `https://*.ollama.ai` and `http://localhost:*`
- **Fix**: Tighten to only known endpoints. Remove `*.ollama.ai` if not needed.
- **Effort**: Low
- **Files**: `src-tauri/tauri.conf.json`

---

## 7. RUST BACKEND

### 7.1 `ToolCallResult` Dead Code — RUST WARNING
- `src-tauri/src/commands/ai.rs:46-51` defines `ToolCallResult` with `#[allow(dead_code)]`
- **Fix**: Remove or use it
- **Effort**: Trivial
- **Files**: `src-tauri/src/commands/ai.rs`

### 7.2 `chat_custom` Message Format — BUG RISK
- `chat_custom` uses `tool_call_id` in assistant messages (line 567) but OpenAI standard uses `tool_calls` array
- **Impact**: Custom endpoints (LM Studio, vLLM) may not work with tool calling
- **Fix**: Use standard OpenAI `tool_calls` format in assistant messages
- **Effort**: Medium
- **Files**: `src-tauri/src/commands/ai.rs`

### 7.3 `run_shell` Security — SECURITY
- `run_shell` in `filesystem.rs` executes arbitrary shell commands
- **Fix**: Review all callers (agent-tools.ts). Add confirmation dialog for destructive shell commands. Validate input strictly.
- **Effort**: Medium
- **Files**: `src-tauri/src/commands/filesystem.rs`, `src/lib/agent-tools.ts`

### 7.4 `save_plan_file` — UNCLEAR
- `commands::save_plan_file` registered in `lib.rs` but purpose/implementation unclear
- **Fix**: Investigate implementation, determine if used/needed
- **Effort**: Investigation only
- **Files**: `src-tauri/src/lib.rs`, `src-tauri/src/commands/filesystem.rs`

---

## 8. ARCHITECTURE / DEBT

### 8.1 RAG Engine Fallback — WEAK
- `rag.ts` falls back to empty string on errors; no project-aware context
- **Fix**: Index current project's source files for semantic/keyword retrieval
- **Effort**: High
- **Files**: `src/lib/rag.ts`

### 8.2 TypeScript Types Stale — ARCH
- `types/index.ts` defines minimal `FileNode` different from richer one in `fileStore.ts`
- **Fix**: Consolidate to single source of truth in `types/index.ts`
- **Effort**: Medium
- **Files**: `src/types/index.ts`, `src/stores/fileStore.ts`

### 8.3 TypeScript Strict Mode Violations — LINT
- `noUnusedLocals: true` and `noUnusedParameters: true` may have violations
- **Fix**: Run `npm run build`, fix all violations
- **Effort**: Low

### 8.4 Cargo Clippy Warnings — LINT
- `dead_code` warnings for `SerialConfig`, `ToolCallResult`
- **Fix**: Run `cargo clippy` in `src-tauri/`, fix all warnings
- **Effort**: Low

### 8.5 Settings Store Schema Migration — ARCH
- Adding fields to `settingsStore` changes persisted schema
- **Fix**: Ensure defaults in initial state. Consider versioned migrations for major changes.
- **Effort**: Ongoing

---

## QUICK WINS SUMMARY

| # | Issue | Category | Priority | Effort |
|---|-------|----------|----------|--------|
| 1 | Delete key on directories | FileExplorer | P0 | Trivial |
| 2 | Breadcrumb navigation | FileExplorer | P0 | Low |
| 3 | Upload param mismatch (boardId vs port) | Build | P0 | Medium |
| 4 | Agent mode warning for non-tool providers | AI | P0 | Low |
| 5 | Language detection | Editor | P0 | Low |
| 6 | Toast notifications | UI/UX | P1 | Low |
| 7 | Close unsaved tab confirmation | UI/UX | P1 | Low |
| 8 | `PlanPhaseIndicator` implement | AI | P1 | Low |
| 9 | `defaultImplementationMode` toggle | AI | P1 | Low |
| 10 | Auto-scroll toggle (serial) | Serial | P1 | Trivial |
| 11 | Problems list clickable | Build | P1 | Low |
| 12 | Command Palette keyboard shortcut | FileExplorer | P1 | Low |
| 13 | `SerialConfig` dead code | Rust | P2 | Trivial |
| 14 | `ToolCallResult` dead code | Rust | P2 | Trivial |
| 15 | App version fix (0.1.0 → current) | UI/UX | P2 | Trivial |
| 16 | DeepSeek tool calling support | AI | P2 | Low |
| 17 | Theme selection UI | Editor | P2 | Medium |
| 18 | Auto-save | Editor | P2 | Low |
| 19 | AI model parameters | AI | P2 | Medium |
| 20 | Token usage display | AI | P2 | Low |
| 21 | Auto-scroll serial setting wiring | Serial | P2 | Trivial |
| 22 | Model list mismatch (google/ollama) | AI | P2 | Low |
| 23 | Tab navigation shortcuts | UI/UX | P2 | Trivial |
| 24 | Keyboard shortcut help modal | UI/UX | P2 | Low |
| 25 | Board auto-detection | Build | P2 | Medium |
| 26 | Reveal in Explorer wiring | FileExplorer | P2 | Low |
| 27 | Build progress streaming | Build | P3 | High |
| 28 | RAG engine project indexing | Architecture | P3 | High |
| 29 | TypeScript types consolidation | Architecture | P3 | Medium |
| 30 | Serial code consolidation | Architecture | P3 | Medium |

---

## ALREADY FIXED IN THIS SESSION

| Version | Fix | Files |
|---------|-----|-------|
| v0.11.3 | Editor keyboard (Backspace/Ctrl+Z) - `onChange` dependency caused Monaco re-mount | `CodeEditor.tsx`, `App.tsx` |
| v0.11.4 | Browser context menu - JS `onContextMenu` race condition | `lib.rs`, `Cargo.toml`, `App.tsx`, `global.css` |
| v0.11.5 | Serial TX - `sendCommand` never wrote to serial port | `SerialMonitor.tsx` |
| v0.11.6 | README stale + screenshots | `README.md`, `screenshot/`, `Cargo.lock` |
| v0.11.9 | File explorer drag & drop | `FileExplorer.tsx` |
| v0.11.9 | Filename validation | `FileExplorer.tsx` |
| v0.11.9 | AI API timeout (60s) | `ai.rs` |
| v0.11.9 | Editor context menu | `CodeEditor.tsx` |
| v0.11.9 | Unsaved changes in title bar | `TitleBar.tsx` |
| v0.11.9 | CSP tightening | `tauri.conf.json` |
| v0.12.0 | BuildPanel ANSI colors | `BuildPanel.tsx` |
| v0.12.0 | DevTools enabled | `tauri.conf.json` |
| v0.12.0 | DTR/RTS controls | `SerialSettings.tsx` |
| v0.12.0 | Clear on Connect | `SerialSettings.tsx`, `SerialMonitor.tsx` |
| v0.12.0 | Save Serial Output | `SerialMonitor.tsx` |
| v0.12.1 | Wire clearOnConnect toggle | `SerialMonitor.tsx` |
| v0.12.1 | Clippy warnings suppressed | `ai.rs` |
| v0.12.1 | Monaco shortcuts (Ctrl+G, Alt+Shift+F, Ctrl+D, Ctrl+Shift+L) | `CodeEditor.tsx` |
| v0.12.2 | FileNode type consolidation | `types/index.ts`, `fileStore.ts` |
| v0.12.3 | RAG engine project indexing | `rag.ts`, `useFileSystem.ts` |
| v0.13.0 | TypeScript type consolidation | `types/index.ts`, `fileStore.ts`, `uiStore.ts` |
| v0.13.0 | Remove debug console.log from RAG | `rag.ts` |
| v0.13.0 | Fix Rust error handling | `lib.rs` |
| v0.14.0 | Serial Monitor DTR/RTS support | `SerialMonitor.tsx` |
| v0.14.0 | Add 74480 and 250000 baud rates | `SerialMonitor.tsx` |
| v0.14.0 | Wire line ending selector to UI | `SerialMonitor.tsx` |
| v0.14.0 | Add ESP8266 board variants | `BuildSettings.tsx` |
