#!/bin/sh
set -eu
cd /opt/scanms
docker compose --env-file deploy/backend.env -f deploy/compose.production.yml up -d redis backend frontend
printf '%s\n' 'Preview services started on 127.0.0.1:8080; public DNS unchanged.'
