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
echo "[$(date -Is)] verify: curl -sS https://printbyfalcon.com/api/health | jq"
