#!/usr/bin/env bash
# STEP 1 of the server migration — run on the CURRENT server.
# Captures the ENTIRE Studio Nexis system into one archive:
#   both databases, both code checkouts (live main + staging branch, with git
#   history), uploads, DB backups, env + secrets, TLS certs, nginx vhosts
#   (including every tenant custom domain), systemd units, cron jobs and the
#   /usr/local/bin ops scripts.
#
# The archive contains SECRETS and client data. Written 0600. Move it only over
# scp, and delete it from both machines once the migration is verified.
set -euo pipefail

OUT="/root/nexis-migration.tar.gz"
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
mkdir -p "$W"/{db,code,uploads,backups,env,nginx,systemd,cron,bin,tls}
say(){ printf "  %-36s" "$*"; }
ok(){ echo "ok"; }

say "1/9 databases (live + staging)"
docker exec nexis-postgres pg_dump -U nexis -Fc nexis > "$W/db/nexis.dump"
docker exec nexis-postgres pg_dump -U nexis -Fc nexis_staging > "$W/db/nexis_staging.dump" 2>/dev/null || true
docker inspect nexis-postgres --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^POSTGRES_(DB|USER|PASSWORD)=' > "$W/db/postgres.env"
ok

say "2/9 live code + git history"
tar -czf "$W/code/nexis.tar.gz" -C /opt/nexis \
  --exclude=node_modules --exclude=.next --exclude=uploads --exclude=backups \
  --exclude='.env*' --exclude='*.tar.gz' .
ok

say "3/9 staging code + git history"
if [ -d /opt/nexis-staging ]; then
  tar -czf "$W/code/nexis-staging.tar.gz" -C /opt/nexis-staging \
    --exclude=node_modules --exclude=.next --exclude=uploads --exclude=backups \
    --exclude='.env*' --exclude='*.tar.gz' .
fi
ok

say "4/9 uploads (live + staging)"
tar -czf "$W/uploads/nexis.tar.gz" -C /opt/nexis uploads 2>/dev/null || true
[ -d /opt/nexis-staging/uploads ] && tar -czf "$W/uploads/nexis-staging.tar.gz" -C /opt/nexis-staging uploads 2>/dev/null || true
ok

say "5/9 database backups"
cp -a /opt/nexis/backups/. "$W/backups/" 2>/dev/null || true
ok

say "6/9 env + secrets"
cp -a /opt/nexis/.env                "$W/env/prod.env"
cp -a /opt/nexis/.env.local.secrets  "$W/env/prod.local.secrets" 2>/dev/null || true
cp -a /opt/nexis-staging/.env        "$W/env/staging.env" 2>/dev/null || true
mkdir -p "$W/env/secrets"; cp -a /root/.secrets/cloudflare*.ini "$W/env/secrets/" 2>/dev/null || true
ok

say "7/9 TLS certs"
for d in studionexis.com stg.studionexis.com; do
  [ -d "/etc/letsencrypt/live/$d" ] || continue
  mkdir -p "$W/tls/live/$d"
  cp -aL "/etc/letsencrypt/live/$d"/*.pem "$W/tls/live/$d/" 2>/dev/null || true
  cp -a "/etc/letsencrypt/renewal/$d.conf" "$W/tls/" 2>/dev/null || true
done
ok

say "8/9 nginx + systemd + cron + ops scripts"
for f in /etc/nginx/conf.d/studionexis.com.conf \
         /etc/nginx/conf.d/stg.studionexis.com.conf \
         /etc/nginx/conf.d/custom-domain-*.conf; do
  [ -f "$f" ] && cp -a "$f" "$W/nginx/"
done
cp -a /etc/systemd/system/nexis-next.service /etc/systemd/system/nexis-staging.service "$W/systemd/" 2>/dev/null || true
cp -a /etc/cron.d/nexis-* "$W/cron/" 2>/dev/null || true
cp -a /usr/local/bin/nexis-*.sh "$W/bin/" 2>/dev/null || true
ok

say "9/9 packing"
cat > "$W/MANIFEST.txt" <<EOF
Studio Nexis — full system migration bundle
from       : $(hostname) $(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
created    : $(date -Is)
node       : $(node -v 2>/dev/null)
live git   : $(git -C /opt/nexis rev-parse --short HEAD 2>/dev/null) ($(git -C /opt/nexis branch --show-current 2>/dev/null))
staging git: $(git -C /opt/nexis-staging rev-parse --short HEAD 2>/dev/null) ($(git -C /opt/nexis-staging branch --show-current 2>/dev/null))
databases  : nexis$( [ -s "$W/db/nexis_staging.dump" ] && echo " + nexis_staging" )
tenants    : $(docker exec nexis-postgres psql -U nexis -d nexis -tAc 'SELECT count(*) FROM "Tenant";' 2>/dev/null | tr -d ' ')
vhosts     : $(ls "$W/nginx" 2>/dev/null | tr '\n' ' ')
certs      : $(ls "$W/tls/live" 2>/dev/null | tr '\n' ' ')
ops scripts: $(ls "$W/bin" 2>/dev/null | tr '\n' ' ')
backups    : $(ls "$W/backups" 2>/dev/null | wc -l) files
EOF
tar -czf "$OUT" -C "$W" .
chmod 600 "$OUT"
ok

echo
sed 's/^/  /' "$W/MANIFEST.txt"
echo
echo "READY: $OUT ($(du -h "$OUT" | cut -f1))"
echo "Next : scp $OUT root@NEW_IP:/root/"
