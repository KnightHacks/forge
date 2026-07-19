#!/usr/bin/env bash

set -euo pipefail

cleanup_until="${FORGE_DOCKER_CLEANUP_UNTIL:-72h}"
build_cache_keep_storage="${FORGE_DOCKER_BUILD_CACHE_KEEP_STORAGE:-1GB}"
lock_file="${FORGE_DOCKER_CLEANUP_LOCK_FILE:-/tmp/forge-docker-cleanup.lock}"

usage() {
  cat <<'EOF'
Usage: ops/coolify-docker-cleanup.sh [cleanup-until]

cleanup-until defaults to 72h and is passed to Docker's until filter.
Examples:
  ops/coolify-docker-cleanup.sh
  ops/coolify-docker-cleanup.sh 48h
  ops/coolify-docker-cleanup.sh 2026-07-01T00:00:00

Environment overrides:
  FORGE_DOCKER_CLEANUP_UNTIL
  FORGE_DOCKER_BUILD_CACHE_KEEP_STORAGE
  FORGE_DOCKER_CLEANUP_LOCK_FILE
EOF
}

log() {
  printf '[forge-docker-cleanup] %s\n' "$*"
}

if [ "$#" -gt 1 ]; then
  usage >&2
  exit 2
fi

case "${1:-}" in
  -h | --help)
    usage
    exit 0
    ;;
  "")
    ;;
  *)
    cleanup_until="$1"
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  log "docker command not found; run this on a Coolify Docker host"
  exit 1
fi

lock_dir="$(dirname "$lock_file")"
mkdir -p "$lock_dir"

exec 9>"$lock_file"
if ! flock -n 9; then
  log "another cleanup is already running; skipping"
  exit 0
fi

log "cleanup age: ${cleanup_until}"
log "build cache keep storage: ${build_cache_keep_storage}"
log "docker disk usage before cleanup"
docker system df

log "pruning stopped containers older than ${cleanup_until}"
docker container prune --force --filter "until=${cleanup_until}"

log "pruning unused images older than ${cleanup_until}"
docker image prune --all --force --filter "until=${cleanup_until}"

log "pruning unused networks older than ${cleanup_until}"
docker network prune --force --filter "until=${cleanup_until}"

log "pruning unused classic builder cache older than ${cleanup_until}"
docker builder prune \
  --all \
  --force \
  --filter "until=${cleanup_until}" \
  --keep-storage "${build_cache_keep_storage}"

if docker buildx version >/dev/null 2>&1; then
  log "pruning unused BuildKit buildx cache older than ${cleanup_until}"
  docker buildx prune \
    --all \
    --force \
    --filter "until=${cleanup_until}" \
    --keep-storage "${build_cache_keep_storage}"
else
  log "docker buildx is not available; skipping BuildKit buildx cache prune"
fi

log "docker disk usage after cleanup"
docker system df

log "cleanup complete; docker volumes were not pruned"
