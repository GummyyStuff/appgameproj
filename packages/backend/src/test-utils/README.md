# Test Utilities

This directory contains test utilities for the backend services.

## Appwrite Mock

The `appwrite-mock.ts` module provides mock implementations of Appwrite services to enable testing without connecting to a real Appwrite instance.

### Usage

```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { MockDatabases, setupAppwriteTestEnv, seedTestData } from '../test-utils/appwrite-mock';
import { UserService } from '../services/user-service';

describe('UserService Tests', () => {
  let databases: MockDatabases;

  beforeEach(async () => {
    databases = await setupAppwriteTestEnv();
    
    // Seed test data
    seedTestData(databases, 'user_profiles', [
      {
        $id: 'user-1',
        user_id: 'user-1',
        balance: 1000,
        username: 'testuser'
      }
    ]);
  });

  test('should get user profile', async () => {
    const profile = await UserService.getUserProfile('user-1');
    expect(profile).toBeDefined();
    expect(profile?.balance).toBe(1000);
  });
});
```

## Testing Strategy

### Unit Tests
- Test core business logic without dependencies
- Use mocks for external services
- Focus on algorithms and data transformations

### Integration Tests
- Test service interactions with Appwrite
- Use mock Appwrite for deterministic tests
- Verify database operations work correctly

### E2E Tests
- Test complete workflows
- Use real Appwrite instance or dockerized test instance
- Verify user-facing functionality

## Best Practices

1. **Use Mocks for Unit Tests**: Don't hit real Appwrite in unit tests
2. **Test Business Logic**: Focus on the core game logic, not infrastructure
3. **Keep Tests Fast**: Mocks make tests fast and reliable
4. **Test Edge Cases**: Especially for currency and balance calculations
5. **Verify Constraints**: Test that game fairness constraints are enforced

