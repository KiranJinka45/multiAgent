FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY . .
RUN npx turbo prune @apps/auth-service --docker --out-dir=out



# ── Stage 2: Installer ───────────────────────────────────────────────────────
FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# SRE Hardening: Force hoisted linker via ENV for maximum reliability in Docker
ENV PNPM_CONFIG_NODE_LINKER=hoisted

# First copy the pruned lockfile and json
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Now copy the pruned source
COPY --from=pruner /app/out/full/ .
COPY turbo.json tsconfig*.json tsup.config.base.ts ./

# Generate Prisma client using the monorepo's installer context
RUN pnpm --filter=@packages/db exec prisma generate

# Build the app and its workspace dependencies
RUN pnpm turbo build --filter=@apps/auth-service...

# Deploy production-only package to /app/deploy
RUN pnpm --filter=@apps/auth-service deploy --legacy --prod /app/deploy

# Copy built dist artifacts into the deploy bundle
RUN cp -r /app/apps/auth-service/dist /app/deploy/dist

# ── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

# Hardened security: Non-root execution
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER runner

# Copy ONLY the deployed bundle
COPY --from=installer --chown=runner:nodejs /app/deploy .

ENV NODE_ENV=production
ENV PORT=4005

# Standardized entrypoint (Flattened structure)
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4005/health || exit 1

CMD ["node", "dist/index.js"]

