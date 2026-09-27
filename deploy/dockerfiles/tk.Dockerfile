# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS tools
RUN npm install --global pnpm@9.12.1 turbo@2.8.11
WORKDIR /app

FROM tools AS pruner
COPY . .
RUN turbo prune @forge/tk --docker

FROM tools AS builder
ENV CI=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=forge-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=forge-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm --config.node-linker=isolated --filter @forge/tk deploy --prod /prod

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder --chown=node:node /prod/ ./
USER node
CMD ["./node_modules/.bin/tsx", "src/index.ts"]
