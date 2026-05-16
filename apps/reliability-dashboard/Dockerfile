# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy monorepo config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc turbo.json tsconfig*.json ./
COPY packages ./packages
COPY apps/reliability-dashboard ./apps/reliability-dashboard

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Vite app
RUN pnpm --filter @apps/reliability-dashboard build

# Stage 2: Runner
FROM nginx:alpine AS runner
# The dist path for Vite apps usually is ./dist
COPY --from=builder /app/apps/reliability-dashboard/dist /usr/share/nginx/html
COPY apps/reliability-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
