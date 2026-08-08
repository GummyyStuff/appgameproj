---
title: "Database Operations"
audience: developer
layer: backend
status: stable
tags: [database, appwrite, tablesdb, queries, operations]
last_updated: 08/07/2026
---

# Database Operations

## Purpose and Context
This document describes the database implementation using Appwrite TablesDB. All database operations are performed through the Appwrite SDK following the migration from PostgreSQL to Appwrite.

## Architecture Overview
The database architecture includes:
- Appwrite TablesDB for structured data storage
- Row-level permissions through Appwrite security model
- Atomic operations with Appwrite transactions
- Query building using Appwrite Query builder
- Data validation through Zod schemas

## Technical Details
Key implementation aspects:
- CRUD operations using Appwrite SDK
- Query filtering and sorting capabilities
- Bulk operations and batch processing
- Transaction handling for atomic operations
- Performance optimization techniques

## Requirements and Dependencies
- Appwrite 18.0+ TablesDB support
- TypeScript 5.9+
- Zod for schema validation
- Bun runtime for performance

## Implementation Code Examples
```typescript
import { Databases } from 'appwrite';

const databases = new Databases(client);
const databaseId = 'tarkov_casino';
const collectionId = 'user_profiles';

// Create document
const result = await databases.createDocument(
  databaseId,
  collectionId,
  {
    name: 'John Doe',
    email: 'john@example.com'
  }
);

// Query documents
const queryResult = await databases.listDocuments(
  databaseId,
  collectionId,
  [
    Query.equal('email', 'john@example.com')
  ]
);
```

## Best Practices and Guidelines
- Use Appwrite's permission system for data security
- Implement proper error handling for database operations
- Leverage Appwrite's query builder for complex filtering
- Use transactions for atomic operations
- Implement caching strategies where appropriate

## Related Components
- [Appwrite Integration Guide](./appwrite-README.md)
- [Authentication Flow](../frontend/README.md#authentication)
- [Performance Optimization](../backend/redis-README.md)

## Version History
- v0.1: Initial implementation following migration to Appwrite