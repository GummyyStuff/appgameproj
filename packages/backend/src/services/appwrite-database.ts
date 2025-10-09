/**
 * Appwrite Database Service Layer
 * Centralized service for all Appwrite Database operations
 */

import { Databases, Query, ID, Permission, Role } from 'node-appwrite';
import { appwriteClient } from '../config/appwrite';
import { DATABASE_ID, CollectionId } from '../config/collections';

export class AppwriteDatabaseService {
  private databases: Databases;

  constructor() {
    this.databases = new Databases(appwriteClient);
  }

  /**
   * Create a new document in a collection
   */
  async createDocument<T>(
    collectionId: CollectionId,
    data: Omit<T, '$id'>,
    documentId: string = ID.unique(),
    permissions?: string[]
  ) {
    try {
      const response = await this.databases.createDocument(
        DATABASE_ID,
        collectionId,
        documentId,
        data,
        permissions
      );
      return { data: response as T & { $id: string }, error: null };
    } catch (error: any) {
      console.error(`Error creating document in ${collectionId}:`, error);
      return { data: null, error: error.message || 'Failed to create document' };
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument<T>(collectionId: CollectionId, documentId: string) {
    try {
      const response = await this.databases.getDocument(
        DATABASE_ID,
        collectionId,
        documentId
      );
      return { data: response as T & { $id: string }, error: null };
    } catch (error: any) {
      console.error(`Error getting document from ${collectionId}:`, error);
      return { data: null, error: error.message || 'Document not found' };
    }
  }

  /**
   * Update a document
   */
  async updateDocument<T>(
    collectionId: CollectionId,
    documentId: string,
    data: Partial<T>,
    permissions?: string[]
  ) {
    try {
      const response = await this.databases.updateDocument(
        DATABASE_ID,
        collectionId,
        documentId,
        data,
        permissions
      );
      return { data: response as T & { $id: string }, error: null };
    } catch (error: any) {
      console.error(`Error updating document in ${collectionId}:`, error);
      return { data: null, error: error.message || 'Failed to update document' };
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(collectionId: CollectionId, documentId: string) {
    try {
      await this.databases.deleteDocument(DATABASE_ID, collectionId, documentId);
      return { success: true, error: null };
    } catch (error: any) {
      console.error(`Error deleting document from ${collectionId}:`, error);
      return { success: false, error: error.message || 'Failed to delete document' };
    }
  }

  /**
   * List documents with queries
   */
  async listDocuments<T>(
    collectionId: CollectionId,
    queries: string[] = [],
    limit?: number
  ) {
    try {
      const response = await this.databases.listDocuments(
        DATABASE_ID,
        collectionId,
        queries
      );
      return {
        data: response.documents as (T & { $id: string })[],
        total: response.total,
        error: null,
      };
    } catch (error: any) {
      console.error(`Error listing documents from ${collectionId}:`, error);
      return { data: [], total: 0, error: error.message || 'Failed to list documents' };
    }
  }

  /**
   * Query helper: Equal
   */
  equal(attribute: string, value: any) {
    return Query.equal(attribute, value);
  }

  /**
   * Query helper: Not Equal
   */
  notEqual(attribute: string, value: any) {
    return Query.notEqual(attribute, value);
  }

  /**
   * Query helper: Greater Than
   */
  greaterThan(attribute: string, value: number) {
    return Query.greaterThan(attribute, value);
  }

  /**
   * Query helper: Less Than
   */
  lessThan(attribute: string, value: number) {
    return Query.lessThan(attribute, value);
  }

  /**
   * Query helper: Order Descending
   */
  orderDesc(attribute: string) {
    return Query.orderDesc(attribute);
  }

  /**
   * Query helper: Order Ascending
   */
  orderAsc(attribute: string) {
    return Query.orderAsc(attribute);
  }

  /**
   * Query helper: Limit
   */
  limit(value: number) {
    return Query.limit(value);
  }

  /**
   * Query helper: Offset
   */
  offset(value: number) {
    return Query.offset(value);
  }

  /**
   * Permission helper: User-specific read/write
   */
  userPermissions(userId: string) {
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];
  }

  /**
   * Permission helper: Public read, user write
   */
  publicReadUserWrite(userId: string) {
    return [
      Permission.read(Role.any()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];
  }

  /**
   * Permission helper: Users only (authenticated)
   */
  usersOnly() {
    return [
      Permission.read(Role.users()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
    ];
  }
}

// Export singleton instance
export const appwriteDb = new AppwriteDatabaseService();

