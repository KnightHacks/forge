#!/bin/sh

set -eu

year=${1:-}
host_port=${2:-}
container_port=${3:-}
container_name=${4:-}

case "$year" in
  2020 | 2021 | 2023 | 2024) ;;
  *)
    echo "unsupported archive year: $year" >&2
    exit 2
    ;;
esac

case "$host_port:$container_port" in
  *[!0-9:]*)
    echo "ports must be numeric" >&2
    exit 2
    ;;
esac

expected_name="forge-archive-$year-e2e-$host_port"
if [ "$container_name" != "$expected_name" ]; then
  echo "unexpected container name: $container_name" >&2
  exit 2
fi

repo_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
image="forge-archive-$year:e2e"

docker build \
  --file "$repo_root/deploy/dockerfiles/kh$year.Dockerfile" \
  --tag "$image" \
  "$repo_root"

docker rm --force "$container_name" >/dev/null 2>&1 || true

exec docker run \
  --name "$container_name" \
  --rm \
  --publish "127.0.0.1:$host_port:$container_port" \
  "$image"
