# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS tools
RUN npm install --global pnpm@9.12.1 turbo@2.8.11
WORKDIR /app

FROM tools AS pruner
COPY . .
RUN turbo prune @forge/guild --docker

FROM tools AS builder
ARG NEXT_PUBLIC_BLADE_URL
ARG NEXT_PUBLIC_TRPC_URL
ENV NEXT_PUBLIC_BLADE_URL=${NEXT_PUBLIC_BLADE_URL}
ENV NEXT_PUBLIC_TRPC_URL=${NEXT_PUBLIC_TRPC_URL}
ENV BETTER_AUTH_SECRET=build-only-placeholder-secret-000000000000
ENV BLADE_URL=https://blade.invalid
ENV DATABASE_URL=postgresql://forge:forge@127.0.0.1:5432/forge
ENV DISCORD_BOT_TOKEN=build-only-placeholder
ENV DISCORD_CLIENT_ID=build-only-placeholder
ENV DISCORD_CLIENT_SECRET=build-only-placeholder
ENV GOOGLE_CLIENT_EMAIL=build@invalid.example
ENV GOOGLE_PRIVATE_KEY_B64=YnVpbGQtb25seS1wbGFjZWhvbGRlcg==
ENV MINIO_ACCESS_KEY=build-only-placeholder
ENV MINIO_ENDPOINT=minio.invalid
ENV MINIO_SECRET_KEY=build-only-placeholder
ENV STRIPE_SECRET_KEY=sk_test_build_only_placeholder
ENV CI=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=forge-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY --from=pruner /app/out/full/ .
RUN test -n "${NEXT_PUBLIC_BLADE_URL}" \
    && test -n "${NEXT_PUBLIC_TRPC_URL}" \
    && pnpm --filter @forge/guild build

FROM node:24-bookworm-slim AS runner
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003
WORKDIR /app
COPY --from=builder --chown=node:node /app/apps/guild/.next/standalone/ ./
COPY --from=builder --chown=node:node /app/apps/guild/.next/static/ ./apps/guild/.next/static/
COPY --from=builder --chown=node:node /app/apps/guild/public/ ./apps/guild/public/
USER node
WORKDIR /app/apps/guild
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl --fail --silent "http://127.0.0.1:${PORT}/" > /dev/null || exit 1
CMD ["node", "server.js"]
