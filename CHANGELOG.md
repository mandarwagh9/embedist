# Changelog

All notable changes to Embedist are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.34.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.34.0) — 2026-04-06

### Fixed
- App "not responding" on startup — added branded loading overlay, deferred BuildPanel and FileExplorer initialization
- File explorer double-click folder open — removed redundant `toggleExpanded` call after `setNodeChildren`
- Empty folder flicker — removed duplicate skeleton loading blocks
- Dark mode Recent Files visibility — added background color
- API keys now persist across app restarts — removed apiKey stripping from Zustand partialize
- Agent mode loses context after API failures — `tool_calls` now properly included in conversation messages
- `web_search` tool invocation error — updated DuckDuckGo HTML parsing regex for Plan mode

---

## [v0.33.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.33.0) — 2026-04-06

### Fixed
- `web_search` tool invocation error — fixed DuckDuckGo HTML parsing regex that was failing to extract search results in Plan mode

---

## [v0.17.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.17.0) — 2026-03-27

### Added
- Edit custom endpoints UI — modify existing AI endpoint configurations
- Show/Hide API key toggle — secure API key input with visibility toggle
- Thinking Mode toggle — support for NVIDIA NIM models with reasoning (e.g., moonshotai/kimi-k2.5)
- Setup Wizard for first-run PlatformIO installation

### Fixed
- AI provider state now persists across app restarts
- PlatformIO detection now uses `python -m platformio` for robust detection

---

## [v0.16.2](https://github.com/mandarwagh9/embedist/releases/tag/v0.16.2) — 2026-03-27

### Fixed
- Robust PlatformIO detection using python -m platformio approach

---

## [v0.16.1](https://github.com/mandarwagh9/embedist/releases/tag/v0.16.1) — 2026-03-27

### Fixed
- Registered missing Tauri commands (install_platformio, install_platform)

---

## [v0.16.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.16.0) — 2026-03-27

### Added
- Setup Wizard for first-run PlatformIO installation guidance
- hasCompletedSetup flag to track initial setup completion

---

## [v0.15.1](https://github.com/mandarwagh9/embedist/releases/tag/v0.15.1) — 2026-03-26

### Fixed
- AI provider state now restores properly on app startup

---

## [v0.15.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.15.0) — 2026-03-26

### Added
- SOTA AI prompt architecture with separate prompt files per mode
- Debug mode now has file access tools (read_file, search_code, list_directory, get_error_details)
- Agent mode emphasizes tool usage with explicit "USE THEM" guidance
- Board-specific context for ESP8266/ESP32 in AI prompts
- Plan mode with structured milestone planning

### Refactored
- Prompts moved to dedicated files in `src/lib/prompts/modes/`

---

## [v0.11.5](https://github.com/mandarwagh9/embedist/releases/tag/v0.11.5) — 2026-03-23

### Fixed
- Serial monitor TX — `sendCommand()` only logged to UI but never wrote to the port; now transmits with Web Serial API WritableStream + TextEncoder, respects line ending from settings (CR/LF/CRLF)

---

## [v0.11.4](https://github.com/mandarwagh9/embedist/releases/tag/v0.11.4) — 2026-03-23

### Fixed
- Browser native context menu — replaced fragile JS `onContextMenu` handler with `tauri-plugin-prevent-default` v4 (Rust/WebView-level interception, no JS race condition)
- Removed `user-select: none` from body CSS (was breaking text selection in Monaco editor)

---

## [v0.11.3](https://github.com/mandarwagh9/embedist/releases/tag/v0.11.3) — 2026-03-23

### Fixed
- Editor keyboard input broken (Backspace/Ctrl+Z not working) — root cause was unstable `activeFileTab` dependency causing Monaco re-mount on every keystroke, plus value-sync `useEffect` overwriting user input
- Stabilized `handleEditorChange` via `useFileStore.getState()` (zero React deps), `activeContent` useMemo now depends on stable IDs, two-ref system (`isSettingValueRef` + `lastKnownValueRef`) prevents programmatic `setValue` from fighting user keystrokes

### Refactored
- PlanPhaseIndicator stripped to null-returning stub (phase label already in PlanToolbar)

---

## [v0.11.2](https://github.com/mandarwagh9/embedist/releases/tag/v0.11.2) — 2026-03-23

### Refactored
- Plan toolbar stripped to minimal single-row layout — dot + "Plan / Phase" label left, Edit + Discard + Approve & Build buttons right

---

## [v0.11.1](https://github.com/mandarwagh9/embedist/releases/tag/v0.11.1) — 2026-03-23

### Fixed
- Editor recreation on file tree hover — `TreeItem` memoized with stable callback refs via `useCallback` + `getState()`
- Editor recreation on empty folder expand — guard against creating editor before content is loaded

