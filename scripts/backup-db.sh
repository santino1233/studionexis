#!/usr/bin/env bash
# Nightly Postgres backup for Studio Nexis v2, 7-day rotation.
set -euo pipefail
DIR=/opt/nexis/backups
STAMP=$(date +%Y%m%d-%H%M)
docker exec nexis-postgres pg_dump -U nexis nexis | gzip > "$DIR/nexis-$STAMP.sql.gz"
tar -czf "$DIR/uploads-$STAMP.tar.gz" -C /opt/nexis uploads 2>/dev/null || true
find "$DIR" \( -name 'nexis-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +7 -delete
echo "backup ok: $DIR/nexis-$STAMP.sql.gz ($(du -h "$DIR/nexis-$STAMP.sql.gz" | cut -f1))"
