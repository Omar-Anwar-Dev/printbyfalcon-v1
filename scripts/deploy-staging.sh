#!/usr/bin/env bash
# Pull + rebuild + restart the staging stack on the VPS.
# Called by the GitHub Actions deploy-to-staging workflow over SSH.

set -euo pipefail

REPO_DIR="/var/pbf/repo"
COMPOSE_FILE="$REPO_DIR/docker/docker-compose.staging.yml"
ENV_FILE="$REPO_DIR/.env.staging"

cd "$REPO_DIR"

echo "[$(date -Is)] git fetch + fast-forward"
git fetch --all --prune
git reset --hard origin/main

echo "[$(date -Is)] docker build + up"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build app-staging worker-staging
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "[$(date -Is)] prune dangling images"
docker image prune -f

echo "[$(date -Is)] deploy-staging complete"
