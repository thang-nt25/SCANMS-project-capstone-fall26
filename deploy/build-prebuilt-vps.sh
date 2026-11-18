#!/bin/sh
set -eu
cd /opt/scanms
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml -f deploy/compose.prebuilt.yml config --quiet
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml -f deploy/compose.prebuilt.yml build backend
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml -f deploy/compose.prebuilt.yml build frontend
printf '%s\n' 'SCANMS_BUILD_COMPLETE'
