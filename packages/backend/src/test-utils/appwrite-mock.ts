/**
 * Appwrite Mock Utilities
 * Provides mock implementations for Appwrite services to enable testing without hitting real Appwrite instances
 */

import { Client, Databases, ID, Query, Models } from 'node-appwrite';

/**
 * In-memory mock implementation of Appwrite Databases
 */
export class MockDatabases {
  private collections: Map<string, Map<string, any>> = new Map();

  async createDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    document: any,
    permissions?: string[]
  ): Promise<Models.Document> {
    if (!this.collections.has(collectionId)) {
      this.collections.set(collectionId, new Map());
    }

    const collection = this.collections.get(collectionId)!;

    const doc: Models.Document = {
      $id: documentId || ID.unique(),
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      $permissions: permissions || [],
      $databaseId: databaseId,
      $collectionId: collectionId,
      ...document
    };

    collection.set(doc.$id, doc);
    return doc;
  }

  async getDocument(
    databaseId: string,
    collectionId: string,
    documentId: string
  ): Promise<Models.Document> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const doc = collection.get(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    return doc;
  }

  async updateDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    updates: any
  ): Promise<Models.Document> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const doc = collection.get(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    const updated = {
      ...doc,
      ...updates,
      $updatedAt: new Date().toISOString()
    };

    collection.set(documentId, updated);
    return updated;
  }

  async deleteDocument(
    databaseId: string,
    collectionId: string,
    documentId: string
  ): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    if (!collection.has(documentId)) {
      throw new Error(`Document ${documentId} not found`);
    }

    collection.delete(documentId);
  }

  async listDocuments(
    databaseId: string,
    collectionId: string,
    queries?: string[]
  ): Promise<Models.DocumentList<Models.Document>> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const docs = Array.from(collection.values());

    // Basic query filtering
    let filteredDocs = docs;
    if (queries && queries.length > 0) {
      for (const query of queries) {
        if (query.startsWith('equal(')) {
          const match = query.match(/^equal\(([^,]+),\s*(.+)\)$/);
          if (match) {
            const field = match[1].trim();
            const value = match[2].trim();
            filteredDocs = filteredDocs.filter(doc => {
              const fieldValue = (doc as any)[field];
              if (typeof fieldValue === 'string' || typeof fieldValue === 'number') {
                return fieldValue === value;
              }
              return false;
            });
          }
        }
      }
    }

    return {
      documents: filteredDocs,
      total: filteredDocs.length
    };
  }

  /**
   * Clear all mock data
   */
  clear(): void {
    this.collections.clear();
  }

  /**
   * Get all documents in a collection
   */
  getAllDocuments(collectionId: string): any[] {
    const collection = this.collections.get(collectionId);
    return collection ? Array.from(collection.values()) : [];
  }
}

/**
 * Create a mock Appwrite client
 */
export function createMockAppwriteClient(): {
  client: Client;
  databases: MockDatabases;
} {
  const client = new Client();
  const databases = new MockDatabases();

  // Override databases instance with our mock
  return { client, databases };
}

/**
 * Setup function for tests using Appwrite mocks
 */
export async function setupAppwriteTestEnv(): Promise<MockDatabases> {
  const databases = new MockDatabases();

  // Set environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.APPWRITE_ENDPOINT = 'https://test.appwrite.io/v1';
  process.env.APPWRITE_PROJECT_ID = 'test-project';
  process.env.APPWRITE_API_KEY = 'test-api-key';

  return databases;
}

/**
 * Helper to seed test data
 */
export function seedTestData(databases: MockDatabases, collectionId: string, documents: any[]): void {
  documents.forEach(doc => {
    const documentId = doc.$id || ID.unique();
    databases.createDocument('test-db', collectionId, documentId, doc).catch(() => {});
  });
}

