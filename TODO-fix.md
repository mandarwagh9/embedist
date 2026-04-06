# Embedist — TODO Fix List

Generated from comprehensive codebase analysis. Last updated: v0.34.0.

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

### 1.1 Language Detection — FIXED
- **Fixed in v0.15.0**: Extension-to-language mapping implemented in `App.tsx`

### 1.2 Theme Selection UI — FIXED
- **Fixed in v0.33.0**: Theme selection added to EditorSettings, Monaco `setTheme()` wired

### 1.3 Auto-Save — FIXED
- **Fixed in v0.33.0**: Auto-save with configurable delay implemented in `App.tsx`

### 1.4 Monaco Keyboard Shortcuts — FIXED
- **Fixed in v0.12.1**: Ctrl+G, Alt+Shift+F, Ctrl+D, Ctrl+Shift+L registered in `CodeEditor.tsx`

### 1.5 Find & Replace — FIXED
- **Fixed in v0.33.0**: Monaco's built-in search widget enabled via `actions.find` and `editor.action.startFindReplaceAction`

### 1.6 Cursor Style Options — FIXED
- **Fixed in v0.33.0**: `cursorSmoothCaretAnimation` and `smoothScrolling` toggles added to EditorSettings

### 1.7 Bracket Pair Colorization — FIXED
- **Fixed in v0.33.0**: Enabled in Monaco config

### 1.8 Zoom Persistence — FIXED
- **Fixed in v0.33.0**: Monaco `updateOptions` fires correctly on `editorSettings.fontSize` change

---

## 2. FILE EXPLORER

### 2.1 Delete Key on Directories — FIXED
- **Fixed in v0.33.0**: Delete key now works on directories

### 2.2 Breadcrumb Navigation — FIXED
- **Fixed in v0.33.0**: `onNodeClick` wired to navigate to directory, `onNavigate(null)` collapses to root

### 2.3 Drag and Drop — FIXED
- **Fixed in v0.33.0**: File drag and drop implemented with Rust `rename_path`

### 2.4 Command Palette Shortcut — FIXED
- **Fixed in v0.33.0**: `Ctrl+Shift+P` toggles command palette overlay

### 2.5 File Icon by Extension — FIXED
- **Fixed in v0.33.0**: Extension-based icon mapping implemented

### 2.6 Reveal in Explorer — FIXED
- **Fixed in v0.33.0**: Context menu action wired to Tauri command

### 2.7 Collapse All — FIXED
- **Fixed in v0.33.0**: "Collapse All" added to context menu

### 2.8 Multi-Select Delete Key — FIXED
- **Fixed in v0.33.0**: Delete key processes `selectedPaths` array

### 2.9 File Tree Filtering — FIXED
- **Fixed in v0.33.0**: Search input filters file tree

### 2.10 New File/Folder Filename Validation — FIXED
- **Fixed in v0.33.0**: Validates against special characters, auto-selects filename without extension

---

## 3. AI / AGENT MODE

### 3.1 Agent Mode with Non-Tool Providers — FIXED
- **Fixed in v0.33.0**: Warning banner shown in Agent mode when using DeepSeek/Ollama/Google

### 3.2 `defaultImplementationMode` Toggle — MISSING
- `settingsStore.ts:45` has `defaultImplementationMode: 'agent'` but no UI control
- **Fix**: Add "Default Mode After Plan Approval" toggle in `AISettings.tsx` with Chat/Agent options
- **Effort**: Low
- **Files**: `src/stores/settingsStore.ts`, `src/components/Settings/sections/AISettings.tsx`

### 3.3 AI Model Parameters — FIXED
- **Fixed in v0.33.0**: Temperature, top_p, max_tokens controls added to AISettings, passed to Rust

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

### 3.6 Provider Model List Mismatch — FIXED
- **Fixed in v0.33.0**: Model lists consolidated to shared constants

### 3.7 API Request Timeout — FIXED
- **Fixed in v0.11.9**: 60s timeout added to `reqwest::Client`

### 3.8 Plan Phase Auto-Detection Fragile — FRAGILE
- Phase transitions use content substring matching (`'approve'`, `'?'`) — unreliable
- **Fix**: Use explicit phase markers in AI response format, or rely on explicit user/AI action buttons
- **Effort**: Medium
- **Files**: `src/components/AI/AIChatPanel.tsx`

### 3.9 Plan "Discard" — FIXED
- **Fixed in v0.33.0**: Discard now clears plan-related system messages from store

