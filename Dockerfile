FROM node:20-alpine

# Use corepack to enable pnpm
RUN corepack enable

WORKDIR /app

# Install dependencies layer
COPY package.json pnpm-lock.yaml turbo.json ./
# Since this is a monorepo, we actually need to copy all packages/apps package.json files first if we want to cash deps,
# but for simplicity for local build/dev, we can just copy everything.
COPY . .

RUN pnpm install --frozen-lockfile

# Build the monorepo
RUN pnpm build

EXPOSE 3006

# Start the monorepo in dev mode for local orchestration as requested
CMD ["pnpm", "dev"]
