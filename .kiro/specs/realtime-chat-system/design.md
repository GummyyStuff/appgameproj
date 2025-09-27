# Design Document

## Overview

The real-time chat system will be implemented as a sidebar component positioned on the right side of the Tarkov casino website. It will use Supabase's real-time capabilities for instant message delivery and PostgreSQL for message persistence. The system will integrate seamlessly with the existing authentication system and maintain the Tarkov aesthetic throughout the interface.

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Database      │
│   Chat UI       │◄──►│   Realtime      │◄──►│   Messages      │
│                 │    │   Channels      │    │   Users         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Structure
- **ChatSidebar**: Main container component
- **MessageList**: Displays chat messages with scrolling
- **MessageInput**: Input field with send functionality
- **OnlineUsers**: Shows currently connected users
- **ChatMessage**: Individual message component

### Real-time Flow
1. User sends message → Frontend validates → Supabase insert
2. Database trigger → Realtime broadcast → All connected clients
3. Clients receive broadcast → Update UI instantly

## Components and Interfaces

### Database Schema

#### Messages Table
```sql
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Online Users Tracking
```sql
CREATE TABLE public.chat_presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true
);
```

### TypeScript Interfaces

#### ChatMessage Interface
```typescript
interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
}
```

#### OnlineUser Interface
```typescript
interface OnlineUser {
  user_id: string;
  username: string;
  last_seen: string;
  is_online: boolean;
}
```

#### Chat Context
```typescript
interface ChatContextType {
  messages: ChatMessage[];
  onlineUsers: OnlineUser[];
  sendMessage: (content: string) => Promise<void>;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}
```

### React Components

#### ChatSidebar Component
```typescript
interface ChatSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}
```

#### MessageInput Component
```typescript
interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}
```

## Data Models

### Message Flow
1. **Input Validation**: Client-side validation for message length and content
2. **Authentication Check**: Ensure user is logged in before allowing messages
3. **Rate Limiting**: Implement client-side rate limiting (5 messages per 10 seconds)
4. **Database Insert**: Store message in Supabase with user context
5. **Real-time Broadcast**: Automatic broadcast to all connected clients
6. **UI Update**: Immediate UI update for sender, real-time for others

### Presence Management
1. **Connection**: User joins chat → Insert/update presence record
2. **Heartbeat**: Periodic updates to last_seen timestamp
3. **Disconnection**: Remove from online list after 30-second timeout
4. **Cleanup**: Background job to clean stale presence records

## Error Handling

### Connection Errors
- **Network Issues**: Show connection status indicator
- **Authentication Failures**: Redirect to login or show auth prompt
- **Rate Limiting**: Display friendly message about sending too fast
- **Message Failures**: Retry mechanism with exponential backoff

### Validation Errors
- **Empty Messages**: Prevent sending and show validation message
- **Message Too Long**: Character counter with visual feedback
- **Profanity Filter**: Basic client-side filtering with server validation
- **Special Characters**: Sanitize input to prevent XSS

### Fallback Strategies
- **Offline Mode**: Queue messages when disconnected, send when reconnected
- **Message History**: Load last 50 messages on connection
- **Graceful Degradation**: Basic functionality without real-time if WebSocket fails

## Testing Strategy

### Unit Tests
- **Message Validation**: Test input validation logic
- **Rate Limiting**: Verify rate limiting implementation
- **Message Formatting**: Test message display and formatting
- **User Presence**: Test online/offline status tracking

### Integration Tests
- **Supabase Connection**: Test real-time subscription setup
- **Message Persistence**: Verify messages are stored correctly
- **Authentication Integration**: Test with existing auth system
- **Cross-browser Compatibility**: Test WebSocket support

### End-to-End Tests
- **Multi-user Chat**: Test real-time messaging between multiple users
- **Connection Recovery**: Test reconnection after network issues
- **Message History**: Verify message loading and pagination
- **Mobile Responsiveness**: Test chat on mobile devices

### Performance Tests
- **Message Throughput**: Test with high message volume
- **Connection Scaling**: Test with multiple concurrent users
- **Memory Usage**: Monitor for memory leaks in long sessions
- **Database Performance**: Test query performance with large message history

## Security Considerations

### Row Level Security (RLS)
```sql
-- Users can only read messages (public chat)
CREATE POLICY "Users can read all messages" ON chat_messages
  FOR SELECT USING (true);

-- Users can only insert their own messages
CREATE POLICY "Users can insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence
CREATE POLICY "Users can manage own presence" ON chat_presence
  FOR ALL USING (auth.uid() = user_id);
```

### Input Sanitization
- **XSS Prevention**: Sanitize all user input before display
- **SQL Injection**: Use parameterized queries (handled by Supabase)
- **Content Filtering**: Basic profanity filter and spam detection
- **Rate Limiting**: Server-side rate limiting to prevent abuse

### Authentication
- **JWT Validation**: Verify user tokens for all operations
- **Session Management**: Handle token refresh automatically
- **Unauthorized Access**: Block chat access for non-authenticated users
- **User Impersonation**: Verify username matches authenticated user

## Styling and Theming

### Tarkov Theme Integration
- **Color Palette**: Dark military colors (#1a1a1a, #2d2d2d, #4a4a4a)
- **Typography**: Military-style fonts (Roboto Mono, Source Code Pro)
- **Icons**: Military/tactical icons for chat actions
- **Animations**: Subtle fade-in effects for new messages

### Responsive Design
- **Desktop**: Fixed sidebar (300px width) on right side
- **Tablet**: Collapsible sidebar with toggle button
- **Mobile**: Full-screen overlay or bottom sheet
- **Accessibility**: Keyboard navigation and screen reader support

### Visual Elements
- **Message Bubbles**: Distinct styling for own vs others' messages
- **Timestamps**: Relative time display (e.g., "2 minutes ago")
- **Online Indicators**: Green dots for online users
- **Typing Indicators**: Show when users are typing (future enhancement)

## Performance Optimizations

### Message Management
- **Virtual Scrolling**: For large message histories
- **Message Pagination**: Load messages in chunks
- **Memory Management**: Limit in-memory messages to prevent memory leaks
- **Image Optimization**: Lazy loading for any future image support

### Real-time Optimizations
- **Connection Pooling**: Efficient WebSocket connection management
- **Message Batching**: Batch multiple rapid messages
- **Debounced Updates**: Prevent excessive re-renders
- **Selective Updates**: Only update affected UI components

### Caching Strategy
- **Message Cache**: Cache recent messages in localStorage
- **User Cache**: Cache user information to reduce API calls
- **Presence Cache**: Cache online user list with periodic updates
- **Offline Support**: Basic offline message queuing