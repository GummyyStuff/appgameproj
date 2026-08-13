---
title: "Testing Strategy"
audience: developer
layer: technical
status: stable
tags: [testing, vitest, unit, integration, e2e, playwright, coverage]
last_updated: 08/12/2026
---

# Testing Strategy

## Purpose and Context

This document outlines the comprehensive testing strategy for the Tarkov Casino project using **Vitest v4** as the primary testing framework, with **Playwright** for end-to-end testing. The project was migrated from `bun:test` to Vitest (see `MIGRATION_SUMMARY.md`).

The testing approach ensures code quality, reliability, and proper functionality across both backend and frontend packages.

## Architecture Overview

The testing architecture includes:

- **Unit tests** for individual functions, hooks, and components
- **Integration tests** for API endpoints and multi-service workflows
- **End-to-end tests** for complete user workflows (Playwright)
- **Game engine tests** for provably fair game mechanics and payouts
- **Fairness/security tests** for RNG statistics, input sanitization, and threat detection
- **Coverage monitoring** with configurable thresholds (currently limited by Bun runtime)

### Test Framework Stack

| Component | Technology |
|---|---|
| Test Runner | Vitest v4.1.10 |
| Backend Environment | Node (via vitest) |
| Frontend Environment | jsdom |
| React Testing | @testing-library/react 16.3+ |
| API Mocking | MSW (Mock Service Worker) — configured but unused |
| E2E Testing | Playwright |
| Coverage Provider | @vitest/coverage-v8 (broken under Bun) |

### Configuration Files

| File | Purpose |
|---|---|
| `packages/backend/vitest.config.ts` | Backend test config (node env, 75% coverage threshold) |
| `packages/frontend/vitest.config.ts` | Frontend test config (jsdom, 80% coverage threshold) |
| `packages/backend/src/test-utils/setup.ts` | Backend global setup (env vars) |
| `packages/frontend/src/test-utils/test-setup.ts` | Frontend global setup (jest-dom matchers, MSW server) |

## Technical Details

### Test Structure

#### Backend Tests (`packages/backend/src/`)

| Directory | Purpose | Example |
|---|---|---|
| `routes/*.test.ts` | API endpoint tests via Hono `app.request()` | `auth.test.ts`, `games.test.ts` |
| `services/**/*.test.ts` | Business logic with mocked dependencies | `statistics.test.ts`, `currency.test.ts` |
| `services/__tests__/` | Service tests with shared utilities | `cache-service.test.ts`, `redis-service.test.ts` |
| `services/game-engine/*.test.ts` | Game mechanics, payouts, fairness | `roulette-game.test.ts`, `payout-calculator.test.ts` |
| `integration/*.test.ts` | Multi-service workflows | `currency-api.test.ts` |
| `test-utils/*.test.ts` | RNG statistics, sanitization, threat detection | `game-fairness.test.ts`, `security-core.test.ts` |

#### Frontend Tests (`packages/frontend/src/`)

| Directory | Purpose | Example |
|---|---|---|
| `components/**/*.test.tsx` | UI component tests with Testing Library | `BettingPanel.logic.test.tsx`, `Toast.test.tsx` |
| `hooks/**/*.test.ts` | Custom React hook tests with `renderHook` | `useErrorHandling.test.tsx` |
| `utils/**/*.test.ts` | Helper function tests | `currency.test.ts`, `cache.test.ts` |

#### E2E Tests (`e2e/`)

| Directory | Purpose |
|---|---|
| `pages/*.ts` | Page Object Models — encapsulate page interactions |
| `*.spec.ts` | Test specs — complete user workflows |

### Test Counts (Current)

| Workspace | Files | Tests | Duration |
|---|---|---|---|
| Backend | 25 | 369 | ~7s |
| Frontend | 12 | 185 | ~2s |
| **Total** | **37** | **554** | **~9s** |

## Requirements and Dependencies

### Runtime Requirements

- **Bun** (latest) — primary runtime for development and testing
- **Node.js** (optional) — required for coverage reports (v8 provider needs Node inspector API)
- **TypeScript 5.9+** — type checking for tests
- **Appwrite SDK** — mocked in tests
- **Redis client** — mocked in tests

### Key Dependencies

```json
{
  "vitest": "^4.1.10",
  "@testing-library/react": "^16.3.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.5.2",
  "msw": "^2.0.0",
  "jsdom": "^25.0.0",
  "@vitest/coverage-v8": "^4.1.10",
  "@playwright/test": "^1.48.0"
}
```

## Implementation Code Examples

### Quick Start

```bash
# Run all tests (both workspaces)
bun run test:all

# Run per package
cd packages/backend && bunx vitest run    # Backend tests
cd packages/frontend && bunx vitest run   # Frontend tests

# E2E
npx playwright test
```

### Backend Test Commands

```bash
cd packages/backend
bun run test                 # Run all backend tests (vitest)
bun run test:watch           # Watch mode
bun run test:api             # Route tests only
bun run test:game-engine     # Game engine tests only
bun run test:fairness        # Provably fair tests
bun run test:currency        # Currency-related tests
```

### Frontend Test Commands

```bash
cd packages/frontend
bun run test                 # Run all frontend tests (vitest)
bun run test:watch           # Watch mode
bun run test:components      # Component tests only
bun run test:hooks           # Hook tests only
bun run test:ui              # UI component tests
bun run test:games           # Game component tests
```

