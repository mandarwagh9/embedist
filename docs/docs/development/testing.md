---
sidebar_position: 3
---

# Testing

Testing procedures for Embedist development.

## Testing Strategy

Embedist uses multiple testing approaches:

- **Unit Tests**: Core functionality
- **Integration Tests**: Component interaction
- **E2E Tests**: Full user flows

## Running Tests

### Frontend Tests

```bash
# Install test dependencies
npm install

# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

### Backend Tests (Rust)

```bash
cd src-tauri

# Run tests
cargo test

# Run with output
cargo test -- --nocapture
```

## Test Structure

```
src/
├── __tests__/           # Unit tests
│   ├── utils/
│   └── lib/
├── integration/         # Integration tests
└── e2e/                # E2E tests (future)
```

## Writing Tests

### React Components

```typescript
import { render, screen } from '@testing-library/react';
import { CodeEditor } from './CodeEditor';

test('renders editor', () => {
  render(<CodeEditor />);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});
```

### Utilities

```typescript
import { parseSerialOutput } from '../lib/utils';

test('parses serial data', () => {
  const result = parseSerialOutput('Hello\n');
  expect(result).toBe('Hello');
});
```

## CI/CD

Tests run automatically on:
- Pull requests
- Main branch commits

## Coverage Goals

- Utilities: 80%+
- Components: 60%+
