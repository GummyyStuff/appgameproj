# Requirements Document

## Introduction

This feature adds a real-time public chat system to the Tarkov casino website, allowing users to communicate with each other while playing games. The chat will be positioned on the right side of the interface and use Supabase's real-time capabilities for instant message delivery. This enhances the social aspect of the gaming experience and builds community engagement.

## Requirements

### Requirement 1

**User Story:** As a logged-in user, I want to send messages in a public chat room, so that I can communicate with other players in real-time.

#### Acceptance Criteria

1. WHEN a user types a message and presses enter THEN the system SHALL send the message to all connected users instantly
2. WHEN a user sends a message THEN the system SHALL display the message with the user's username and timestamp
3. IF a user is not logged in THEN the system SHALL disable the chat input and show a login prompt
4. WHEN a user sends a message THEN the system SHALL validate the message is not empty and under 500 characters

### Requirement 2

**User Story:** As a user, I want to see messages from other users in real-time, so that I can follow ongoing conversations.

#### Acceptance Criteria

1. WHEN another user sends a message THEN the system SHALL display it immediately without page refresh
2. WHEN messages are received THEN the system SHALL automatically scroll to show the latest message
3. WHEN the chat loads THEN the system SHALL display the last 50 messages in chronological order
4. WHEN a message is displayed THEN the system SHALL show the sender's username, message content, and timestamp

### Requirement 3

**User Story:** As a user, I want the chat interface to be visually integrated with the Tarkov theme, so that it feels part of the gaming experience.

#### Acceptance Criteria

1. WHEN the chat is displayed THEN the system SHALL use Tarkov-themed styling consistent with the rest of the site
2. WHEN the chat is positioned THEN the system SHALL place it on the right side of the screen without interfering with game interfaces
3. WHEN on mobile devices THEN the system SHALL make the chat collapsible or overlay to preserve game space
4. WHEN messages are displayed THEN the system SHALL use appropriate fonts and colors matching the Tarkov aesthetic

### Requirement 4

**User Story:** As a user, I want basic moderation features to ensure a positive chat experience, so that inappropriate content is filtered.

#### Acceptance Criteria

1. WHEN a user sends a message THEN the system SHALL check for basic profanity and block inappropriate content
2. WHEN a message contains excessive caps THEN the system SHALL convert it to normal case
3. WHEN a user sends messages too quickly THEN the system SHALL implement rate limiting (max 5 messages per 10 seconds)
4. WHEN a message is blocked THEN the system SHALL show the user why their message was not sent

### Requirement 5

**User Story:** As a user, I want to see who is currently online in the chat, so that I know who I'm chatting with.

#### Acceptance Criteria

1. WHEN a user joins the chat THEN the system SHALL show them as online to other users
2. WHEN a user leaves or disconnects THEN the system SHALL remove them from the online list within 30 seconds
3. WHEN the online list is displayed THEN the system SHALL show usernames of currently connected users
4. WHEN there are many online users THEN the system SHALL show a count and scrollable list

### Requirement 6

**User Story:** As a user, I want the chat to persist my connection across page navigation, so that I don't miss messages when switching between games.

#### Acceptance Criteria

1. WHEN a user navigates between pages THEN the system SHALL maintain the chat connection
2. WHEN the connection is lost THEN the system SHALL automatically attempt to reconnect
3. WHEN reconnecting THEN the system SHALL sync any missed messages
4. WHEN the user closes the browser THEN the system SHALL properly disconnect from the chat