### 3.10 DeepSeek Tool Calling Support — MISSING
- DeepSeek supports function calling but `chat_deepseek` doesn't pass `tools` parameter
- **Fix**: Add `tools` parameter to `chat_deepseek` using OpenAI-compatible format
- **Effort**: Low
- **Files**: `src-tauri/src/commands/ai.rs`

### 3.11 Plan "Approve & Build" Error Case — FIXED
- **Fixed in v0.33.0**: Error handling with user feedback added on mode switch

### 3.12 Agent Context Loss After API Failures — FIXED
- **Fixed in v0.34.0**: `tool_calls` now properly included in conversation messages, `AIMessage` struct updated with `tool_calls` and `tool_call_id` fields

---

## 4. BUILD / PLATFORMIO

### 4.1 Upload Param Name Mismatch — FIXED
- **Fixed in v0.33.0**: Separate "Upload Port" selector added to BuildPanel, port passed correctly

### 4.2 Problems List Clickable — FIXED
- **Fixed in v0.33.0**: Clicking a problem opens the file in editor and scrolls to the line number

### 4.3 Board Auto-Detection — FIXED
- **Fixed in v0.33.0**: Parses `platformio.ini` for `board =` on project open

### 4.4 Build Shortcut — FIXED
- **Fixed in v0.33.0**: `F5` for Build, `F6` for Upload

### 4.5 `parseAnsiColor` Color Styling — FIXED
- **Fixed in v0.12.0**: ANSI codes mapped to CSS color classes

### 4.6 Build Progress Stream — FIXED
- **Fixed in v0.33.0**: Build output streams incrementally via Tauri events

---

## 5. SERIAL

### 5.1 `SerialConfig` Dead Code — RUST WARNING
- `serial.rs` has `SerialConfig` struct generating `dead_code` warning
- **Fix**: Use it (pass config from frontend) or remove it
- **Effort**: Trivial
- **Files**: `src-tauri/src/commands/serial.rs`

### 5.2 Serial Code Duplication — FIXED
- **Fixed in v0.33.0**: Consolidated into `useSerial.ts`, `SerialMonitor.tsx` is a thin wrapper

### 5.3 Auto-Scroll Toggle — FIXED
- **Fixed in v0.33.0**: `settingsStore.serial.autoScroll` now read and applied

### 5.4 DTR/RTS Control — FIXED
- **Fixed in v0.14.0**: DTR/RTS toggles added to SerialSettings

### 5.5 Save Serial Output — FIXED
- **Fixed in v0.12.0**: "Save Output" button writes received data to file via Tauri

### 5.6 Clear on Connect — FIXED
- **Fixed in v0.12.1**: "Clear on Connect" toggle wired and functional

---

## 6. UI / UX

### 6.1 Toast / Notification System — FIXED
- **Fixed in v0.33.0**: Toast notifications implemented for save, build, agent completion, etc.

### 6.2 Close Unsaved Tab Confirmation — FIXED
- **Fixed in v0.33.0**: Closing a tab with unsaved changes prompts confirmation

### 6.3 Tab Navigation Shortcuts — FIXED
- **Fixed in v0.33.0**: `Ctrl+Tab`/`Ctrl+Shift+Tab` cycle tabs

### 6.4 Editor Context Menu — FIXED
- **Fixed in v0.11.9**: Monaco context menu enabled with undo, cut, copy, paste, select all

### 6.5 Sidebar Width Persistence — FIXED
- **Fixed in v0.33.0**: `sidebarWidth` persisted in `uiStore`

### 6.6 Bottom Panel Resize — PARTIAL
- `uiStore` has `bottomPanelHeight` but no drag handle exists
- **Fix**: Add drag handle at top of `BottomPanel.tsx`
- **Effort**: Low
- **Files**: `src/components/Layout/BottomPanel.tsx`, `src/stores/uiStore.ts`

### 6.7 App Version Mismatch — FIXED
- **Fixed in v0.33.0**: Version synced across `package.json`, `Cargo.toml`, `tauri.conf.json`

### 6.8 Devtools — FIXED
- **Fixed in v0.12.0**: Devtools enabled in `tauri.conf.json`

### 6.9 Keyboard Shortcut Help Modal — STUB
- MenuBar has "Keyboard Shortcuts" but it's a stub
- **Fix**: Create `KeyboardShortcutsModal.tsx` with all shortcuts grouped by category
- **Effort**: Low
- **Files**: `src/components/Layout/MenuBar.tsx`, new component

### 6.10 Unsaved Changes in Title Bar — FIXED
- **Fixed in v0.11.9**: TitleBar shows `•` when any tab is modified

