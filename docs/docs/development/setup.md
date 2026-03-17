---
sidebar_position: 1
---

# Development Setup

Setting up a development environment for Embedist.

## Prerequisites

- **Node.js** 18+ 
- **Rust** 1.70+
- **npm** or **yarn**
- **Git**

## Clone & Install

```bash
# Clone repository
git clone https://github.com/embedist/embedist.git
cd embedist/embedist

# Install frontend dependencies
npm install

# Verify Tauri CLI
npm run tauri info
```

## Development Commands

```bash
# Start development server
npm run tauri dev

# Build for production
npm run tauri build

# Run frontend only
npm run dev
```

## Project Structure

```
embedist/
├── src/                 # React frontend
├── src-tauri/           # Rust backend
├── docs/                # Documentation
├── package.json         # Frontend deps
└── src-tauri/Cargo.toml # Backend deps
```

## IDE Setup

### VS Code (Recommended)

Install extensions:
- Tauri (official extension)
- ESLint
- Prettier
- TypeScript Vue Plugin (for .tsx)

## Building Documentation

```bash
cd docs
npm install
npm run build
```

## Next Steps

- [Contributing Guidelines](/development/contributing)
- [Testing](/development/testing)
