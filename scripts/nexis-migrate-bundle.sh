#!/usr/bin/env bash
# Build ONE portable archive with everything needed to stand Studio Nexis up on a
# new server: both databases, uploaded files, env/secret files, systemd units,
# nginx vhosts, cron jobs, and a manifest. Also a complete disaster-recovery snapshot.
#
# The archive contains SECRETS and client data — it is written 0600 and must only
# be moved over SSH/scp to the new server. Never upload it anywhere else.
set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
OUT=/opt/nexis-migration
WORK="$OUT/build-$STAMP"
mkdir -p "$WORK"/{db,uploads,env,systemd,nginx,cron,docker}
chmod 700 "$OUT" "$WORK"

log(){ echo "[$(date '+%F %T')] $*"; }

log "1/7 databases (pg_dump nexis + nexis_staging)"
docker exec nexis-postgres pg_dump -U nexis -Fc nexis        > "$WORK/db/nexis.dump"
docker exec nexis-postgres pg_dump -U nexis -Fc nexis_staging > "$WORK/db/nexis_staging.dump"

log "2/7 uploads"
tar -czf "$WORK/uploads/nexis-uploads.tar.gz" -C /opt/nexis uploads 2>/dev/null || true

log "3/7 env + secrets"
for f in /opt/nexis/.env /opt/nexis/.env.local.secrets /opt/nexis-staging/.env \
         /root/.secrets/cloudflare.ini /root/.secrets/cloudflare-studionexis.ini; do
  [ -f "$f" ] && cp -a "$f" "$WORK/env/$(echo "$f" | sed 's#/#_#g')"
done

log "4/7 systemd units"
cp -a /etc/systemd/system/nexis-next.service /etc/systemd/system/nexis-staging.service "$WORK/systemd/"

log "5/7 nginx v2 vhosts"
for c in studionexis.com.conf stg.studionexis.com.conf \
         ; do
  cp -a "/etc/nginx/conf.d/$c" "$WORK/nginx/" 2>/dev/null || true
done

log "6/7 cron + ops scripts"
cp -a /etc/cron.d/nexis-* "$WORK/cron/" 2>/dev/null || true
cp -a /usr/local/bin/nexis-sync-staging.sh /usr/local/bin/nexis-deploy-*.sh "$WORK/" 2>/dev/null || true

log "7/7 docker-postgres spec + manifest"
PGPASS=$(grep -o 'POSTGRES_PASSWORD=[^ ]*' <(docker inspect nexis-postgres --format '{{range .Config.Env}}{{println .}}{{end}}') | cut -d= -f2)
cat > "$WORK/docker/postgres.env" <<EOF
POSTGRES_DB=nexis
POSTGRES_USER=nexis
POSTGRES_PASSWORD=$PGPASS
EOF
cat > "$WORK/docker/run-postgres.sh" <<'EOF'
#!/usr/bin/env bash
# Recreate the Postgres container on the new server (data restored separately).
set -euo pipefail
docker volume create nexis_pgdata
docker run -d --name nexis-postgres --restart unless-stopped \
  -p 127.0.0.1:5599:5432 --env-file "$(dirname "$0")/postgres.env" \
  -v nexis_pgdata:/var/lib/postgresql/data postgres:16-alpine
EOF
chmod +x "$WORK/docker/run-postgres.sh"

cat > "$WORK/MANIFEST.txt" <<EOF
Studio Nexis migration bundle — $STAMP
Source server: $(hostname) $(curl -s -4 --max-time 5 ifconfig.me 2>/dev/null || echo '?')
Node $(node -v) · nginx $(nginx -v 2>&1 | sed 's#.*/##') · certbot $(certbot --version 2>&1 | sed 's/certbot //') · $(docker --version)

Contents:
  db/nexis.dump              live database (pg_restore -Fc)
  db/nexis_staging.dump      staging database (optional; can re-derive from live)
  uploads/                   tenant uploaded files -> /opt/nexis/uploads
  env/                       .env + secrets (RESTRICTED) -> original paths
  systemd/                   nexis-next + nexis-staging units -> /etc/systemd/system
  nginx/                     v2 vhosts -> /etc/nginx/conf.d (rewrite listen IP!)
  cron/                      /etc/cron.d/nexis-* jobs
  docker/                    postgres.env + run-postgres.sh
  nexis-*.sh                 ops/deploy/sync scripts -> /usr/local/bin

Restore: see /opt/nexis/MIGRATION.md on the source server.
Repos (clone on new server, not bundled):
  git@github.com:santino1233/studionexis.git  main -> /opt/nexis, staging -> /opt/nexis-staging
EOF

ARCHIVE="$OUT/nexis-migration-$STAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$WORK" .
chmod 600 "$ARCHIVE"
rm -rf "$WORK"
log "done: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
echo "$ARCHIVE"