### Mocking Example (Backend)

```typescript
import { vi, describe, test, expect } from 'vitest'

vi.mock('../services/user-service', () => ({
  UserService: {
    getUserProfile: vi.fn().mockResolvedValue({ id: '123', name: 'Test' }),
  },
}))

describe('User Route', () => {
  test('returns user profile', async () => {
    const response = await app.request('/api/users/me')
    expect(response.status).toBe(200)
  })
})
```

### Mocking Example (Frontend with MSW)

```typescript
import { http, HttpResponse } from 'msw'
import { server } from '../test-utils/mocks/handlers'

test('handles API error', async () => {
  server.use(
    http.post('/api/games/roulette/bet', () => {
      return HttpResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    })
  )
  // Test code...
})
```

## Best Practices and Guidelines

### General Principles

1. **Test behavior, not implementation**: Focus on what the code does, not how it does it
2. **Never mock the unit under test**: Importing your own mock and asserting on it tests nothing
3. **Use factories**: Create test data with factory functions for consistency
4. **Mock at boundaries**: Mock external dependencies (APIs, databases), not internal logic
5. **Keep tests independent**: Each test should run in isolation

### Assertions

- Assert exact values; avoid `toBeDefined()`/`typeof`-only checks
- Avoid `toBeGreaterThanOrEqual(400)`-style assertions that pass on crashes
- Use specific status codes (200, 400, 404, 500) instead of ranges

### React Testing Library

- Prefer accessible queries: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- Avoid CSS class queries (`.flex.flex-wrap`) — they break on styling changes
- Avoid hex color literals (`#16a34a`) — they break on palette changes
- Avoid emoji text queries (`getByText('🏥')`) — they break on content changes

### Statistical/Timing Tests

- Chi-square, RTP, and TTL-based tests need wide margins to avoid CI flakes
- Use `expect(value).toBeCloseTo(expected, precision)` for floating-point comparisons
- Consider moving statistical tests to a separate suite with relaxed timeouts

### Known Limitations

- **MSW is configured but unused**: The frontend test setup includes MSW with `onUnhandledRequest: 'error'`, but no frontend tests currently make HTTP requests. The handlers mock endpoints that don't exist in the backend.
- **Coverage is broken under Bun**: `@vitest/coverage-v8` requires Node's inspector API. The 75% (backend) and 80% (frontend) thresholds are configured but unverified.

## Coverage

Coverage thresholds are configured in the Vitest configs:

| Workspace | Threshold |
|---|---|
| Backend | 75% (lines, functions, branches, statements) |
| Frontend | 80% (lines, functions, branches, statements) |

**Exclusions:** test files, test utilities, type definitions, node modules.

### Coverage Limitation

**Warning:** Coverage cannot currently run under the Bun runtime. `@vitest/coverage-v8` requires Node's inspector API and fails with "Coverage APIs are not supported" when vitest runs on Bun.

**Workarounds:**
1. Run vitest under Node: `npx vitest run --coverage` (requires Node.js installed)
2. Switch provider to `@vitest/coverage-istanbul` in both `vitest.config.ts` files

## Test Utilities

### Backend (`packages/backend/src/test-utils/`)

| File | Purpose |
|---|---|
| `setup.ts` | Global test setup (env vars, JWT_SECRET) |
| `factories.ts` | Test data factories (users, games, API responses) |

### Frontend (`packages/frontend/src/test-utils/`)

| File | Purpose |
|---|---|
| `test-setup.ts` | Global test setup (jest-dom matchers, MSW server lifecycle) |
| `factories.ts` | Test data factories (components, hooks, API responses) |
| `mocks/handlers.ts` | MSW request handlers (currently unused) |

## Troubleshooting

### Tests fail with "Cannot find module"

Ensure all dependencies are installed:
```bash
bun install
```

### Coverage fails with "Coverage APIs are not supported"

The v8 coverage provider does not work under the Bun runtime. Run vitest with Node or switch to `@vitest/coverage-istanbul`.

### Backend tests fail with env var errors

Check that `setup.ts` is loaded in `packages/backend/vitest.config.ts`:
```typescript
setupFiles: ['./src/test-utils/setup.ts']
```

### Frontend tests fail with jest-dom matchers

Check that `test-setup.ts` is loaded in `packages/frontend/vitest.config.ts`:
```typescript
setupFiles: ['./src/test-utils/test-setup.ts']
```

## Migration from Bun Test

This project was migrated from `bun:test` to `vitest`. Key changes:

| Before (bun:test) | After (vitest) |
|---|---|
| `import { test, expect } from 'bun:test'` | `import { test, expect } from 'vitest'` |
| `mock()` | `vi.fn()` |
| `mock.module()` | `vi.mock()` |
| Happy DOM | jsdom |
| `bunfig.toml` preload | `vitest.config.ts` setupFiles |

## Related Components

- [Developer Guide](../README.md) — main documentation
- [Deployment Guide](../deployment/deployment.md) — production deployment
- [API Reference](../api/README.md) — endpoint documentation
- [Backend Game Engine](../backend/game-engine-README.md) — game logic architecture

## Version History

| Version | Date | Changes |
|---|---|---|
| 0.2 | 08/12/2026 | Migrated from bun:test to Vitest v4; updated all commands, configs, and examples |
| 0.1 | 08/07/2026 | Initial testing strategy documentation (bun:test) |
