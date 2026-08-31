# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS tools
RUN npm install --global pnpm@9.12.1 turbo@2.8.11
WORKDIR /app

FROM tools AS pruner
COPY . .
RUN turbo prune @forge/2026 --docker

FROM tools AS builder
ARG BLADE_URL
ARG KHIX_HACKER_PORTAL_CLIENT_ID
ARG KHIX_HACKER_PORTAL_ORIGIN
ENV BLADE_URL=${BLADE_URL}
ENV KHIX_HACKER_PORTAL_CLIENT_ID=${KHIX_HACKER_PORTAL_CLIENT_ID}
ENV KHIX_HACKER_PORTAL_ORIGIN=${KHIX_HACKER_PORTAL_ORIGIN}
ENV CI=1
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=forge-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY --from=pruner /app/out/full/ .
RUN test -n "${BLADE_URL}" \
    && test -n "${KHIX_HACKER_PORTAL_CLIENT_ID}" \
    && test -n "${KHIX_HACKER_PORTAL_ORIGIN}" \
    && pnpm --filter @forge/2026 build

FROM node:24-bookworm-slim AS runner
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3007
WORKDIR /app
COPY --from=builder --chown=node:node /app/apps/2026/.next/standalone/ ./
COPY --from=builder --chown=node:node /app/apps/2026/.next/static/ ./apps/2026/.next/static/
COPY --from=builder --chown=node:node /app/apps/2026/public/ ./apps/2026/public/
USER node
WORKDIR /app/apps/2026
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl --fail --silent "http://127.0.0.1:${PORT}/" > /dev/null || exit 1
CMD ["node", "server.js"]
