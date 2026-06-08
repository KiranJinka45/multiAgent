# -------- BUILD STAGE --------
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy monorepo configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc turbo.json tsconfig*.json tsup.config.base.ts ./
COPY scripts/ ./scripts/
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build worker
RUN pnpm turbo build --filter=@apps/worker...

# Deploy the app to a separate directory
RUN pnpm --filter=@apps/worker deploy --legacy /prod/worker
RUN cp -r node_modules/.prisma /prod/worker/node_modules/

# -------- RUNTIME STAGE --------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Ensure non-root usage
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER 1001

# Copy the deployed app
COPY --from=builder --chown=runner:nodejs /prod/worker .

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
