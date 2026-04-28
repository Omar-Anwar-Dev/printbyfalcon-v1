#!/usr/bin/env bash
# Pull + rebuild + restart the PRODUCTION stack on the VPS.
# Called by the GitHub Actions deploy-production workflow over SSH.
#
# IMPORTANT: production is gated behind a manual workflow_dispatch + GitHub
# Environment approval per runbook.md §4.2. Do not auto-fire this on push.
#
# Manual-SSH fallback (if GH Actions is down) — see runbook.md §4.3.

set -euo pipefail

REPO_DIR="/var/pbf/repo"
COMPOSE_FILE="$REPO_DIR/docker/docker-compose.prod.yml"
ENV_FILE="$REPO_DIR/.env.production"

cd "$REPO_DIR"

echo "[$(date -Is)] git fetch + fast-forward to origin/main"
git fetch --all --prune
PREV_SHA=$(git rev-parse HEAD)
git reset --hard origin/main
NEW_SHA=$(git rev-parse HEAD)
echo "[$(date -Is)] deploying $PREV_SHA → $NEW_SHA"

echo "[$(date -Is)] docker build + up (prod)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build app worker
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "[$(date -Is)] prune dangling images"
docker image prune -f

echo "[$(date -Is)] deploy-production complete — was $PREV_SHA, now $NEW_SHA"

# Authoritative health probe — runs ON the VPS, hits the **app container**
# directly on its localhost-bound port (compose maps it to 127.0.0.1:3000).
#
# Why not via Nginx: the previous attempt (PR #58) routed through
# `http://127.0.0.1/` with `Host: printbyfalcon.com`, but Nginx is configured
# with a HTTP→HTTPS 301 redirect for that hostname (correct prod behavior),
# so curl got 301 on every retry and the deploy still failed. Hitting :3000
# directly skips Nginx (and therefore CF) entirely — the app's `/api/health`
# endpoint is unauthenticated and returns 200 + JSON when the container is
# healthy.
echo "[$(date -Is)] internal health probe (app container :3000, bypasses Nginx + Cloudflare)"
sleep 15  # let containers finish boot
HEALTH_OK=0
for i in 1 2 3 4 5; do
  HTTP_CODE=$(curl -sS -o /tmp/pbf-health.json -w "%{http_code}" \
    --max-time 10 \
    http://127.0.0.1:3000/api/health || true)
  echo "[$(date -Is)] internal health attempt $i — HTTP $HTTP_CODE"
  cat /tmp/pbf-health.json 2>/dev/null || true
  echo
  if [ "$HTTP_CODE" = "200" ]; then
    HEALTH_OK=1
    break
  fi
  sleep 6
done
if [ "$HEALTH_OK" != "1" ]; then
  echo "[$(date -Is)] FATAL: internal health probe failed after 5 attempts."
  echo "[$(date -Is)] containers may have failed to boot — check 'docker compose logs app'."
  exit 1
fi
echo "[$(date -Is)] internal health OK — production stack is up."
echo "[$(date -Is)] external verify: curl -sS https://printbyfalcon.com/api/health | jq"
