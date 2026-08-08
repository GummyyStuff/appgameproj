---
title: "API Reference"
audience: developer
layer: backend
status: stable
tags: [api, endpoints, reference, documentation]
last_updated: 08/07/2026
---

# API Reference

## Purpose and Context
This document provides comprehensive reference documentation for all API endpoints in the Tarkov Casino project. The API follows RESTful principles with JSON responses and proper HTTP status codes.

## Architecture Overview
The API architecture includes:
- Hono framework for routing and middleware
- TypeScript for type safety and validation
- Appwrite authentication and authorization
- Proper error handling and response formatting
- Health check endpoints for monitoring

## Technical Details
Key implementation aspects:
- RESTful endpoint design
- Request/response schema validation
- Authentication and authorization flow
- Error response format standardization
- Rate limiting and security measures

## Requirements and Dependencies
- Hono 4.9+
- Bun runtime
- TypeScript 5.9+
- Appwrite SDK for authentication
- Zod for schema validation

## Implementation Code Examples
```typescript
// Example API endpoint using Hono
app.get('/api/users/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const user = await getUserById(userId);
    return c.json(user, 200);
  } catch (error) {
    return c.json({ error: 'User not found' }, 404);
  }
});
```

## Best Practices and Guidelines
- Use consistent HTTP status codes for responses
- Implement proper request validation
- Follow RESTful conventions for endpoint naming
- Include comprehensive error messages
- Document all endpoints with examples

## Related Components
- [Appwrite Integration Guide](./appwrite-README.md)
- [Authentication Flow](../frontend/README.md#authentication)
- [Health Check Endpoints](../frontend/README.md#health-checks)

## Version History
- v0.1: Initial API documentation following migration to Appwrite