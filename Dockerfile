# ---------- BASE ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# ---------- DEPENDENCIES ----------
FROM base AS deps
COPY pnpm-lock.yaml ./
COPY package.json ./
RUN pnpm install --frozen-lockfile

# ---------- BUILD ----------
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Prisma Generate (Important Step 4)
RUN pnpm --filter @libs/db prisma generate

RUN pnpm build

# Step 10: Optimize Image Size
RUN pnpm prune --prod

# ---------- RUNTIME ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3000

CMD ["node", "apps/gateway/dist/index.js"]