---

## [v0.11.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.11.0) — 2026-03-23

### Added
- Plan mode redesign with compact toolbar, phase stepper, and inline edit panel
- PlanEditPanel with Save/Cancel and Esc/Ctrl+Enter keyboard shortcuts

### Refactored
- Monaco editor rewritten with direct API (not `@monaco-editor/react`) — singleton loader, 5 separate useEffect hooks for theme/create/value-sync/language/options

### Fixed
- CSP now allows Monaco web workers; CodeEditor wrapped in ErrorBoundary

---

## [v0.9.1](https://github.com/mandarwagh9/embedist/releases/tag/v0.9.1) — 2026-03-22

### Fixed
- Per-tab loading state — each tab tracks its own `loadingFilePath` instead of a global loading spinner, preventing flicker and incorrect states
- Editor hydration — no more blank editor flash on persist rehydration; tab content synced on tab switch

---

## [v0.9.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.9.0) — 2026-03-21

### Security
- Removed unrestricted fs/shell permissions; added CSP; fixed command injection; replaced inline onclick with React event delegation
- Data: fileContents/originalContents Maps persist; tab content restored on restart

### Rust
- parking_lot::Mutex, child process cleanup, 6 clippy fixes, removed unused deps (chrono, uuid)

### TypeScript
- SerialMonitor cleanup on unmount, empty catch blocks fixed, Map serialization

### Accessibility
- aria-label on 15+ buttons, focus traps on all modals

### Code Quality
- inline styles extracted, empty state added, CSS deduplication, .gitignore fixed

---

## [v0.8.5](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.5) — 2026-03-20

### Fixed
- TitleBar now shows actual project name from store instead of hardcoded "No Project Open"
- File tree now persists on app restart

---

## [v0.8.4](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.4) — 2026-03-20

### Fixed
- Stop Build button now works via PID-based process killing
- Board detection uses `pio boards --json-output` dynamically
- All Ctrl+1/2/3 mode shortcuts registered and functional
- Ctrl+Alt+S / Ctrl+K+S shortcuts for Save All
- Build error parsing wired to Problems panel
- `navigator.serial` type safety improved
- Version number read from `package.json`
- `Math.random()` replaced with `crypto.randomUUID()` for deterministic IDs
- Deprecated `document.execCommand` replaced with `navigator.clipboard` API

### Refactored
- AGENTS.md developer guide rewritten

---

## [v0.8.3](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.3) — 2026-03-20

### UX
- Applied Fitts's Law (larger hit areas), Hick's Law (grouped menus), Doherty Threshold (skeleton loading), Postel's Law (fuzzy search)

### Fixed
- File contents persist across app restarts
- File Explorer reloads previously expanded folders
- Activity panel can be collapsed in Agent mode
- Input layout improved, plan approval flow corrected

---

## [v0.8.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.8.0) — 2026-03-19

### Added
- Context menu with rename, delete, copy path, reveal in explorer
- Breadcrumbs navigation
- Command Palette (Ctrl+Shift+P)
- Recent Files panel
- Inline rename in file tree
- Multi-select files
- Modified file indicators
- Refresh button and reveal in Explorer

---

## [v0.7.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.7.0) — 2026-03-18

### Added
- AI Chat UI complete redesign with streaming support
- Code blocks with syntax highlighting and copy button
- Feedback panel for AI responses
- Plan toolbar for approval workflow
- Agent Activity Panel

### Fixed
- Agent Mode — messages visible, approve triggers build, tool support

---

## [v0.6.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.6.0) — 2026-03-17

### Added
- Serial Monitor with Web Serial API
- Real-time device communication with configurable baud rates and auto-connect

---

## [v0.5.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.5.0) — 2026-03-16

### Added
- Build & Upload — PlatformIO CLI integration with live output streaming
- Parsed errors/warnings in a Problems panel
- Stop Build button

---

## [v0.4.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.4.0) — 2026-03-15

### Added
- AI Agent mode with autonomous code implementation
- Live activity log showing tool calls and results

---

## [v0.3.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.3.0) — 2026-03-14

### Added
- AI Plan mode with collaborative project planning
- 5-phase workflow: Explore → Design → Review → Clarify → Ready

---

## [v0.2.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.2.0) — 2026-03-13

### Added
- Board-Aware AI Debugging
- Multi-Provider support: OpenAI, Anthropic, Google, DeepSeek, Ollama, NVIDIA NIM

---

## [v0.1.0](https://github.com/mandarwagh9/embedist/releases/tag/v0.1.0) — 2026-03-12

### Added
- Initial release
- File Explorer with context menus, breadcrumbs, recent files
- Tab Management with Monaco Editor
- Dark Theme
- Keyboard Shortcuts