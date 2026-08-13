# Tarkov Casino - Developer Guidelines

## Architecture
Monorepo (Bun workspaces) with two packages:
- `packages/frontend/` — React 19, TypeScript, Tailwind CSS 4, Bun bundler (not Vite)
- `packages/backend/` — Hono + TypeScript, Appwrite BaaS, optional Redis cache

The backend serves the built frontend via `serveStatic`. There is no separate frontend dev server — frontend `dev` delegates to the backend.

Ports: backend on `3000`, frontend dev proxy on `5173` (Playwright E2E only).

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
cd packages/frontend && bun run build:dev   # dev build (enables test login UI, no minification)
cd packages/frontend && bunx vitest run
```

**Frontend build requires** `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` in `packages/frontend/.env` or exported as env vars. The build will fail without them.

## Testing
The test framework is **Vitest v4** (migrated from `bun:test`). Backend runs in `node` env, frontend in `jsdom` with React Testing Library. Configs: `packages/backend/vitest.config.ts`, `packages/frontend/vitest.config.ts`. Setup files: `packages/backend/src/test-utils/setup.ts`, `packages/frontend/src/test-utils/test-setup.ts`.

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

**Known issues:**
- `bun run test:coverage` is currently broken: `@vitest/coverage-v8` needs Node's inspector API, which the Bun runtime does not support ("Coverage APIs are not supported"). Run vitest under Node or switch to `@vitest/coverage-istanbul`. Coverage thresholds (backend 75%, frontend 80%) are configured but unverified.

## Environment
Copy `.env.example` to `.env`. The `.env.example` still lists Supabase vars but those are deprecated — the app uses Appwrite.

Required for production (set via Coolify env vars or `.env`):
```env
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
NODE_ENV=production
```

Optional (defaults in `packages/backend/src/config/env.ts`):
- `REDIS_ENABLED`, `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `STARTING_BALANCE` (default `10000`), `DAILY_BONUS` (default `1000`)
- `JWT_SECRET` (required for tests, min 32 chars)
- `SENTRY_DSN` for error tracking

Supabase vars (`SUPABASE_*`) are deprecated, kept for backward compatibility only.

## Deployment
```bash
bun run deploy:prepare      # build + test Docker image
bun run deploy:validate     # validate production config
bun run docker:build        # build Docker image
bun run docker:test         # test Docker image
```

**Coolify**: Docker build pack, `Dockerfile` at root, port `3000`. See `coolify.json` for full config.

**Alternative (plain Docker, no Coolify)**: `docker compose up -d --build` using `docker-compose.yml` and the root `.env` (needs the `VITE_*` build vars).

## Health Checks
```bash
bun run health:check              # localhost
bun run health:check:prod         # production URL
```
Endpoints: `/api/health`, `/api/health/detailed`, `/api/ready`, `/api/live`, `/api/metrics`

## Useful Scripts
```bash
bun run scripts/create-test-account.ts <email> <password> <name>
bun run scripts/setup-indexes.ts
bun run scripts/setup-chat-system.ts
bun run analyze                   # bundle analysis
bun run benchmark                 # performance benchmark
```

## CI/CD
GitHub Actions (`.github/workflows/ci.yml`) runs backend tests, frontend tests, E2E, security scans (Trivy), SonarCloud, and Docker build/deploy on `main`.

## Key Conventions
- Bun native bundler — no Vite, no webpack
- `bunfig.toml` at root controls install/runtime settings only; testing is handled by Vitest configs per package
- `tsconfig.json` at root, workspace packages extend it
- Redis cache is optional; app falls back to DB if unavailable
- Root `lint` script references ESLint but no ESLint config exists — linting is not currently enforced
- Backend build uses bytecode compilation (`--bytecode`) and minification in production
- Frontend build drops `console`/`debugger` in production builds
