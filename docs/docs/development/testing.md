---
sidebar_position: 3
---

# Testing

Current validation procedures for Embedist development.

## Current Test Reality

At the moment, this repository does **not** include a formal automated test suite (`npm test`, `*.spec.*`, `*.test.*`, and `src-tauri/tests` are absent).

Quality validation is currently done with build + static checks + focused manual smoke testing.

## Required Verification Commands

Run these from the repo root:

```bash
# Frontend typecheck + production bundle
npm run build

# Rust lint/static checks
cargo clippy --manifest-path src-tauri/Cargo.toml
```

## Release Validation

For release candidates, also run:

```bash
# Produce signed/packaged desktop artifacts
npm run tauri build
```

Expected outputs:
- `src-tauri/target/release/embedist.exe` on Windows
- `src-tauri/target/release/bundle/nsis/Embedist_<version>_x64-setup.exe` on Windows
- `src-tauri/target/release/bundle/appimage/*.AppImage` on Linux
- `src-tauri/target/release/bundle/deb/*.deb` on Linux

## Manual Smoke Checklist

After successful commands, verify key user flows:
- Open a project folder and browse/edit/save files
- Run AI in Chat/Plan/Agent/Debug modes with configured provider
- Build and upload firmware from the Build panel
- Open Serial Monitor and send/receive data
- Confirm external file changes refresh open tabs

## Future Work

Adding automated unit/integration/e2e tests is still recommended, but this is not yet wired into project scripts.
