#!/bin/bash
#
# BlackVaultDocs SSR deploy — run on Sites EC2.
#
# Usage:
#   ./deploy.sh publish   # generate sitemap, build, pm2 restart
#   ./deploy.sh build     # build + pm2 only (skip sitemap)
#
set -euo pipefail

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"
export HOME="${HOME:-/home/ubuntu}"

REPO="${REPO:-/var/www/blackvaultdocs.com}"
MODE="${1:-publish}"
shift || true

log() { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

cd "${REPO}"

log "git pull"
sudo chown -R ubuntu:www-data .git 2>/dev/null || true
git fetch origin 2>&1 | tail -3 || true
sudo chown -R ubuntu:www-data . 2>/dev/null || true
sudo -u ubuntu git reset --hard origin/main 2>&1 | tail -3 || true
sudo chown -R www-data:www-data . 2>/dev/null || true

cd "${REPO}/frontend"

export BVD_API_BASE="${BVD_API_BASE:-https://api.blackvaultdocs.com}"

if [[ "$MODE" == "publish" ]]; then
  log "npm ci + generate sitemap"
  npm ci --no-audit --no-fund --loglevel=error
  node scripts/generate-sitemap.mjs
elif [[ "$MODE" == "build" ]]; then
  log "build-only (skip sitemap)"
  npm ci --no-audit --no-fund --loglevel=error
else
  echo "unknown mode: $MODE" >&2
  exit 2
fi

log "next build (SSR)"
SKIP_PREBUILD=1 NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=6144}" npm run build

log "pm2 restart blackvaultdocs-web"
if pm2 describe blackvaultdocs-web >/dev/null 2>&1; then
  pm2 restart blackvaultdocs-web
else
  pm2 start ecosystem.config.cjs --only blackvaultdocs-web
fi
pm2 save

log "done"
