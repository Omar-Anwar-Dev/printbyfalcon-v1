#!/usr/bin/env bash
# Restore a Postgres dump into a target container. DESTRUCTIVE — drops existing schema.
# Usage:
#   ./scripts/restore.sh /var/pbf/backups/pbf-prod-2026-04-27-0300.sql.gz pbf-prod-postgres-1 pbf_prod pbf_prod
#
# Run the **restore drill** (Sprint 1 S1-D6-T2) against a throwaway DB, not prod.

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <backup.sql.gz> <container> <user> <db>"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER="$2"
USER="$3"
DB="$4"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Not found: $BACKUP_FILE"
  exit 1
fi

echo ">> restoring $BACKUP_FILE into $CONTAINER ($USER/$DB)"
echo ">> press Ctrl-C within 5s to abort..."
sleep 5

gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$USER" -d "$DB"

echo ">> restore complete. run a row-count sanity check:"
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;"
