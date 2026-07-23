#!/usr/bin/env bash
# STEP 1 of the server migration — run on the CURRENT server.
# Produces one archive containing everything the new server needs.
#
# The archive contains SECRETS and client data. It is written 0600. Move it only
# over scp, and delete it from both machines once the migration is verified.
set -euo pipefail

OUT="/root/nexis-migration.tar.gz"
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
mkdir -p "$W"/{db,code,uploads,env,nginx,systemd,cron}
say(){ echo "  $*"; }

say "1/7 databases"
docker exec nexis-postgres pg_dump -U nexis -Fc nexis > "$W/db/nexis.dump"
docker exec nexis-postgres pg_dump -U nexis -Fc nexis_staging > "$W/db/nexis_staging.dump" 2>/dev/null || true
docker inspect nexis-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^POSTGRES_(DB|USER|PASSWORD)=' > "$W/db/postgres.env"

say "2/7 application code (no node_modules/.next)"
tar -czf "$W/code/nexis.tar.gz" -C /opt/nexis \
  --exclude=node_modules --exclude=.next --exclude=uploads --exclude=backups \
  --exclude='.env*' --exclude='*.tar.gz' .

say "3/7 uploads"
tar -czf "$W/uploads/uploads.tar.gz" -C /opt/nexis uploads 2>/dev/null || true

say "4/7 env + secrets"
cp -a /opt/nexis/.env                       "$W/env/prod.env"
cp -a /opt/nexis/.env.local.secrets         "$W/env/prod.local.secrets" 2>/dev/null || true
cp -a /opt/nexis-staging/.env               "$W/env/staging.env" 2>/dev/null || true
mkdir -p "$W/env/secrets"
cp -a /root/.secrets/cloudflare*.ini         "$W/env/secrets/" 2>/dev/null || true

say "5/7 nginx vhosts (incl. every tenant custom domain)"
for f in /etc/nginx/conf.d/studionexis.com.conf \
         /etc/nginx/conf.d/stg.studionexis.com.conf \
         /etc/nginx/conf.d/custom-domain-*.conf; do
  [ -f "$f" ] && cp -a "$f" "$W/nginx/"
done

say "6/7 systemd + cron"
cp -a /etc/systemd/system/nexis-next.service /etc/systemd/system/nexis-staging.service "$W/systemd/"
cp -a /etc/cron.d/nexis-* "$W/cron/" 2>/dev/null || true

say "7/7 packing"
cat > "$W/MANIFEST.txt" <<EOF
Studio Nexis migration bundle
from      : $(hostname) $(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
created   : $(date -Is)
node      : $(node -v 2>/dev/null)
databases : nexis$( [ -s "$W/db/nexis_staging.dump" ] && echo " + nexis_staging" )
vhosts    : $(ls "$W/nginx" | tr '\n' ' ')
Restore with scripts/migrate-install.sh on the new server.
EOF
tar -czf "$OUT" -C "$W" .
chmod 600 "$OUT"
echo
echo "READY: $OUT ($(du -h "$OUT" | cut -f1))"
echo "Next:  scp $OUT root@NEW_IP:/root/"
