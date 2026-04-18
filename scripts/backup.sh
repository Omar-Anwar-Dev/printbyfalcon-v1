#!/usr/bin/env bash
# Nightly backup script — runs on the VPS host via cron (NOT inside a container).
# Dumps both prod and staging Postgres DBs, gzips them, keeps last 14 days.
#
# Install (on VPS):
#   crontab -e
#   0 3 * * * /var/pbf/repo/scripts/backup.sh >> /var/log/pbf/backup.log 2>&1

set -euo pipefail

RETENTION_DAYS=14
BACKUP_DIR="/var/pbf/backups"
DATE="$(date +%F-%H%M)"

mkdir -p "$BACKUP_DIR"

dump() {
  local env="$1"
  local container="$2"
  local user="$3"
  local db="$4"
  local outfile="$BACKUP_DIR/pbf-${env}-${DATE}.sql.gz"

  echo "[$(date -Is)] dumping $env → $outfile"
  docker exec -e PGPASSWORD="$(docker exec "$container" printenv POSTGRES_PASSWORD)" \
    "$container" pg_dump -U "$user" -d "$db" --clean --if-exists \
    | gzip -9 > "$outfile"

  if [ ! -s "$outfile" ]; then
    echo "FATAL: $outfile is empty"
    exit 1
  fi
}

dump prod    pbf-prod-postgres-1    "${POSTGRES_USER_PROD:-pbf_prod}"       "${POSTGRES_DB_PROD:-pbf_prod}"
dump staging pbf-staging-postgres-staging-1 "${POSTGRES_USER_STAGING:-pbf_staging}" "${POSTGRES_DB_STAGING:-pbf_staging}"

# Rotate: delete backups older than RETENTION_DAYS days.
find "$BACKUP_DIR" -name 'pbf-*.sql.gz' -mtime +$RETENTION_DAYS -print -delete

echo "[$(date -Is)] backup complete"
