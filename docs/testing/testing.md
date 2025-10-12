# Comprehensive Testing Suite Documentation

This document describes the complete testing strategy and implementation for the Tarkov Casino Website project.

## Overview

The testing suite uses **Bun Test** for all testing needs, covering:
- Unit tests for individual components and functions
- Integration tests for API endpoints and Appwrite operations
- End-to-end tests for complete user workflows
- Game fairness testing and statistical validation
- Performance tests for concurrent user scenarios
- Security and validation testing

### Why Bun Test?

- ⚡ **Fast**: 10x faster than Jest for TypeScript tests
- 🎯 **Built-in**: No additional test framework needed
- 🔄 **Compatible**: Works with React Testing Library
- 📦 **Zero Config**: Works out of the box
- 🎭 **Mocking**: Built-in mocking capabilities
- 📊 **Coverage**: Built-in coverage reporting

## Test Structure

```
├── packages/backend/src/
│   ├── services/
│   │   ├── currency.test.ts                    # Currency operations
│   │   ├── database.test.ts                    # Database operations
│   │   ├── statistics-integration.test.ts     # Statistics integration
│   │   └── game-engine/
│   │       ├── core-engine.test.ts             # Core game engine
│   │       ├── random-generator.test.ts        # Random number generation
│   │       ├── roulette-game.test.ts          # Roulette game logic
│   │       ├── blackjack-game.test.ts         # Blackjack game logic
│   │       ├── game-state-manager.test.ts     # Game state management
│   │       ├── game-validator.test.ts         # Game validation
│   │       └── payout-calculator.test.ts      # Payout calculations
│   ├── routes/
│   │   ├── auth.test.ts                       # Authentication API
│   │   └── games.test.ts                      # Game API endpoints
│   └── test-utils/
│       ├── setup.ts                           # Test configuration
│       ├── game-fairness.test.ts              # Game fairness validation
│       └── performance.test.ts                # Performance benchmarks
├── packages/frontend/src/
│   ├── components/
│   │   ├── auth/__tests__/
│   │   │   └── AuthForm.test.tsx              # Authentication forms
│   │   ├── games/__tests__/
│   │   │   ├── RouletteWheel.test.tsx         # Roulette interface
│   │   │   └── BlackjackGame.test.tsx         # Blackjack interface
│   │   └── ui/__tests__/
│   │       ├── GameHistoryTable.test.tsx     # Game history display
│   │       └── StatisticsDashboard.test.tsx  # Statistics dashboard
│   └── test-utils/
│       ├── test-setup.ts                      # Frontend test setup
│       └── e2e-tests.test.ts                  # End-to-end workflows
└── test-runner.js                             # Comprehensive test runner
```

## Test Categories

### 1. Unit Tests

**Backend Unit Tests:**
- Currency service operations and validation
- Game engine core functionality
- Random number generation and cryptographic security
- Individual game logic (roulette, blackjack)
- Payout calculations and game validation
- Database service methods
- Statistics calculations

**Frontend Unit Tests:**
- React component rendering and behavior
- User interaction handling
- Form validation and submission
- Game interface components
- Authentication flows
- Balance and currency display

### 2. Integration Tests

**API Integration:**
- Authentication endpoints (register, login, logout, password reset)
- Game endpoints (roulette, blackjack, case opening)
- User profile and statistics endpoints
- Appwrite database operations
- Error handling and validation

**Service Integration:**
- Game engine with Appwrite database
- Currency service with atomic balance operations
- Statistics service with game history
- Appwrite Realtime subscriptions
- Cache service (Dragonfly) integration

### 3. Game Fairness Testing

**Statistical Validation:**
- Random number generation uniformity
- Chi-square tests for distribution
- Runs tests for randomness
- Provably fair algorithm verification
- Game outcome probability validation

**Game-Specific Fairness:**
- Roulette wheel distribution and RTP (Return to Player)
- Blackjack basic strategy expected values
- Cross-game consistency checks

### 4. Performance Testing

**Load Testing:**
- Concurrent user game sessions
- Database query performance
- API response times under load
- Memory usage and leak detection
- CPU utilization monitoring

**Stress Testing:**
- Burst traffic patterns
- Sustained load scenarios
- Resource utilization limits
- Error handling under pressure

### 5. End-to-End Testing

**Complete User Workflows:**
- User registration and login
- Game playing sessions (all game types)
- Balance management and transactions
- Profile and statistics viewing
- Game history and filtering
- Daily bonus claiming

**Cross-Browser Testing:**
- Desktop and mobile responsiveness
- Different viewport sizes
- Touch and keyboard interactions
- Accessibility compliance

## Running Tests

### Root Level Testing

```bash
# Run all tests (backend + frontend)
bun test

# Run all tests with coverage
bun test --coverage

# Watch mode for all packages
bun test --watch
```

### Individual Package Testing

