# Testing Strategy

## Overview

This document outlines the testing strategy for the Tarkov Casino project. We use **Bun test** as our testing framework.

## Test Organization

### Backend Tests (`packages/backend/src`)

#### Critical Tests (Must Pass)
- `test-utils/game-fairness.test.ts` - Core game fairness validation
- `test-utils/security-*.test.ts` - Security tests
- `test-utils/performance.test.ts` - Performance benchmarks
- `services/game-engine/*.test.ts` - Game engine unit tests
- `routes/*.test.ts` - API route validation
- `services/currency.test.ts` - Currency operations
- `services/statistics.test.ts` - Statistics calculation

#### Service Tests
- Tests in `services/__tests__/` - Service-specific tests
- Tests in `services/game-engine/` - Game-specific logic tests

### Frontend Tests (`packages/frontend/src`)

#### Critical Tests
- `utils/currency.test.ts` - Currency utilities
- `test-utils/accessibility-tests.test.ts` - Accessibility validation
- `test-utils/performance-tests.test.ts` - Performance checks
- `components/**/__tests__/*.test.tsx` - Component tests
- `hooks/__tests__/*.test.tsx` - Hook tests

## Test Categories

### 1. Unit Tests
**Purpose**: Test individual functions and methods in isolation
- No external dependencies
- Fast execution
- Pure logic validation

**Example**: Testing currency formatting, validation functions

### 2. Integration Tests
**Purpose**: Test interactions between services
- Uses mocks for external services (Appwrite)
- Tests data flow between components
- Validates API contracts

**Example**: Testing case opening with mock Appwrite data

### 3. E2E Tests (Limited)
**Purpose**: Test complete user workflows
- Currently skipped due to complexity
- Would require full browser automation
- Reserved for critical user journeys

## Appwrite Testing Strategy

### Using Mocks

For unit and integration tests, we use mock Appwrite implementations instead of hitting real services:

```typescript
import { MockDatabases, setupAppwriteTestEnv } from '../test-utils/appwrite-mock';

describe('UserService Tests', () => {
  let databases: MockDatabases;

  beforeEach(async () => {
    databases = await setupAppwriteTestEnv();
    // Seed test data
  });
});
```

### Benefits of Mocking
1. **Speed**: Tests run faster without network calls
2. **Reliability**: No dependency on external services
3. **Deterministic**: Tests produce consistent results
4. **Isolation**: Tests don't affect production data

## Test Coverage Goals

### Minimum Coverage Targets
- **Core Game Logic**: 80%+ coverage
- **Currency Operations**: 90%+ coverage  
- **API Routes**: 70%+ coverage
- **Components**: 60%+ coverage

### What We Test
✅ Business logic and algorithms  
✅ Data transformations  
✅ Validation functions  
✅ Error handling  
✅ Security constraints  
✅ Fairness algorithms  

### What We Don't Test
❌ Third-party libraries  
❌ Framework code  
❌ Generated code  
❌ Trivial getters/setters  

## Running Tests

```bash
# Run all tests
bun test

# Run backend tests only
cd packages/backend && bun test

# Run frontend tests only
cd packages/frontend && bun test

# Run specific test file
bun test packages/backend/src/test-utils/game-fairness.test.ts

# Run with coverage
bun test --coverage
```

## Test Best Practices

### 1. Write Focused Tests
- Each test should verify one specific behavior
- Use descriptive test names
- Keep test setup simple

### 2. Use Proper Assertions
- Use specific matchers (e.g., `toBe` vs `toEqual`)
- Test edge cases and boundaries
- Verify error conditions

### 3. Organize Tests
- Group related tests with `describe` blocks
- Use `beforeEach` for common setup
- Clean up in `afterEach` if needed

### 4. Mock External Dependencies
- Mock Appwrite, APIs, and external services
- Don't make real network calls in tests
- Use factories for test data

### 5. Maintain Test Independence
- Don't rely on test execution order
- Each test should be self-contained
- Reset state between tests

## Debugging Failed Tests

1. **Read the error message carefully**
2. **Check which assertion failed**
3. **Verify test data matches expectations**
4. **Run the test in isolation**: `bun test path/to/test.ts`
5. **Add console.log for debugging**
6. **Check for async/await issues**

## Test Maintenance

### When to Update Tests
- When fixing bugs (add test for the bug)
- When adding new features
- When refactoring code
- When tests become obsolete

### When to Delete Tests
- Tests that always skip with no plan to implement
- Obsolete tests for removed features
- Duplicate tests (keep one, remove others)

## Current Test Status

### ✅ Working Well
- Game fairness tests
- Currency utilities
- Validation functions
- Component rendering
- Accessibility checks

### ⚠️ Needs Work
- E2E tests (skipped, need browser automation)
- Some integration tests (need Appwrite mocking)
- Complex component tests with heavy dependencies

### 🚫 Removed
- Duplicate case opening tests
- Obsolete Supabase tests
- Broken tests with no clear fix path

## Continuous Integration

Tests are run on every commit to ensure:
- All critical tests pass
- No regressions introduced
- Code quality maintained

## Resources

- [Bun Test Docs](https://bun.sh/docs/test)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Appwrite MCP Docs](https://github.com/appwrite/mcp) (when available)
