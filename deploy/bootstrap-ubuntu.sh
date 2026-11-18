#!/bin/sh
set -eu
. /etc/os-release
if [ "${ID}" != ubuntu ] || [ "${VERSION_ID}" != 24.04 ]; then
    printf '%s\n' 'This bootstrap requires Ubuntu 24.04; no changes made.' >&2
    exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
architecture=$(dpkg --print-architecture)
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: ${architecture}
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
# Leave pre-existing swap files and their configuration alone.
if [ ! -e /swapfile ] && [ "$(awk '/SwapTotal/{print $2}' /proc/meminfo)" = 0 ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    printf '%s\n' '/swapfile none swap sw 0 0' >> /etc/fstab
fi
install -d -m 0700 /opt/scanms
docker version --format '{{.Server.Version}}'
docker compose version
free -m
