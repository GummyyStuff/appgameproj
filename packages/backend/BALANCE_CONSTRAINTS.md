# Balance Constraints Documentation

## Overview

This document outlines the balance constraints and testing strategy to prevent regression of the balance update bug discovered on October 12, 2025.

## The Bug That Was Fixed

**Symptom:** When opening a Legendary Case (5,000 cost) with 12,140 balance, the transaction would fail with "Failed to update balance" and roll back.

**Root Cause:** The `balance` attribute in Appwrite had a minimum constraint of 10,000.
- Current balance: 12,140
- After deduction: 7,140 (12,140 - 5,000)
- **7,140 < 10,000** ❌ Validation failed!

**Solution:** Updated balance attribute constraint from min=10,000 to min=0.

## Current Balance Constraints

### Appwrite Attribute Settings
- **Attribute:** `balance` (double/float)
- **Minimum:** `0` (allows balance to go down to zero)
- **Maximum:** `null` (no upper limit)
- **Default:** `10000` (starting balance for new users)
- **Required:** `false`

### Application-Level Validation
The `CurrencyService.validateBalance()` function enforces:
- ✅ Required amount must be **positive** (> 0)
- ✅ User must have **sufficient balance** (balance >= required)
- ✅ Rejects **negative** or **zero** bet amounts
- ✅ Prevents balance from going **negative** during transactions

### Permission Settings
- **Collection-level:** Document Security = `false`
- **Document-level:** Empty permissions (relies on collection-level)
- **API Key:** Has `documents.write` scope for full access

## Testing Strategy

### Test Files
1. **`balance-constraints.test.ts`** - Tests Appwrite attribute constraints
2. **`currency-balance.test.ts`** - Tests application-level validation
3. **`case-opening-balance.test.ts`** - Integration tests for case opening

### Running Tests
```bash
# Run all balance tests
bun run test:balance

# Run only constraint verification tests
bun run test:constraints

# Run in CI
bun run test:ci
```

### Test Coverage
- ✅ Balance attribute has correct min/max/default values
- ✅ Balance can be set below 10,000 (regression prevention)
- ✅ Balance can be set to 0
- ✅ Balance cannot go negative
- ✅ Legendary case (5,000) works with 12,000 balance
- ✅ Document security is disabled
- ✅ API key can update user documents
- ✅ validateBalance rejects negative/zero amounts
- ✅ processGameTransaction prevents insufficient balance

## Maintenance Scripts

### Fix Scripts (One-time use, already applied)
- `fix-users-collection-permissions.ts` - Disabled document security
- `fix-user-document-permissions.ts` - Removed document-level permissions
- `fix-balance-attribute-constraint.ts` - Updated balance min from 10,000 to 0

### Verification Script
```bash
bun run packages/backend/src/scripts/fix-balance-attribute-constraint.ts
```

## Preventing Regression

### In Development
1. **Run tests before deploying:**
   ```bash
   bun run test:balance
   ```

2. **Watch for test failures** in CI pipeline

3. **Monitor Appwrite Console** - Don't manually change balance attribute

### In Production
1. **Never manually modify** the `balance` attribute in Appwrite Console
2. **Any attribute changes** should be scripted and tested
3. **Run regression tests** after any Appwrite schema changes

## Lessons Learned

1. **Appwrite attribute constraints are strict** - They validate on every update
2. **Document Security** can interfere with API key operations
3. **Default values** set during collection creation can cause issues later
4. **Test attribute constraints** to prevent schema-level bugs
5. **Log detailed errors** for faster debugging

## Related Issues

- User balance update failures
- Case opening rollback issues
- "Invalid document structure" errors
- Permission denied errors with API key

## References

- [Appwrite Database Permissions](https://appwrite.io/docs/products/databases/permissions)
- [Appwrite API Keys](https://appwrite.io/docs/advanced/platform/api-keys)
- [Server SDK Best Practices](https://appwrite.io/docs/sdks#server)

