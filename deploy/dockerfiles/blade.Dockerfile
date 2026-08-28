# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS tools
RUN npm install --global pnpm@9.12.1 turbo@2.8.11
WORKDIR /app

FROM tools AS pruner
COPY . .
RUN turbo prune @forge/blade --docker

FROM tools AS builder
ARG BETTER_AUTH_SECRET
ARG BLADE_URL
ARG DATABASE_URL
ARG DISCORD_BOT_TOKEN
ARG DISCORD_CLIENT_ID
ARG DISCORD_CLIENT_SECRET
ARG GOOGLE_CLIENT_EMAIL
ARG GOOGLE_PRIVATE_KEY_B64
ARG MINIO_ACCESS_KEY
ARG MINIO_ENDPOINT
ARG MINIO_SECRET_KEY
ARG NEXT_PUBLIC_BLADE_URL
ARG NEXT_PUBLIC_GUILD_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG STRIPE_SECRET_KEY
ARG STRIPE_SECRET_WEBHOOK_KEY
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BLADE_URL=${BLADE_URL}
ENV DATABASE_URL=${DATABASE_URL}
ENV DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
ENV DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
ENV DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
ENV GOOGLE_CLIENT_EMAIL=${GOOGLE_CLIENT_EMAIL}
ENV GOOGLE_PRIVATE_KEY_B64=${GOOGLE_PRIVATE_KEY_B64}
ENV MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
ENV MINIO_ENDPOINT=${MINIO_ENDPOINT}
ENV MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
ENV NEXT_PUBLIC_BLADE_URL=${NEXT_PUBLIC_BLADE_URL}
ENV NEXT_PUBLIC_GUILD_URL=${NEXT_PUBLIC_GUILD_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
ENV STRIPE_SECRET_WEBHOOK_KEY=${STRIPE_SECRET_WEBHOOK_KEY}
ENV CI=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=forge-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY --from=pruner /app/out/full/ .
RUN test -n "${NEXT_PUBLIC_BLADE_URL}" \
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
