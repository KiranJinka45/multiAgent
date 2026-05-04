# ZTAN Audit Verification Server - Production Dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @packages/ztan-crypto build
RUN pnpm --filter @apps/governance build

FROM base AS final
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/packages/ztan-crypto /usr/src/app/packages/ztan-crypto
COPY --from=build /usr/src/app/apps/governance /usr/src/app/apps/governance
COPY --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --from=build /usr/src/app/package.json /usr/src/app/package.json

WORKDIR /usr/src/app/apps/governance
EXPOSE 3000
CMD [ "pnpm", "audit-server" ]
