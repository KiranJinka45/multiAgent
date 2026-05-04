FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY . .
RUN npx turbo prune @apps/auth-service --docker --out-dir=out

FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
ENV PNPM_CONFIG_NODE_LINKER=hoisted
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
COPY turbo.json tsconfig*.json tsup.config.base.ts ./
RUN pnpm turbo build --filter=@apps/auth-service...
RUN pnpm --filter=@apps/auth-service deploy --legacy --prod /app/deploy
RUN ls -la /app/deploy/node_modules/@prisma/client
