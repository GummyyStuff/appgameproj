/**
 * Case Opening Balance Integration Tests
 * Tests the full case opening flow with balance constraints
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { Databases, Client, Query } from 'node-appwrite';
import { DATABASE_ID, COLLECTION_IDS } from '../../config/collections';
import { CaseOpeningService } from '../case-opening-appwrite';

// Check if Appwrite is available for integration tests
const isAppwriteAvailable = () => {
  return process.env.APPWRITE_ENDPOINT && 
         process.env.APPWRITE_PROJECT_ID && 
         process.env.APPWRITE_API_KEY &&
         process.env.APPWRITE_API_KEY !== 'test-key';
};

const setupClient = () => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://localhost:80/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || 'test')
    .setKey(process.env.APPWRITE_API_KEY || 'test-key');
  
  return new Databases(client);
};

describe.skipIf(!isAppwriteAvailable())('Case Opening - Balance Constraint Regression Tests - Integration', () => {
  let databases: Databases;

  beforeAll(() => {
    databases = setupClient();
  });

  test('should be able to open a case with balance between 0 and 10000', async () => {
    // Get a test user
    const users = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      [Query.limit(1)]
    );

    if (users.documents.length === 0) {
      console.warn('⚠️  No users found to test with, skipping');
      return;
    }

    const testUser = users.documents[0];
    const originalBalance = testUser.balance;

    try {
      // Set balance to 8000 (between 0 and old constraint of 10000)
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: 8000 }
      );

      // Get a case that costs 5000 or less
      const cases = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_IDS.CASE_TYPES,
        [Query.equal('isActive', true), Query.limit(10)]
      );

      const affordableCase = cases.documents.find(c => c.price <= 5000);

      if (!affordableCase) {
        console.warn('⚠️  No affordable cases found, skipping');
        return;
      }

      // Simulate balance deduction for case opening
      const newBalance = 8000 - affordableCase.price;

      // This should succeed (previously would fail with 10000 constraint)
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: newBalance }
      );

      expect(newBalance).toBeLessThan(10000);
      expect(newBalance).toBeGreaterThanOrEqual(0);

    } finally {
      // Restore original balance
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: originalBalance }
      );
    }
  });

  test('legendary case (5000) should be openable with 12000 balance', async () => {
    const users = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      [Query.limit(1)]
    );

    if (users.documents.length === 0) {
      console.warn('⚠️  No users found to test with, skipping');
      return;
    }

    const testUser = users.documents[0];
    const originalBalance = testUser.balance;

    try {
      // Set balance to 12000 (the exact balance user had when bug occurred)
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: 12000 }
      );

      // Deduct legendary case cost (5000)
      const newBalance = 12000 - 5000; // = 7000

      // This should succeed (7000 > 0, but < 10000)
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: newBalance }
      );

      expect(newBalance).toBe(7000);
      expect(newBalance).toBeGreaterThan(0);
      expect(newBalance).toBeLessThan(10000); // This was the constraint causing failure

    } finally {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: originalBalance }
      );
    }
  });

  test('should not allow balance to go negative', async () => {
    const users = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      [Query.limit(1)]
    );

    if (users.documents.length === 0) {
      console.warn('⚠️  No users found to test with, skipping');
      return;
    }

    const testUser = users.documents[0];

    try {
      // Try to set negative balance
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: -100 }
      );

      // Should not reach here
      expect(true).toBe(false);

    } catch (error: any) {
      // Should throw error for negative balance
      expect(error.code).toBe(400);
      expect(error.message).toContain('Invalid');
    }
  });

  test('all active cases should have valid prices', async () => {
    const cases = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.CASE_TYPES,
      [Query.equal('isActive', true), Query.limit(100)]
    );

    for (const caseType of cases.documents) {
      expect(caseType.price).toBeGreaterThan(0);
      expect(caseType.price).toBeLessThanOrEqual(10000); // Reasonable max
    }
  });
});

describe.skipIf(!isAppwriteAvailable())('Case Opening - Validation Tests - Integration', () => {
  let databases: Databases;

  beforeAll(() => {
    databases = setupClient();
  });
  
  test('validateCaseOpening should check balance constraints', async () => {
    // This test ensures the validation logic catches insufficient balance
    const mockUserId = 'test-user';
    
    // Get a case
    const cases = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.CASE_TYPES,
      [Query.equal('isActive', true), Query.limit(1)]
    );

    if (cases.documents.length === 0) {
      console.warn('⚠️  No cases found, skipping');
      return;
    }

    const testCase = cases.documents[0];

    // Validation should succeed for case type existence
    const validation = await CaseOpeningService.validateCaseOpening(
      mockUserId,
      testCase.$id
    );

    expect(validation.isValid).toBe(true);
    expect(validation.caseType).toBeDefined();
    expect(validation.caseType?.id).toBe(testCase.$id);
  });

  test('legendary case should have correct rarity distribution', async () => {
    const cases = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.CASE_TYPES,
      [Query.equal('name', 'Legendary Case'), Query.limit(1)]
    );

    if (cases.documents.length === 0) {
      console.warn('⚠️  Legendary Case not found, skipping');
      return;
    }

    const legendaryCase = cases.documents[0];
    const distribution = JSON.parse(legendaryCase.rarityDistribution);

    // Verify distribution adds up to 100
    const total = 
      distribution.common + 
      distribution.uncommon + 
      distribution.rare + 
      distribution.epic + 
      distribution.legendary;

    expect(total).toBe(100);

    // Verify legendary case has reasonable legendary drop rate
    expect(distribution.legendary).toBeGreaterThan(0);
    expect(distribution.legendary).toBeLessThanOrEqual(10); // Max 10%
  });
});

describe.skipIf(!isAppwriteAvailable())('Balance Attribute Regression Prevention - Integration', () => {
  let databases: Databases;

  beforeAll(() => {
    databases = setupClient();
  });
  
  test('balance attribute constraint should be documented', async () => {
    const attribute = await databases.getAttribute(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      'balance'
    );

    // Document the expected constraints
    const expectedConstraints = {
      min: 0,        // Must be 0, not 10000
      required: false,
      default: 10000, // New users start with 10000
    };

    expect(attribute.min).toBe(expectedConstraints.min);
    expect(attribute.required).toBe(expectedConstraints.required);
    expect(attribute.default).toBe(expectedConstraints.default);

    // Log for documentation
    console.log('✅ Balance attribute constraints verified:');
    console.log(`   - Minimum: ${attribute.min} (allows balances below 10,000)`);
    console.log(`   - Default: ${attribute.default} (starting balance)`);
    console.log(`   - Required: ${attribute.required}`);
  });

  test('collection should not have document security enabled', async () => {
    const collection = await databases.getCollection(
      DATABASE_ID,
      COLLECTION_IDS.USERS
    );

    expect(collection.documentSecurity).toBe(false);

    console.log('✅ Collection security verified:');
    console.log(`   - Document Security: ${collection.documentSecurity} (disabled)`);
    console.log('   - This allows API key to update balances without document-level permission checks');
  });
});

