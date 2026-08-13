# Tarkov Casino Documentation

**Version:** 0.1

Welcome to the Tarkov Casino project documentation. This is the main developer guide covering architecture, setup, development, testing, and deployment.

---

## Architecture

Monorepo (Bun workspaces) with two packages:

| Package | Stack |
|---|---|
| `packages/frontend/` | React 19, TypeScript, Tailwind CSS 4, Bun native bundler |
| `packages/backend/` | Hono + TypeScript, Appwrite BaaS, optional Redis cache |

The backend serves the built frontend via `serveStatic`. There is no separate frontend dev server — frontend `dev` delegates to the backend.

**Ports:** backend on `3000`, frontend dev proxy on `5173` (Playwright E2E only).

### Technology Stack

**Backend**
- Runtime: Bun
- Framework: Hono 4.9+
- Database: Appwrite 18.0+ (BaaS)
- Cache: Dragonfly (Redis-compatible, optional)
- Language: TypeScript 5.9+
- Real-time: Appwrite Realtime (WebSocket)

**Frontend**
- Framework: React 19.1+
- Build Tool: Bun native bundler
- Styling: Tailwind CSS 4.1+
- Routing: React Router 7.9+
- State: TanStack Query 5.89+
- Animations: Framer Motion 12.23+
- Language: TypeScript 5.9+

**Testing**
- Runner: Vitest v4.1.10
- React Testing: @testing-library/react 16.3+
- DOM Environment: jsdom
- E2E: Playwright

