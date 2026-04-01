# --- MULTI-STAGE DOCKERFILE FOR API-GATEWAY ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install PNPM
RUN npm install -g pnpm

# Copy root configurations
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY packages/ ./packages/

# Install dependencies (only api-gateway and dependencies)
RUN pnpm install --filter @apps/api-gateway...

# Copy source
COPY . .

# Build
RUN pnpm --filter @apps/api-gateway build

# --- PRODUCTION STAGE ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm

# Copy artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=builder /app/apps/api-gateway/package.json ./apps/api-gateway/
COPY --from=builder /app/packages/ ./packages/

EXPOSE 3011

CMD ["node", "apps/api-gateway/dist/main.js"]
