#!/usr/bin/env bash
# Nightly Postgres backup for Studio Nexis v2, 7-day rotation.
set -euo pipefail
DIR=/opt/nexis/backups
STAMP=$(date +%Y%m%d-%H%M)
docker exec nexis-postgres pg_dump -U nexis nexis | gzip > "$DIR/nexis-$STAMP.sql.gz"
find "$DIR" -name 'nexis-*.sql.gz' -mtime +7 -delete
echo "backup ok: $DIR/nexis-$STAMP.sql.gz ($(du -h "$DIR/nexis-$STAMP.sql.gz" | cut -f1))"
