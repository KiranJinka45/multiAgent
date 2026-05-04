# -------- BUILD STAGE --------
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy monorepo configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc turbo.json tsconfig*.json tsup.config.base.ts ./
COPY packages/ ./packages/
COPY apps/auth-service/ ./apps/auth-service/

# Install dependencies (including workspace packages)
RUN pnpm install --frozen-lockfile

# Build everything (turbo handles dependencies)
RUN pnpm turbo build --filter=@apps/auth-service...

# Deploy the app to a separate directory for production
# This isolates the app and its dependencies (including workspace symlinks)
RUN pnpm --filter=@apps/auth-service deploy /prod/auth-service

# -------- RUNTIME STAGE --------
FROM node:20-alpine AS runner
WORKDIR /app

# Ensure non-root usage
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER runner

# Copy the deployed app from the builder
COPY --from=builder --chown=runner:nodejs /prod/auth-service .

ENV NODE_ENV=production
ENV PORT=4002

CMD ["node", "dist/index.js"]
