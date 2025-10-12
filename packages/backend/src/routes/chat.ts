/**
 * Chat Routes
 * Handles chat message and presence operations
 */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { criticalAuthMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { ChatService } from '../services/chat-service';
import { UserService } from '../services/user-service';

export const chatRoutes = new Hono();

// Validation schemas
const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(500, 'Message too long'),
});

const deleteMessageSchema = z.object({
  messageId: z.string().min(1, 'Message ID required'),
});

// 🔐 SECURITY: All chat routes require critical authentication with session validation
// This prevents impersonation and ensures chat messages are from authenticated users
chatRoutes.use('*', criticalAuthMiddleware);

// Send a chat message
chatRoutes.post('/messages', asyncHandler(async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { content } = sendMessageSchema.parse(body);

  try {
    const profile = await UserService.getUserProfile(user.id);
    if (!profile) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    const result = await ChatService.sendMessage(
      user.id,
      profile.username,
      content
    );

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Failed to send message' });
    }

    return c.json({
      message: 'Message sent successfully',
      chat_message: result.message,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Send message error:', error);
    throw new HTTPException(500, { message: 'Failed to send message' });
  }
}));

// Get recent chat messages
chatRoutes.get('/messages', asyncHandler(async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const before = c.req.query('before'); // ISO datetime string

  try {
    const result = await ChatService.getMessages(limit, before);

    if (!result.success) {
      throw new HTTPException(500, { message: result.error || 'Failed to fetch messages' });
    }

    return c.json({
      messages: result.messages,
      total: result.total,
      has_more: result.messages!.length === limit,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get messages error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch messages' });
  }
}));

// Delete a message (moderator or message owner)
chatRoutes.delete('/messages/:messageId', asyncHandler(async (c) => {
  const user = c.get('user');
  const messageId = c.req.param('messageId');

  try {
    const profile = await UserService.getUserProfile(user.id);
    if (!profile) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    const result = await ChatService.deleteMessage(
      messageId,
      user.id,
      profile.isModerator
    );

    if (!result.success) {
      throw new HTTPException(400, { message: result.error || 'Failed to delete message' });
    }

    return c.json({
      message: 'Message deleted successfully',
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Delete message error:', error);
    throw new HTTPException(500, { message: 'Failed to delete message' });
  }
}));

// Update presence (ping to stay online)
chatRoutes.post('/presence', asyncHandler(async (c) => {
  const user = c.get('user');

  try {
    const profile = await UserService.getUserProfile(user.id);
    if (!profile) {
      throw new HTTPException(404, { message: 'User profile not found' });
    }

    const result = await ChatService.updatePresence(user.id, profile.username, true);

    if (!result.success) {
      throw new HTTPException(500, { message: result.error || 'Failed to update presence' });
    }

    return c.json({
      message: 'Presence updated',
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Update presence error:', error);
    throw new HTTPException(500, { message: 'Failed to update presence' });
  }
}));

// Get online users
chatRoutes.get('/online', asyncHandler(async (c) => {
  try {
    const result = await ChatService.getOnlineUsers();

    if (!result.success) {
      throw new HTTPException(500, { message: result.error || 'Failed to fetch online users' });
    }

    return c.json({
      online_users: result.users,
      count: result.users!.length,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Get online users error:', error);
    throw new HTTPException(500, { message: 'Failed to fetch online users' });
  }
}));

// Cleanup stale presence (admin/cron endpoint)
chatRoutes.post('/presence/cleanup', asyncHandler(async (c) => {
  const user = c.get('user');

  try {
    const profile = await UserService.getUserProfile(user.id);
    if (!profile || !profile.isModerator) {
      throw new HTTPException(403, { message: 'Moderator access required' });
    }

    const result = await ChatService.cleanupStalePresence();

    return c.json({
      message: 'Presence cleanup completed',
      cleaned: result.cleaned,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Cleanup presence error:', error);
    throw new HTTPException(500, { message: 'Failed to cleanup presence' });
  }
}));

