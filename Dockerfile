# Multi-stage Dockerfile optimized for Coolify deployment
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN bun install --frozen-lockfile

# Build frontend stage
FROM base AS frontend-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Cache buster - change this to force rebuild: v1.1
COPY packages/frontend/ ./packages/frontend/
WORKDIR /app/packages/frontend

# Download and extract FontAwesome Pro from bucket
USER root
RUN apt-get update && apt-get install -y curl unzip && \
    echo "📦 Downloading FontAwesome Pro from bucket..." && \
    curl -L -o /tmp/fontawesome.zip "https://db.juanis.cool/v1/storage/buckets/fa5/files/68e81874001eb53ee4e9/download?project=tarkovcas" && \
    echo "📂 Extracting FontAwesome Pro..." && \
    unzip -q /tmp/fontawesome.zip -d /tmp/ && \
    mv /tmp/fontawesome-pro-5.15.4-web ./public/fa-v5-pro && \
    echo "✅ FontAwesome Pro installed successfully" && \
    rm /tmp/fontawesome.zip && \
    apt-get remove -y unzip && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*
USER bun

# Set build-time environment variables for Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG VITE_APPWRITE_ENDPOINT
ARG VITE_APPWRITE_PROJECT_ID
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APPWRITE_ENDPOINT=${VITE_APPWRITE_ENDPOINT}
ENV VITE_APPWRITE_PROJECT_ID=${VITE_APPWRITE_PROJECT_ID}

RUN bun run build

# Build backend stage
FROM base AS backend-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/backend/ ./packages/backend/
COPY package.json tsconfig.json ./
WORKDIR /app/packages/backend
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

# Install curl for health checks
USER root
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy built backend
COPY --from=backend-build /app/packages/backend/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY packages/backend/package.json ./

# Copy built frontend (served by backend)
COPY --from=frontend-build /app/packages/frontend/dist ./public

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs bunjs
RUN chown -R bunjs:nodejs /app
USER bunjs

# Expose port
EXPOSE 3000

# Enhanced health check for Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application with proper signal handling
CMD ["bun", "run", "dist/index.js"]