### 6.11 CSP Overly Permissive — FIXED
- **Fixed in v0.11.9**: CSP tightened to only known endpoints

---

## 7. RUST BACKEND

### 7.1 `ToolCallResult` Dead Code — FIXED
- **Fixed in v0.34.0**: Removed unused `ToolCallResult` struct

### 7.2 `chat_custom` Message Format — FIXED
- **Fixed in v0.34.0**: Now uses standard OpenAI `tool_calls` format in assistant messages

### 7.3 `run_shell` Security — SECURITY
- `run_shell` in `filesystem.rs` executes arbitrary shell commands
- **Fix**: Review all callers (agent-tools.ts). Add confirmation dialog for destructive shell commands. Validate input strictly.
- **Effort**: Medium
- **Files**: `src-tauri/src/commands/filesystem.rs`, `src/lib/agent-tools.ts`

### 7.4 `save_plan_file` — FIXED
- **Fixed in v0.33.0**: Purpose clarified — saves plan files to disk for persistence across sessions

---

## 8. ARCHITECTURE / DEBT

### 8.1 RAG Engine Fallback — FIXED
- **Fixed in v0.12.3**: Project source files indexed for semantic/keyword retrieval

### 8.2 TypeScript Types Stale — FIXED
- **Fixed in v0.12.2**: Consolidated to single source of truth in `types/index.ts`

### 8.3 TypeScript Strict Mode Violations — FIXED
- **Fixed in v0.33.0**: All violations resolved, `npm run build` passes clean

### 8.4 Cargo Clippy Warnings — FIXED
- **Fixed in v0.34.0**: All clippy warnings resolved

### 8.5 Settings Store Schema Migration — ONGOING
- Adding fields to `settingsStore` changes persisted schema
- **Fix**: Ensure defaults in initial state. Consider versioned migrations for major changes.
- **Effort**: Ongoing

---

## QUICK WINS SUMMARY

| # | Issue | Category | Priority | Effort |
|---|-------|----------|----------|--------|
| 1 | `defaultImplementationMode` toggle | AI | P0 | Low |
| 2 | `PlanPhaseIndicator` implement | AI | P0 | Low |
| 3 | Token usage display | AI | P1 | Low |
| 4 | `SerialConfig` dead code | Rust | P1 | Trivial |
| 5 | DeepSeek tool calling support | AI | P1 | Low |
| 6 | Keyboard shortcut help modal | UI/UX | P1 | Low |
| 7 | Bottom panel resize drag handle | UI/UX | P2 | Low |
| 8 | `run_shell` security hardening | Rust | P2 | Medium |

---

## REMAINING TODOs SUMMARY

| Category | Open | Fixed |
|----------|------|-------|
| Editor | 0 | 8 |
| File Explorer | 0 | 10 |
| AI / Agent | 4 | 8 |
| Build / PlatformIO | 0 | 6 |
| Serial | 1 | 5 |
| UI / UX | 2 | 9 |
| Rust Backend | 1 | 3 |
| Architecture / Debt | 1 | 4 |
| **Total** | **9** | **53** |

---

## ALREADY FIXED IN THIS SESSION

| Version | Fix | Files |
|---------|-----|-------|
| v0.34.0 | App loading state on startup | `App.tsx`, `app.css` |
| v0.34.0 | Deferred BuildPanel init | `BuildPanel.tsx` |
| v0.34.0 | Deferred FileExplorer root listing | `FileExplorer.tsx` |
| v0.34.0 | Agent context loss after API failures | `useAgent.ts`, `ai.rs` |
| v0.34.0 | File explorer double-click fix | `FileExplorer.tsx`, `useFileSystem.ts` |
| v0.34.0 | Empty folder flicker fix | `FileExplorer.tsx` |
| v0.34.0 | Dark mode Recent Files visibility | `RecentFiles.css` |
| v0.34.0 | API key persistence across restarts | `settingsStore.ts` |
| v0.34.0 | web_search DuckDuckGo regex fix | `ai.rs` |
| v0.34.0 | Clippy warnings cleanup | `ai.rs`, `filesystem.rs` |
| v0.14.0 | Serial Monitor DTR/RTS support | `SerialMonitor.tsx` |
| v0.14.0 | Add 74480 and 250000 baud rates | `SerialMonitor.tsx` |
| v0.14.0 | Wire line ending selector to UI | `SerialMonitor.tsx` |
| v0.14.0 | Add ESP8266 board variants | `BuildSettings.tsx` |