**Backend Testing:**
```bash
cd packages/backend

# All tests
bun test

# All tests with coverage
bun test --coverage

# Specific test suites
bun test:unit              # Unit tests only
bun test:integration       # Integration tests
bun test:performance       # Performance benchmarks
bun test:fairness          # Game fairness validation
bun test:game-engine       # Game engine tests
bun test:api               # API endpoint tests
bun test:database          # Database service tests
bun test:currency          # Currency operation tests
bun test:statistics        # Statistics service tests

# Watch mode for development
bun test --watch

# Run specific test file
bun test src/services/database.test.ts
```

**Frontend Testing:**
```bash
cd packages/frontend

# All tests
bun test

# All tests with coverage
bun test --coverage

# Specific test suites
bun test:components        # Component tests
bun test:hooks             # Hook tests
bun test:auth              # Authentication tests
bun test:games             # Game component tests
bun test:integration       # Integration tests
bun test:performance       # Performance tests

# Watch mode for development
bun test --watch

# Run specific test file
bun test src/components/games/Roulette.test.tsx
```

## Test Configuration

### Backend Configuration (Bun Test)

**No configuration file needed** - Bun test works out of the box!

```typescript
// packages/backend/src/services/example.test.ts
import { describe, test, expect } from 'bun:test';

describe('Service Tests', () => {
  test('should do something', () => {
    expect(2 + 2).toBe(4);
  });
});
```

**Package.json scripts:**
```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:unit": "bun test --test-name-pattern='.*\\.test\\.ts$'",
    "test:integration": "bun test src/integration/",
    "test:performance": "bun test src/test-utils/performance.test.ts"
  }
}
```

### Frontend Configuration (Bun Test)

**Configuration:** `bunfig.toml` (root level)

```toml
[test]
preload = ["./packages/frontend/src/test-utils/test-setup.ts"]
```

**Test setup file:**
```typescript
// packages/frontend/src/test-utils/test-setup.ts
import { beforeAll, afterAll } from 'bun:test';
import '@happy-dom/global-registrator';

// Setup happy-dom for React component tests
beforeAll(() => {
  // Global test setup
});

afterAll(() => {
  // Global test cleanup
});
```

**Package.json scripts:**
```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:components": "bun test src/components",
    "test:hooks": "bun test src/hooks",
    "test:integration": "bun test src/test-utils/integration"
  }
}
```

## Coverage Requirements

### Minimum Coverage Targets

- **Overall Code Coverage:** 85%
- **Critical Game Logic:** 95%
- **API Endpoints:** 90%
- **Currency Operations:** 95%
- **Authentication:** 90%
- **UI Components:** 80%

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text:** Console output during test runs
- **HTML:** Detailed interactive reports in `coverage/` directories
- **JSON:** Machine-readable format for CI/CD integration

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests with coverage
        run: bun test --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
```

### Pre-commit Hooks

```json
{
  "scripts": {
    "pre-commit": "bun test"
  }
}
```

Or using Husky:

```bash
# Install husky
bun add -D husky

# Setup git hooks
bunx husky install

