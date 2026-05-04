# syntax=docker/dockerfile:1
# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Check if libc6-compat is needed for alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root configuration files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc turbo.json tsconfig*.json tsup.config.base.ts ./
COPY packages ./packages
COPY apps ./apps

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Build the whole workspace
RUN pnpm build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Ensure non-root usage
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER runner

# Copy necessary files from builder
COPY --from=builder --chown=runner:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=runner:nodejs /app/packages ./packages
COPY --from=builder --chown=runner:nodejs /app/apps ./apps
COPY --from=builder --chown=runner:nodejs /app/package.json ./package.json

EXPOSE 3001
EXPOSE 8080

# The CMD should be overridden by docker-compose or ECS
CMD ["node", "apps/api/dist/index.js"]
