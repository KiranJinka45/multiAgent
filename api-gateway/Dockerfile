# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy root configurations
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
# Copy workspace packages
COPY packages ./packages
COPY apps ./apps
# Copy the legacy api-gateway if it exists in the root
COPY api-gateway ./api-gateway

# Install dependencies for the whole workspace
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build everything
RUN pnpm build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER runner

# Copy necessary files from builder
# Note: For production, consider using 'pnpm deploy' for smaller images
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api-gateway ./

# Environment
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:4000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]
