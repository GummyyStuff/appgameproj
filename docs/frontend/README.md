# Tarkov Casino Frontend

A React-based frontend application for the Tarkov Casino gaming platform, featuring Escape from Tarkov theming and classic casino games.

## Features

- **React 19** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** with custom Tarkov theme colors
- **React Router** for client-side routing
- **Supabase** integration for authentication
- **React Query** for API state management
- **Responsive design** for desktop and mobile
- **Real-time updates** via WebSocket connections

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
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000/api
```

## Available Routes

- `/` - Home page with game overview
- `/login` - User login
- `/register` - User registration  
- `/roulette` - Roulette game (protected)
- `/blackjack` - Blackjack game (protected)

- `/history` - Game history and statistics (protected)

## Theming

The application uses a custom Tarkov-inspired color palette:

- **Primary**: Dark grays and blacks
- **Accent**: Orange (#F6AD55) 
- **Success**: Green (#38A169)
- **Danger**: Red (#E53E3E)
- **Warning**: Yellow (#D69E2E)

## Authentication

Authentication is handled via Supabase Auth with the following features:

- Email/password registration and login
- Session persistence
- Protected routes
- User profile management

## State Management

- **React Query** for server state and API caching
- **React Context** for authentication state
- **Local component state** for UI interactions

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

The application can be deployed to any static hosting service:

1. Build the application: `bun run build`
2. Upload the `dist/` directory to your hosting service
3. Configure environment variables on your hosting platform
4. Ensure your hosting service supports client-side routing

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new components and features
3. Update documentation as needed
4. Ensure all tests pass before submitting changes