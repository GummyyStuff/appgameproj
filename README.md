# Tarkov Casino

A Tarkov-themed casino gaming website offering classic casino games with virtual currency for entertainment purposes only.

## Features

- **Roulette**: Classic casino roulette with Tarkov theming
- **Blackjack**: Strategic card gameplay
- **Case Opening**: Tarkov-themed loot cases with provably fair algorithms
- **Virtual Currency**: Safe gaming with no real money risk
- **Tarkov Theming**: Immersive design with game assets and aesthetics
- **Real-time Statistics**: Comprehensive game analytics and history
- **Provably Fair Gaming**: Cryptographically secure random number generation
- **High-Performance Caching**: Dragonfly (25x faster than Redis) for sub-millisecond response times

## Architecture

This is a monorepo containing:

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Bun Bundler
- **Backend**: Bun + Hono + TypeScript
- **Database**: Appwrite (BaaS) - Authentication, Databases, Storage, Realtime
- **Cache**: Dragonfly (Redis-compatible) for high-performance caching
- **Real-time**: Appwrite Realtime via WebSocket
- **Testing**: Bun Test with comprehensive test suites
- **Deployment**: Docker + Coolify

## Project Structure

```
tarkov-casino/
├── packages/
│   ├── frontend/          # React frontend application
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   └── backend/           # Bun + Hono backend API
│       ├── src/
│       │   ├── services/  # Redis, cache, game logic
│       │   ├── routes/    # API endpoints
│       │   ├── middleware/# Auth, validation, rate limiting
│       │   └── config/    # Environment, Appwrite setup
│       └── package.json
├── docs/                  # Comprehensive documentation
│   ├── backend/           # Backend guides
│   ├── frontend/          # Frontend architecture
│   ├── api/               # API documentation
│   ├── deployment/        # Deployment guides
│   ├── game-rules/        # Game mechanics
│   └── testing/           # Testing strategy
├── Dockerfile
└── README.md
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Docker](https://docker.com/) (optional, for local Dragonfly cache)

### Installation

```bash
git clone <repository-url>
cd tarkov-casino
bun install
```

### Environment

Copy `.env.example` to `.env` and configure your Appwrite credentials.

### Development

```bash
bun run dev   # builds frontend in dev mode + starts backend
```

Access at http://localhost:3000. The dev frontend build enables a test login UI.

Create a test account:
```bash
bun run scripts/create-test-account.ts test@example.com password123 "Test User"
```

Dragonfly is optional for local development — the app falls back to the database if cache is unavailable.

### Building for Production

```bash
bun run build   # builds both frontend and backend
```

## Docker Deployment

```bash
docker build -t tarkov-casino .
docker run -p 3000:3000 tarkov-casino
```

For production deployment with Coolify, see the [Deployment Guide](./docs/deployment/deployment.md).

## Documentation

Comprehensive documentation is available in the [docs/](./docs/README.md) directory:

- [Developer Guide](./docs/README.md) — architecture, setup, commands, testing, deployment
- [API Reference](./docs/api/README.md) — all API endpoints
- [Backend Guides](./docs/backend/) — Appwrite, database, caching, statistics
- [Frontend Architecture](./docs/frontend/README.md)
- [Game Rules](./docs/game-rules/) — roulette, blackjack, case opening
- [Deployment](./docs/deployment/deployment.md)
- [Testing](./docs/testing/testing.md)

## Security

- Appwrite Authentication with secure user sessions
- Role-based Access Control via Appwrite permissions
- Zod schema validation on all endpoints
- Rate limiting powered by Dragonfly cache
- Cryptographically secure RNG with provably fair verification
- Complete transaction audit logging

## Performance

- Dragonfly in-memory cache (25x faster than Redis)
- Bun runtime for fast JavaScript/TypeScript execution
- Automatic pipelining and connection pooling
- Graceful degradation to database if cache unavailable
- Sub-millisecond typical cache response time

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is for educational and entertainment purposes only. No real money gambling is involved.

## Roadmap

- [x] Roulette game implementation
- [x] Blackjack game implementation
- [x] Case opening game with fairness algorithms
- [x] Comprehensive statistics and analytics
- [x] Real-time features via Appwrite Realtime
- [x] Performance monitoring and health checks
- [ ] Mobile app development
- [ ] Additional casino games
- [ ] Tournament system
- [ ] Advanced leaderboards
- [ ] Social features and chat
