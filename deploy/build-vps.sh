#!/bin/sh
set -eu
cd /opt/scanms
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml config --quiet
# Build sequentially on the 1 GB VPS; swap is only a fallback during installation.
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml build backend
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml build frontend
printf '%s\n' 'SCANMS_BUILD_COMPLETE'
