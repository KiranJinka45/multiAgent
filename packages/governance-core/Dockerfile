# Minimal multi-stage Docker build for ZTAN Governance Core

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies required by Prisma engine
RUN apk add --no-cache openssl libc6-compat
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json tsup.config.base.ts ./
# Install pnpm
RUN npm install -g pnpm

# Copy workspace packages and script hooks
COPY packages/ ./packages/
COPY scripts/ ./scripts/
COPY apps/ ./apps/

# Install dependencies and build the entire workspace to resolve package dependencies
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @packages/db exec prisma generate --schema=prisma/schema.prisma
RUN pnpm build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app
# We only need the compiled output and prod dependencies
COPY --from=builder /app/packages/governance-core/dist ./dist
COPY --from=builder /app/packages/governance-core/package.json ./

# Environment configuration for the ZTAN node
ENV NODE_ENV=production
ENV ZTAN_DETERMINISTIC_KEYS=false

# Entrypoint for the node daemon
CMD ["node", "./dist/index.js"]
