---
title: "Appwrite Integration Guide"
audience: developer
layer: backend
status: stable
tags: [appwrite, integration, database, authentication]
last_updated: 08/07/2026
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
- Node.js 18+

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

## Related Components
- [Appwrite Realtime Documentation](./appwrite-realtime.md)
- [Database Operations](./database-README.md)
- [Authentication Flow](../frontend/README.md#authentication)

## Version History
- v0.1: Initial implementation following Supabase to Appwrite migration