**DevOps**
- Containerization: Docker
- Deployment: Coolify v4
- CI/CD: GitHub Actions

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (latest)
- [Docker](https://docker.com/) (optional, for local Dragonfly cache)

### Installation

```bash
git clone <repository-url>
cd tarkov-casino
bun install
```

### Environment Setup

Copy `.env.example` to `.env`. The `.env.example` still lists Supabase vars but those are deprecated — the app uses Appwrite.

**Required for production:**
```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
NODE_ENV=production
```

**Optional** (defaults in `packages/backend/src/config/env.ts`):
- `REDIS_ENABLED`, `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `STARTING_BALANCE` (default `10000`), `DAILY_BONUS` (default `1000`)
- `JWT_SECRET` (required for tests, min 32 chars)
- `SENTRY_DSN` for error tracking

**Frontend build requires** `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` in `packages/frontend/.env`.

### Development

```bash
bun run dev   # builds frontend in dev mode + starts backend
```

The dev frontend build enables a test login UI. Access at http://localhost:3000.

To create a test account:
```bash
bun run scripts/create-test-account.ts test@example.com password123 "Test User"
```

Dragonfly is optional for local development — the app falls back to the database if cache is unavailable.

---

## Development Commands

```bash
bun install                          # all dependencies (root)
bun run dev                          # build frontend + start backend dev server
bun run build                        # build both packages

# Backend only
cd packages/backend && bun run dev   # auto-reload server
cd packages/backend && bun run build
cd packages/backend && bunx vitest run

# Frontend only
cd packages/frontend && bun run build
cd packages/frontend && bun run build:dev   # dev build (test login UI, no minification)
cd packages/frontend && bunx vitest run
```

---

## Testing

```bash
bun run test:all                      # run both workspace suites (vitest)

# Backend subsets
cd packages/backend && bun run test:api          # route tests
cd packages/backend && bun run test:game-engine  # game engine tests
cd packages/backend && bun run test:fairness     # provably fair tests

# Frontend subsets
cd packages/frontend && bun run test:components
cd packages/frontend && bun run test:hooks

# E2E
npx playwright test                   # Playwright E2E (e2e/ directory)
```

The test framework is **Vitest v4** (migrated from `bun:test`). Backend runs in `node` env, frontend in `jsdom` with React Testing Library. See [Testing Strategy](./testing/testing.md) for full details.

**Known issues:**
- `bun run test:coverage` is currently broken: `@vitest/coverage-v8` needs Node's inspector API, which the Bun runtime does not support. Run vitest under Node or switch to `@vitest/coverage-istanbul`.

---

## Deployment

```bash
bun run deploy:prepare      # build + test Docker image
bun run deploy:validate     # validate production config
bun run docker:build        # build Docker image
bun run docker:test         # test Docker image
```

**Coolify:** Docker build pack, `Dockerfile` at root, port `3000`. See `coolify.json` for full config.

---

## Health Checks

```bash
bun run health:check              # localhost
bun run health:check:prod         # production URL
```

Endpoints: `/api/health`, `/api/health/detailed`, `/api/ready`, `/api/live`, `/api/metrics`

---

## Useful Scripts

```bash
bun run scripts/create-test-account.ts <email> <password> <name>
bun run scripts/setup-indexes.ts
bun run scripts/setup-chat-system.ts
bun run analyze                   # bundle analysis
bun run benchmark                 # performance benchmark
```

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs backend tests, frontend tests, E2E, security scans (Trivy), SonarCloud, and Docker build/deploy on `main`.

---

## Key Conventions

- Bun native bundler — no Vite, no webpack
- `bunfig.toml` at root controls install/runtime settings only; testing is handled by Vitest configs per package
- `tsconfig.json` at root, workspace packages extend it
- Redis cache is optional; app falls back to DB if unavailable
- Root `lint` script references ESLint but no ESLint config exists — linting is not currently enforced
- Backend build uses bytecode compilation (`--bytecode`) and minification in production
- Frontend build drops `console`/`debugger` in production builds

---

## Documentation Index

### Backend
- [Appwrite Integration](./backend/appwrite-README.md) — Appwrite setup and usage
- [Database Operations](./backend/database-README.md) — schema, queries, Appwrite TablesDB
- [Appwrite Realtime](./backend/appwrite-realtime.md) — WebSocket subscriptions and live updates
- [Redis/Dragonfly Caching](./backend/redis-README.md) — high-performance caching layer
- [Statistics System](./backend/statistics-README.md) — game analytics and statistics
- [Game Engine](./backend/game-engine-README.md) — provably fair game logic and architecture
- [Leaderboard System](./backend/leaderboard-README.md) — Redis-powered player rankings
- [Achievements System](./backend/achievements-README.md) — milestones and rewards
- [Chat System](./backend/chat-README.md) — real-time messaging and presence
- [Sentry Error Tracking](./backend/sentry-README.md) — production error monitoring
- [Security](./backend/security.md) — auth, balance integrity, atomic operations

### Frontend
- [Frontend Architecture](./frontend/README.md) — React app structure and components

### API
- [API Reference](./api/README.md) — complete API endpoint documentation

### Deployment & Operations
- [Deployment Guide](./deployment/deployment.md) — production deployment with Coolify
- [Maintenance Procedures](./maintenance/README.md) — routine maintenance and troubleshooting

### Testing
- [Testing Strategy](./testing/testing.md) — testing approach and implementation

### Game Rules
- [Wheel of Chance](./game-rules/wheel-of-chance.md) — provably fair wheel spinner
- [Blackjack](./game-rules/blackjack.md) — strategic card game
- [Case Opening](./game-rules/case-opening.md) — Tarkov-themed case opening

### AI Configuration
- [AI Tools](./ai/README.md) — unified AI tools configuration

---

## Notes

### Supabase Migration
This project migrated from Supabase to Appwrite. Old Supabase migration files (`packages/backend/src/database/migrations/*.sql`) are kept for reference only and should not be used for new development.

**All new development must use Appwrite:**
- Use Appwrite SDK for all database operations
- Use Appwrite Auth for authentication
- Use Appwrite Realtime for live updates
- Do not add new Supabase dependencies
- Do not use PostgreSQL directly

---

**Last Updated:** 08/12/2026
**Documentation Version:** 0.1
