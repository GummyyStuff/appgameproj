# Tarkov Casino - production Dockerfile (Coolify / Docker Compose)
#
# Stages:
#   1. build     - install all workspace deps, build frontend + backend
#   2. prod-deps - install production deps only
#   3. runtime   - slim image with backend dist + frontend dist + prod deps
#
# Backend serves the SPA from packages/frontend/dist (resolved relative to
# packages/backend/dist at runtime), so the frontend dist must keep that path.

FROM oven/bun:1.3.14 AS build
WORKDIR /app

# Install workspace dependencies (dev + prod) for building
COPY package.json bun.lock tsconfig.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN bun install --frozen-lockfile

# Build frontend (build.ts inlines these env vars at build time)
ARG VITE_APPWRITE_ENDPOINT
ARG VITE_APPWRITE_PROJECT_ID
ARG VITE_APPWRITE_DATABASE_ID
ARG VITE_API_URL
ARG VITE_SENTRY_DSN
ARG VITE_APP_VERSION
ENV VITE_APPWRITE_ENDPOINT=$VITE_APPWRITE_ENDPOINT \
    VITE_APPWRITE_PROJECT_ID=$VITE_APPWRITE_PROJECT_ID \
    VITE_APPWRITE_DATABASE_ID=$VITE_APPWRITE_DATABASE_ID \
    VITE_API_URL=$VITE_API_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    NODE_ENV=production

COPY packages/frontend/ ./packages/frontend/
RUN cd packages/frontend && bun run build.ts

# Build backend (bytecode-compiled, externals resolved from node_modules)
COPY packages/backend/ ./packages/backend/
RUN cd packages/backend && bun run build

# Install production dependencies only (workspaces hoisted to root node_modules)
FROM oven/bun:1.3.14 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN bun install --frozen-lockfile --production

# Runtime image
FROM oven/bun:1.3.14-slim
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY packages/backend/package.json ./packages/backend/
# Frontend dist must sit at packages/frontend/dist (see index.ts serveStatic root)
COPY --from=build /app/packages/frontend/dist ./packages/frontend/dist

ENV NODE_ENV=production BUN_ENV=production

USER bun
EXPOSE 3000

# Health check via Bun (no curl/wget needed in the image)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD ["bun", "-e", "const port = process.env.PORT ?? '3000'; const ok = await fetch(`http://localhost:${port}/api/health`).then(r => r.ok).catch(() => false); process.exit(ok ? 0 : 1)"]

CMD ["bun", "run", "packages/backend/dist/index.js"]