# Add pre-commit hook
bunx husky add .husky/pre-commit "bun test"
```

## Test Data Management

### Mock Data

- **Users:** Standardized test user profiles
- **Games:** Predefined game scenarios and outcomes
- **Transactions:** Sample currency operations
- **Statistics:** Historical data for testing calculations

### Test Database

- **Isolated Environment:** Separate test database instance
- **Seed Data:** Consistent test data across runs
- **Cleanup:** Automatic cleanup after test completion

## Game Fairness Validation

### Statistical Tests

1. **Chi-Square Test:** Validates uniform distribution of random numbers
2. **Runs Test:** Ensures randomness in sequences
3. **Kolmogorov-Smirnov Test:** Compares distributions
4. **Entropy Analysis:** Measures randomness quality

### Provably Fair Verification

- **Seed Generation:** Cryptographically secure random seeds
- **Hash Verification:** SHA-256 hash validation
- **Client Seed Integration:** User-provided randomness
- **Result Reproducibility:** Consistent results from same seeds

### Game-Specific Validation

**Roulette:**
- Number distribution uniformity (0-36)
- Color distribution (red/black/green)
- Bet type payout accuracy
- House edge verification (~2.7%)

**Blackjack:**
- Card distribution from shuffled deck
- Hand value calculations
- Basic strategy expected values
- House edge verification (~0.5%)


## Performance Benchmarks

### Response Time Targets

- **Game API Endpoints:** < 100ms average
- **Database Queries:** < 50ms average
- **Authentication:** < 200ms average
- **Statistics Calculation:** < 500ms average

### Concurrency Targets

- **Simultaneous Users:** 1000+ concurrent sessions
- **Games per Second:** 100+ game completions
- **Database Connections:** Efficient connection pooling
- **Memory Usage:** < 500MB under normal load

### Load Testing Scenarios

1. **Gradual Ramp-up:** 0 to 1000 users over 10 minutes
2. **Spike Testing:** Sudden traffic bursts
3. **Sustained Load:** Constant high traffic for 30 minutes
4. **Mixed Workload:** Different game types simultaneously

## Security Testing

### Input Validation

- **SQL Injection Prevention:** Parameterized queries
- **XSS Protection:** Input sanitization and output encoding
- **CSRF Protection:** Token validation
- **Rate Limiting:** API abuse prevention

### Authentication Security

- **Password Strength:** Minimum complexity requirements
- **Session Management:** Secure token handling
- **Account Lockout:** Brute force protection
- **Password Reset:** Secure reset flow

### Game Security

- **Server-side Validation:** All game logic on server
- **Anti-tampering:** Client manipulation prevention
- **Audit Logging:** Complete game transaction history
- **Balance Validation:** Atomic currency operations

## Accessibility Testing

### WCAG Compliance

- **Level AA Compliance:** Meeting accessibility standards
- **Screen Reader Support:** Proper ARIA labels and roles
- **Keyboard Navigation:** Full keyboard accessibility
- **Color Contrast:** Sufficient contrast ratios

### Testing Tools

- **axe-core:** Automated accessibility testing
- **Screen Readers:** Manual testing with NVDA/JAWS
- **Keyboard Only:** Navigation without mouse
- **Color Blindness:** Testing with color filters

## Monitoring and Alerting

### Test Metrics

- **Test Execution Time:** Performance tracking
- **Flaky Test Detection:** Identifying unstable tests
- **Coverage Trends:** Coverage over time
- **Failure Analysis:** Root cause identification

### Alerts

- **Test Failures:** Immediate notification
- **Coverage Drops:** Below threshold alerts
- **Performance Regression:** Response time increases
- **Security Issues:** Vulnerability detection

## Best Practices

### Test Writing Guidelines

1. **Descriptive Names:** Clear test descriptions
2. **Single Responsibility:** One assertion per test
3. **Independent Tests:** No test dependencies
4. **Proper Setup/Teardown:** Clean test environment
5. **Mock External Dependencies:** Isolated testing

### Code Quality

- **TypeScript:** Strong typing for test reliability
- **ESLint:** Code style consistency
- **Prettier:** Automatic code formatting
- **Documentation:** Comprehensive test documentation

### Maintenance

- **Regular Updates:** Keep tests current with code changes
- **Refactoring:** Improve test structure and readability
- **Performance:** Optimize slow-running tests
- **Coverage Analysis:** Identify untested code paths

## Troubleshooting

### Common Issues

1. **Flaky Tests:** Timing issues and race conditions
2. **Memory Leaks:** Improper cleanup in tests
3. **Database Locks:** Concurrent test execution
4. **Mock Issues:** Incorrect mock configurations

### Debugging Tools

- **Test Logs:** Detailed execution logging
- **Coverage Reports:** Identify missing tests
- **Performance Profiling:** Find bottlenecks
- **Error Stack Traces:** Detailed failure information

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing:** Screenshot comparisons
2. **API Contract Testing:** Schema validation
3. **Chaos Engineering:** Fault injection testing
4. **A/B Testing Framework:** Feature flag testing
5. **Real User Monitoring:** Production test data

### Tool Upgrades

- **Test Framework Updates:** Latest testing libraries
- **CI/CD Improvements:** Faster pipeline execution
- **Reporting Enhancements:** Better test insights
- **Automation Expansion:** More automated testing

---

## Bun Test Features

### Built-in Features

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, mock, spyOn } from 'bun:test';

describe('Bun Test Features', () => {
  // Lifecycle hooks
  beforeAll(() => console.log('Before all tests'));
  afterAll(() => console.log('After all tests'));
  beforeEach(() => console.log('Before each test'));
  afterEach(() => console.log('After each test'));

  // Basic test
  test('basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  // Async test
  test('async operation', async () => {
    const result = await someAsyncFunction();
    expect(result).toBeDefined();
  });

  // Mocking
  test('function mocking', () => {
    const mockFn = mock((x) => x * 2);
    expect(mockFn(5)).toBe(10);
    expect(mockFn).toHaveBeenCalledWith(5);
  });

  // Spying
  test('spy on object method', () => {
    const obj = { method: () => 'original' };
    const spy = spyOn(obj, 'method').mockReturnValue('mocked');
    
    expect(obj.method()).toBe('mocked');
    expect(spy).toHaveBeenCalled();
  });
});
```

### Snapshot Testing

```typescript
import { test, expect } from 'bun:test';

test('snapshot test', () => {
  const data = {
    user: 'test',
    balance: 10000
  };
  
  expect(data).toMatchSnapshot();
});
```

### Performance Testing

```typescript
import { test, expect } from 'bun:test';

test('performance benchmark', () => {
  const start = performance.now();
  
  // Run operation
  const result = expensiveOperation();
  
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(100); // Should complete in < 100ms
});
```

---

This comprehensive testing suite ensures the reliability, security, and performance of the Tarkov Casino Website while maintaining high code quality and user experience standards. Powered by Bun Test for maximum speed and efficiency.