/**
 * Balance Constraints Tests
 * Ensures balance attribute constraints are correct and balance can't go negative
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { Databases, Client, Query } from 'node-appwrite';
import { DATABASE_ID, COLLECTION_IDS } from '../../config/collections';

// Check if Appwrite is available for integration tests
const isAppwriteAvailable = () => {
  return process.env.APPWRITE_ENDPOINT && 
         process.env.APPWRITE_PROJECT_ID && 
         process.env.APPWRITE_API_KEY &&
         process.env.APPWRITE_API_KEY !== 'test-key';
};

// Setup Appwrite client for tests
const setupClient = () => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'http://localhost:80/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || 'test')
    .setKey(process.env.APPWRITE_API_KEY || 'test-key');
  
  return new Databases(client);
};

describe.skipIf(!isAppwriteAvailable())('Balance Attribute Constraints - Integration Tests', () => {
  let databases: Databases;

  beforeAll(() => {
    databases = setupClient();
  });

  test('balance attribute should have minimum of 0, not 10000', async () => {
    const attribute = await databases.getAttribute(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      'balance'
    );

    expect(attribute.key).toBe('balance');
    expect(attribute.type).toBe('double');
    expect(attribute.min).toBe(0); // Critical: must be 0, not 10000
    expect(attribute.required).toBe(false);
  });

  test('balance attribute should have default of 10000 for new users', async () => {
    const attribute = await databases.getAttribute(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      'balance'
    );

    expect(attribute.default).toBe(10000);
  });

  test('should allow balance to be set below 10000', async () => {
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
      // Try to set balance to 5000 (below old constraint of 10000)
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: 5000 }
      );

      // Verify it was set
      const updated = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id
      );

      expect(updated.balance).toBe(5000);
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

  test('should allow balance to be set to 0', async () => {
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
      // Try to set balance to 0 (minimum allowed)
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: 0 }
      );

      const updated = await databases.getDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id
      );

      expect(updated.balance).toBe(0);
    } finally {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: originalBalance }
      );
    }
  });

  test('should reject negative balance', async () => {
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

    // Try to set balance to negative value
    try {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_IDS.USERS,
        testUser.$id,
        { balance: -100 }
      );

      // Should not reach here
      expect(true).toBe(false); // Force fail if negative balance was allowed
    } catch (error: any) {
      // Should throw an error for negative balance
      expect(error.message).toContain('Invalid');
      expect(error.code).toBe(400);
    }
  });
});

describe.skipIf(!isAppwriteAvailable())('Collection Permissions - Integration Tests', () => {
  let databases: Databases;

  beforeAll(() => {
    databases = setupClient();
  });

  test('users collection should have document security disabled', async () => {
    const collection = await databases.getCollection(
      DATABASE_ID,
      COLLECTION_IDS.USERS
    );

    expect(collection.documentSecurity).toBe(false);
  });

  test('users collection should allow API key to update documents', async () => {
    const collection = await databases.getCollection(
      DATABASE_ID,
      COLLECTION_IDS.USERS
    );

    // Check collection-level permissions
    const hasUpdatePermission = collection.$permissions.some(
      (perm: string) => perm.includes('update')
    );

    expect(hasUpdatePermission).toBe(true);
  });
});

describe.skipIf(!isAppwriteAvailable())('User Document Permissions - Integration Tests', () => {
  let databases: Databases;

  beforeAll(() => {
    databases = setupClient();
  });

  test('user documents should have empty or minimal permissions', async () => {
    const users = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.USERS,
      [Query.limit(5)]
    );

    if (users.documents.length === 0) {
      console.warn('⚠️  No users found to test with, skipping');
      return;
    }

    for (const user of users.documents) {
      // Document permissions should be empty since collection-level handles access
      // If there are permissions, they shouldn't restrict API key access
      const permissions = user.$permissions || [];
      
      // Either no permissions, or permissions that don't block API key
      // (We fixed this by removing document-level permissions)
      expect(permissions.length).toBeLessThanOrEqual(2);
    }
  });
});

