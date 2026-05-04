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
COPY apps/gateway/ ./apps/gateway/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build gateway
RUN pnpm turbo build --filter=@apps/gateway...

# Deploy the app to a separate directory
RUN pnpm --filter=@apps/gateway deploy /prod/gateway

# -------- RUNTIME STAGE --------
FROM node:20-alpine AS runner
WORKDIR /app

# Ensure non-root usage
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER runner

# Copy the deployed app
COPY --from=builder --chown=runner:nodejs /prod/gateway .

ENV NODE_ENV=production
ENV PORT=4080

CMD ["node", "dist/index.js"]
