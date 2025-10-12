# Balance & Constraint Tests

This directory contains tests that ensure balance operations work correctly and prevent regression of critical bugs.

## Test Files

### `balance-constraints.test.ts`
**Purpose:** Verify Appwrite database attribute constraints are correct

Tests:
- ✅ Balance attribute minimum is 0 (not 10,000)
- ✅ Balance attribute default is 10,000
- ✅ Balance can be set below 10,000
- ✅ Balance can be set to 0
- ✅ Balance cannot go negative
- ✅ Collection has document security disabled
- ✅ API key can update user documents

### `currency-balance.test.ts`
**Purpose:** Test application-level balance validation logic

Tests:
- ✅ Validates sufficient funds correctly
- ✅ Detects insufficient funds correctly
- ✅ Rejects negative bet amounts
- ✅ Rejects zero bet amounts
- ✅ Rejects negative win amounts
- ✅ Prevents transactions that would cause negative balance
- ✅ Handles edge cases (0 balance, very small, very large)

### `case-opening-balance.test.ts`
**Purpose:** Integration tests for case opening with balance constraints

Tests:
- ✅ Can open case with balance between 0-10,000
- ✅ Legendary case (5,000) works with 12,000 balance (regression test)
- ✅ Cannot set negative balance
- ✅ All active cases have valid prices
- ✅ Case validation works correctly
- ✅ Legendary case has valid rarity distribution

## Running Tests

```bash
# From project root
bun run test:balance              # All balance tests
bun run test:constraints          # Only constraint verification

# From backend directory
bun test src/services/__tests__/  # All tests in this directory
```

## Why These Tests Exist

### The Bug (October 12, 2025)
Users couldn't open Legendary Cases (5,000 cost) when they had 12,140 balance because:
1. Balance would be: 12,140 - 5,000 = 7,140
2. Balance attribute had minimum constraint of 10,000
3. 7,140 < 10,000 = validation error
4. Transaction rolled back

### The Fix
1. Updated balance attribute: min = 10,000 → min = 0
2. Disabled document security on users collection
3. Removed document-level permissions from user documents

### Prevention
These tests ensure the constraints stay correct and catch regressions early.

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Verify Balance Constraints
  run: bun run test:balance
```

## Maintenance

**Before deploying schema changes:**
```bash
bun run test:balance
```

**If tests fail:**
1. Check Appwrite Console → Users Collection → Settings → Attributes → balance
2. Verify minimum = 0, default = 10000
3. Run fix script: `bun run packages/backend/src/scripts/fix-balance-attribute-constraint.ts`

