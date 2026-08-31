# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS tools
RUN npm install --global pnpm@9.12.1 turbo@2.8.11
WORKDIR /app

FROM tools AS pruner
COPY . .
RUN turbo prune @forge/club --docker

FROM tools AS builder
ARG BLADE_URL
ENV BLADE_URL=${BLADE_URL}
ENV CI=1
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=forge-pnpm-store,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store
COPY --from=pruner /app/out/full/ .
RUN test -n "${BLADE_URL}" && pnpm --filter @forge/club build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runner
ENV PORT=3001
ENV NGINX_ENVSUBST_FILTER=PORT
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/club/out/ /usr/share/nginx/html/
USER nginx
EXPOSE 3001
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1
