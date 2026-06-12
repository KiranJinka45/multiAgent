FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY . .
RUN npx turbo prune @apps/gateway --docker --out-dir=out
# Ensure root config files are in the out directory if missing
COPY turbo.json tsconfig.base.json tsup.config.base.ts ./out/full/

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
# Root config files are already available in full context if built from root

# Generate Prisma Client (Crucial for @packages/db resolution)
# With our new schema config, this will output to packages/db/src/generated/client
# Generate Prisma client using the monorepo's installer context
RUN pnpm --filter=@packages/db exec prisma generate

# Build the app and its workspace dependencies
RUN find . -name "tsconfig.tsbuildinfo" -exec rm -f {} +
RUN pnpm turbo build --filter=@apps/gateway...

# Standardized build and deployment pattern
RUN pnpm --filter=@apps/gateway deploy --legacy --prod --ignore-scripts /app/deploy
RUN cp -r apps/gateway/dist /app/deploy/dist

# ── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 runner
USER 1001

# Copy deployment artifact from installer
COPY --from=installer --chown=runner:nodejs /app/deploy .

ENV NODE_ENV=production
ENV PORT=3501
EXPOSE 3501

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3501/health || exit 1

# Standardized entrypoint (Flattened structure)
CMD ["node", "dist/index.js"]
