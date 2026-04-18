# Embedist Agent Notes

Use this file as a high-signal quick ramp for this repo.

## Scope and source of truth

- Work in `embedist/embedist` (the parent folder `embedist/` is not the app root).
- Trust executable config over docs when they differ (README version text can lag).
- Platform target is Windows desktop (Tauri 2 + React + TypeScript + Rust).

## Commands that actually exist

- Root frontend scripts (`package.json`): `npm run dev`, `npm run build`, `npm run preview`, `npm run tauri`.
- There is no root `npm run lint` or `npm test` script.
- Fast local verification:
  - `npm run build`
  - `cargo clippy --manifest-path src-tauri/Cargo.toml`
- Run app in dev: `npm run tauri dev`
- Build release artifacts: `npm run tauri build`

## Testing reality

- No automated test suite is present (`*.test.*`, `*.spec.*`, and `src-tauri/tests` are absent).
- Validation is build + clippy + manual app checks.

## Architecture map (real entrypoints)

- Frontend entry: `src/main.tsx` -> `src/App.tsx`.
- Backend entry: `src-tauri/src/main.rs` -> `src-tauri/src/lib.rs`.
- Tauri commands are registered in `src-tauri/src/lib.rs` and implemented in `src-tauri/src/commands/*.rs`.
- Prompt system is file-based: `src/lib/prompts/modes/*.md` loaded via `src/lib/prompts/index.ts`.

## AI/tool-calling facts that matter

- Rust backend supports tool-enabled chat handlers for OpenAI, Anthropic, DeepSeek, and custom OpenAI-compatible endpoints (`src-tauri/src/commands/ai.rs`).
- Ollama and Google handlers are text/chat only in current backend implementation.
- Agent-mode tool execution is implemented in `src/hooks/useAgent.ts` + `src/lib/agent-tools.ts`.

## Rust and state gotchas

- For cloneable async shared process state, use `Arc<tokio::sync::Mutex<...>>` (see `BuildState` in `src-tauri/src/commands/platformio.rs`).
- Avoid `Option::is_none_or(...)`; use stable alternatives like `is_some_and(...)`.
- `run_shell` in `src-tauri/src/commands/filesystem.rs` rejects shell metacharacters; do not expect complex chained shell expressions through that command.

## Release-critical checklist

- Keep version in sync across all three files:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`
- `npm run tauri build` produces:
  - portable exe: `src-tauri/target/release/embedist.exe`
  - NSIS installer: `src-tauri/target/release/bundle/nsis/Embedist_<version>_x64-setup.exe`
- `tauri.conf.json` has `bundle.targets: ["nsis"]`; installer output path/name follows that config.

## Secondary package

- `docs/` is a separate Docusaurus package with its own `package.json`; run its commands from `docs/` only when changing docs.
