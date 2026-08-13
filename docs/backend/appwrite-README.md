---
title: "Appwrite Integration Guide"
audience: developer
layer: backend
status: stable
tags: [appwrite, integration, database, authentication]
last_updated: 08/11/2026
---

# Appwrite Integration Guide

## Purpose and Context
This document provides comprehensive guidance on integrating Appwrite as the primary backend service for the Tarkov Casino project. The migration from Supabase to Appwrite was completed as part of the v0.1 release, implementing a modern Backend-as-a-Service solution.

## Architecture Overview
The Appwrite integration follows these core components:
- Authentication via Appwrite Account service
- Database operations through Appwrite TablesDB API
- Real-time features using Appwrite Realtime channels
- File storage via Appwrite Storage service
- Security through Appwrite permission system

## Technical Details
The implementation leverages:
- Appwrite SDK for all client-server communications
- TypeScript for type safety
- Bun runtime for performance
- Hono framework for API routing
- Appwrite's built-in security and authentication

## Requirements and Dependencies
- Appwrite 18.0+ (client), 17.2+ (server)
- Bun latest version
- TypeScript 5.9+

## Implementation Code Examples
```typescript
import { Client, Account, Databases, Realtime } from 'appwrite';

const client = new Client();
client.setEndpoint('https://[PROJECT_ID].cloud.appwrite.io/v1');
client.setProject('[PROJECT_ID]');
client.setKey('[API_KEY]');

const account = new Account(client);
const databases = new Databases(client);
const realtime = new Realtime(client);
```

## Best Practices and Guidelines
- Use Appwrite's built-in authentication for all user sessions
- Implement proper permission checks on database operations
- Leverage Appwrite Realtime for real-time features
- Utilize Appwrite Storage for file operations
- Follow Appwrite's security guidelines for sensitive data

## User Profile Design Decision

### Document ID as User Identifier
The `users` collection uses the Appwrite Auth user ID as the document ID (`$id`). This eliminates the need for a separate `userId` attribute on user profiles.

**How it works:**
- When a profile is created, `createDocument` receives the Appwrite user ID as the `documentId` parameter
- Lookups use `getDocument(collectionId, userId)` for O(1) access instead of `listDocuments` with `Query.equal('userId', ...)`
- The `UserProfile` TypeScript interface omits `userId` since `$id` serves that role

**Why this approach:**
- Avoids storing the same identifier twice per row
- Removes the need for an index on a redundant `userId` column
- Simplifies profile lookups to a single direct fetch
- Appwrite supports custom document IDs up to 36 characters (Auth user IDs fit within this limit)

**Foreign key references in other collections:**
Child collections (`game_history`, `daily_bonuses`, `chat_messages`, `audit_logs`, `user_achievements`) still store `userId` as a regular attribute. This is correct — those are one-to-many relationships where `userId` acts as a foreign key pointing to `UserProfile.$id`.

## Related Components
- [Appwrite Realtime Documentation](./appwrite-realtime.md)
- [Database Operations](./database-README.md)
- [Developer Guide](../README.md)

## Version History
- v0.1: Initial implementation following Supabase to Appwrite migration