FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY . .
RUN npx turbo prune @apps/api --docker --out-dir=out

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

# Generate Prisma Client (Crucial for @packages/db resolution)
# With our new schema config, this will output to packages/db/src/generated/client
RUN pnpm prisma generate --schema=packages/db/prisma/schema.prisma

# Build the app and its workspace dependencies
RUN pnpm turbo build --filter=@apps/api...

# Standardized build and deployment pattern
RUN pnpm --filter=@apps/api deploy --legacy --prod /app/deploy
RUN cp -r apps/api/dist /app/deploy/dist

# ── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER runner

# Copy deployment artifact from installer
COPY --from=installer --chown=runner:nodejs /app/deploy .

ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Standardized entrypoint (Flattened structure)
CMD ["node", "dist/index.js"]
