# Tarkov Casino Frontend

A React-based frontend application for the Tarkov Casino gaming platform, featuring Escape from Tarkov theming and classic casino games.

## Features

- **React 19** with TypeScript for type safety
- **Vite 7** for ultra-fast development and building
- **Tailwind CSS 4** with custom Tarkov theme colors
- **React Router 7** for client-side routing
- **Appwrite Client SDK** for authentication and database
- **TanStack Query** (React Query) for API state management
- **Framer Motion** for smooth animations
- **Responsive design** for desktop and mobile
- **Appwrite Realtime** for WebSocket-based live updates

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 18+ (for frontend tooling)

### Installation

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Update .env with your Supabase credentials
```

### Development

```bash
# Start development server
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Preview production build
bun run preview
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── layout/         # Layout components (Navigation, etc.)
│   ├── providers/      # Context providers
│   └── ui/             # Generic UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries (Supabase, etc.)
├── pages/              # Page components
├── router/             # Routing configuration
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id

# Backend API (optional, for custom endpoints)
VITE_API_URL=http://localhost:3000/api
```

## Available Routes

- `/` - Home page with game overview
- `/login` - User login
- `/register` - User registration  
- `/roulette` - Roulette game (protected)
- `/blackjack` - Blackjack game (protected)
- `/cases` - Case opening game (protected)
- `/history` - Game history and statistics (protected)
- `/profile` - User profile and settings (protected)

## Theming

The application uses a custom Tarkov-inspired color palette:

- **Primary**: Dark grays and blacks
- **Accent**: Orange (#F6AD55) 
- **Success**: Green (#38A169)
- **Danger**: Red (#E53E3E)
- **Warning**: Yellow (#D69E2E)

## Authentication

Authentication is handled via Appwrite Auth SDK with the following features:

- **Email/Password Auth**: Standard email and password registration/login
- **Session Management**: Automatic session handling by Appwrite SDK
- **Protected Routes**: Route guards using React Router loaders
- **User Profile**: Integrated with Appwrite Account service
- **Session Persistence**: Automatic session storage (365 days default)

### Implementation Example

```typescript
// lib/appwrite.ts
import { Client, Account } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);

// Authentication functions
export async function login(email: string, password: string) {
  return await account.createEmailPasswordSession({ email, password });
}

export async function register(email: string, password: string, name: string) {
  const user = await account.create({
    userId: ID.unique(),
    email,
    password,
    name
  });
  
  // Auto-login after registration
  await login(email, password);
  return user;
}

export async function logout() {
  return await account.deleteSession('current');
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}
```

## State Management

- **TanStack Query** (React Query) for server state and API caching
- **React Context** for authentication state
- **Appwrite Realtime** for live data synchronization
- **Local component state** for UI interactions

### Realtime State Example

```typescript
import { useEffect, useState } from 'react';
import { client } from '@/lib/appwrite';

function useRealtimeBalance(userId: string) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.tarkov_casino.tables.user_profiles.rows.${userId}`,
      response => {
        if (response.payload.balance !== undefined) {
          setBalance(response.payload.balance);
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return balance;
}
```

## Testing

Tests are written using Bun Test and React Testing Library:

```bash
# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## Building

```bash
# Build for production
bun run build

# The built files will be in the `dist/` directory
```

## Deployment

### Static Hosting (Netlify, Vercel, Cloudflare Pages)

1. Build the application: `bun run build`
2. Upload the `dist/` directory to your hosting service
3. Configure environment variables:
   - `VITE_APPWRITE_ENDPOINT`
   - `VITE_APPWRITE_PROJECT_ID`
4. Configure redirects for client-side routing:
   ```
   /* /index.html 200
   ```

### Appwrite Sites (Recommended)

Appwrite Sites provides integrated hosting:

```bash
# Install Appwrite CLI
npm install -g appwrite

# Deploy to Appwrite Sites
appwrite sites create \
  --name tarkov-casino-frontend \
  --framework react

# Deploy
appwrite sites deploy
```

### Docker Deployment

The project includes a multi-stage Dockerfile that builds and serves the frontend:

```bash
docker build -t tarkov-casino .
docker run -p 3000:3000 tarkov-casino
```

## Key Libraries

- `appwrite` (18.0+) - Appwrite client SDK
- `react` (19.1+) - UI framework
- `react-dom` (19.1+) - React DOM renderer
- `react-router-dom` (7.9+) - Routing
- `@tanstack/react-query` (5.89+) - Server state management
- `framer-motion` (12.23+) - Animations
- `@tailwindcss/vite` (4.1+) - Tailwind CSS
- `recharts` (3.2+) - Charts and graphs

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new components and features
3. Update documentation as needed
4. Ensure all tests pass before submitting changes