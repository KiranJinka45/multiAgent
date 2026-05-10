# ZTAN Validation Runtime
FROM node:20-alpine

# Install pnpm and necessary build tools for alpine
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

# Default entrypoint for execution
ENTRYPOINT ["pnpm"]
