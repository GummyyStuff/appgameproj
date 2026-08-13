---
title: "Chat System"
audience: developer
layer: both
status: stable
tags: [chat, real-time, websocket, presence]
last_updated: 08/10/2026
---

# Chat System

## Overview

The chat system provides real-time messaging between authenticated users with presence tracking and message management.

## Backend

### Service

`ChatService` in `packages/backend/src/services/chat-service.ts` handles:
- Message sending/retrieval
- User presence tracking
- Message deletion (owner/moderator)
- Stale presence cleanup

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/messages` | Send a chat message |
| GET | `/api/chat/messages` | Get recent messages |
| DELETE | `/api/chat/messages/:messageId` | Delete a message |
| POST | `/api/chat/presence` | Update online presence |
| GET | `/api/chat/online` | Get online users |
| POST | `/api/chat/presence/cleanup` | Cleanup stale presence (moderator) |

### Authentication

All chat routes use `criticalAuthMiddleware` with session validation to prevent impersonation.

### Security

- Messages limited to 500 characters
- Only message owner or moderators can delete
- Presence cleanup restricted to moderators

### Setup

Chat collections are created via:
```bash
bun run scripts/setup-chat-system.ts
```

## Frontend

### Real-time Integration

The frontend uses Appwrite Realtime WebSocket subscriptions to receive chat messages and presence updates in real-time.

### Components

- Chat message input and display
- Online user indicator
- Presence ping mechanism

## Related

- [Appwrite Realtime](./appwrite-realtime.md)
- [API Reference](../api/README.md)
