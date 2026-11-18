#!/bin/sh
set -eu
cd /opt/scanms
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml pull redis caddy
