# ============================================================
# Multi-stage Dockerfile for MultiAgent Platform
# Supports separate entrypoints: web, gateway, worker
# ============================================================

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/orchestrator/package.json ./apps/orchestrator/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/auth-service/package.json ./apps/auth-service/package.json
COPY apps/billing-service/package.json ./apps/billing-service/package.json
COPY apps/core-api/package.json ./apps/core-api/package.json
COPY apps/deploy-service/package.json ./apps/deploy-service/package.json

# Copy all package manifests (wildcard for packages/*)
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile --prod=false

# ---- Stage 2: Builder ----
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/*/node_modules ./apps/
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY . .

# Build the entire monorepo
RUN pnpm build

# ---- Stage 3: Production Runtime ----
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache curl dumb-init

WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production

# Health check defaults (overridden per service in compose/k8s)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4000}/health || exit 1

# Use dumb-init for proper PID 1 signal forwarding
ENTRYPOINT ["dumb-init", "--"]

# Default: gateway (overridden in docker-compose per service)
EXPOSE 4000
CMD ["node", "apps/gateway/dist/index.js"]
