# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS tools
RUN npm install --global pnpm@9.12.1 turbo@2.8.11
WORKDIR /app

FROM tools AS pruner
COPY . .
RUN turbo prune @forge/blade --docker

FROM tools AS builder
ARG FORGE_BUILD_PLACEHOLDER
ARG FORGE_BUILD_BASE64
ARG NEXT_PUBLIC_BLADE_URL
ARG NEXT_PUBLIC_GUILD_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV BETTER_AUTH_SECRET=${FORGE_BUILD_PLACEHOLDER}
ENV BLADE_URL=https://${FORGE_BUILD_PLACEHOLDER}.invalid
ENV DATABASE_URL=postgresql://${FORGE_BUILD_PLACEHOLDER}:${FORGE_BUILD_PLACEHOLDER}@127.0.0.1:5432/forge
ENV DISCORD_BOT_TOKEN=${FORGE_BUILD_PLACEHOLDER}
ENV DISCORD_CLIENT_ID=${FORGE_BUILD_PLACEHOLDER}
ENV DISCORD_CLIENT_SECRET=${FORGE_BUILD_PLACEHOLDER}
ENV GOOGLE_CLIENT_EMAIL=${FORGE_BUILD_PLACEHOLDER}@invalid.example
ENV GOOGLE_PRIVATE_KEY_B64=${FORGE_BUILD_BASE64}
ENV MINIO_ACCESS_KEY=${FORGE_BUILD_PLACEHOLDER}
ENV MINIO_ENDPOINT=${FORGE_BUILD_PLACEHOLDER}
ENV MINIO_SECRET_KEY=${FORGE_BUILD_PLACEHOLDER}
ENV NEXT_PUBLIC_BLADE_URL=${NEXT_PUBLIC_BLADE_URL}
ENV NEXT_PUBLIC_GUILD_URL=${NEXT_PUBLIC_GUILD_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV STRIPE_SECRET_KEY=${FORGE_BUILD_PLACEHOLDER}
ENV STRIPE_SECRET_WEBHOOK_KEY=${FORGE_BUILD_PLACEHOLDER}
ENV CI=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=forge-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY --from=pruner /app/out/full/ .
RUN test -n "${FORGE_BUILD_PLACEHOLDER}" \
    && test -n "${FORGE_BUILD_BASE64}" \
    && test -n "${NEXT_PUBLIC_BLADE_URL}" \
    && test -n "${NEXT_PUBLIC_GUILD_URL}" \
    && test -n "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}" \
    && pnpm --filter @forge/blade build

FROM node:24-bookworm-slim AS runner
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
WORKDIR /app
COPY --from=builder --chown=node:node /app/apps/blade/.next/standalone/ ./
COPY --from=builder --chown=node:node /app/apps/blade/.next/static/ ./apps/blade/.next/static/
COPY --from=builder --chown=node:node /app/apps/blade/public/ ./apps/blade/public/
USER node
WORKDIR /app/apps/blade
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl --fail --silent "http://127.0.0.1:${PORT}/" > /dev/null || exit 1
CMD ["node", "server.js"]
