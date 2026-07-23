#!/usr/bin/env bash
# STEP 2 of the server migration — run on the NEW server as root, after scp'ing
# nexis-migration.tar.gz to /root/.
#
#   bash migrate-install.sh [/root/nexis-migration.tar.gz]
#
# Additive and idempotent: it only creates Studio Nexis resources (own ports,
# own containers, own nginx vhosts). It does NOT touch anything already on the
# box. Nothing goes live until you repoint DNS at the end.
set -euo pipefail

BUNDLE="${1:-/root/nexis-migration.tar.gz}"
NODE_VER="22.17.0"
W=/root/nexis-migration
step(){ echo; echo "=== $* ==="; }

[ -f "$BUNDLE" ] || { echo "Bundle not found: $BUNDLE"; exit 1; }
IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
echo "Installing Studio Nexis on $(hostname) ($IP)"

step "0. unpack"
rm -rf "$W"; mkdir -p "$W"; tar -xzf "$BUNDLE" -C "$W"; cat "$W/MANIFEST.txt"

step "1. prerequisites"
command -v docker >/dev/null || { curl -fsSL https://get.docker.com | sh; }
command -v git    >/dev/null || apt-get install -y -q git
command -v nginx  >/dev/null || apt-get install -y -q nginx
command -v certbot>/dev/null || apt-get install -y -q certbot python3-certbot-nginx python3-certbot-dns-cloudflare
if ! command -v node >/dev/null || [ "$(node -v)" != "v$NODE_VER" ]; then
  curl -fsSLO "https://nodejs.org/dist/v$NODE_VER/node-v$NODE_VER-linux-x64.tar.xz"
  tar -xJf "node-v$NODE_VER-linux-x64.tar.xz" -C /usr/local --strip-components=1
  rm -f "node-v$NODE_VER-linux-x64.tar.xz"
fi
node -v && npm -v

step "2. postgres container + data"
if ! docker ps -a --format '{{.Names}}' | grep -q '^nexis-postgres$'; then
  docker volume create nexis_pgdata >/dev/null
  docker run -d --name nexis-postgres --restart unless-stopped \
    -p 127.0.0.1:5599:5432 --env-file "$W/db/postgres.env" \
    -v nexis_pgdata:/var/lib/postgresql/data postgres:16-alpine
fi
until docker exec nexis-postgres pg_isready -U nexis >/dev/null 2>&1; do sleep 1; done
docker exec nexis-postgres psql -U nexis -d postgres -c "CREATE DATABASE nexis_staging OWNER nexis;" 2>/dev/null || true
docker exec -i nexis-postgres pg_restore -U nexis -d nexis --clean --if-exists < "$W/db/nexis.dump" 2>/dev/null || true
[ -s "$W/db/nexis_staging.dump" ] && docker exec -i nexis-postgres pg_restore -U nexis -d nexis_staging --clean --if-exists < "$W/db/nexis_staging.dump" 2>/dev/null || true
echo "  tenants restored: $(docker exec nexis-postgres psql -U nexis -d nexis -tAc 'SELECT count(*) FROM "Tenant";')"

step "3. code (live + staging, with git history) + env + uploads + backups"
mkdir -p /opt/nexis /opt/nexis-staging
tar -xzf "$W/code/nexis.tar.gz" -C /opt/nexis
# staging is its own checkout on the `staging` branch — restore it as such,
# never as a copy of live (they intentionally diverge).
if [ -f "$W/code/nexis-staging.tar.gz" ]; then
  tar -xzf "$W/code/nexis-staging.tar.gz" -C /opt/nexis-staging
fi
cp "$W/env/prod.env" /opt/nexis/.env
[ -f "$W/env/prod.local.secrets" ] && cp "$W/env/prod.local.secrets" /opt/nexis/.env.local.secrets
[ -f "$W/env/staging.env" ] && cp "$W/env/staging.env" /opt/nexis-staging/.env
mkdir -p /root/.secrets && cp -a "$W/env/secrets/." /root/.secrets/ 2>/dev/null || true
chmod 600 /root/.secrets/* /opt/nexis/.env* /opt/nexis-staging/.env 2>/dev/null || true
tar -xzf "$W/uploads/nexis.tar.gz" -C /opt/nexis 2>/dev/null || true
tar -xzf "$W/uploads/nexis-staging.tar.gz" -C /opt/nexis-staging 2>/dev/null || true
mkdir -p /opt/nexis/backups && cp -a "$W/backups/." /opt/nexis/backups/ 2>/dev/null || true
echo "  live git    : $(git -C /opt/nexis rev-parse --short HEAD 2>/dev/null) ($(git -C /opt/nexis branch --show-current 2>/dev/null))"
echo "  staging git : $(git -C /opt/nexis-staging rev-parse --short HEAD 2>/dev/null) ($(git -C /opt/nexis-staging branch --show-current 2>/dev/null))"

step "4. build (a few minutes)"
for d in /opt/nexis /opt/nexis-staging; do
  [ -f "$d/.env" ] || continue
  ( cd "$d" && npm ci && npx prisma generate >/dev/null && npm run build )
done

step "5. services"
cp "$W/systemd"/*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now nexis-next
[ -f /opt/nexis-staging/.env ] && systemctl enable --now nexis-staging
cp "$W/cron"/nexis-* /etc/cron.d/ 2>/dev/null || true
chmod 644 /etc/cron.d/nexis-* 2>/dev/null || true
cp "$W/bin"/nexis-*.sh /usr/local/bin/ 2>/dev/null || true
chmod +x /usr/local/bin/nexis-*.sh 2>/dev/null || true

step "6. nginx (listen IP rewritten to $IP)"
for f in "$W/nginx"/*.conf; do
  b=$(basename "$f"); sed -E "s/listen [0-9.]+:(80|443)/listen $IP:\1/g" "$f" > "/etc/nginx/conf.d/$b"
done
nginx -t

step "7. certificates (DNS-01, works before DNS is repointed)"
CF=/root/.secrets/cloudflare-studionexis.ini
if [ -f "$CF" ]; then
  certbot certonly -n --dns-cloudflare --dns-cloudflare-credentials "$CF" \
    --dns-cloudflare-propagation-seconds 30 \
    -d studionexis.com -d '*.studionexis.com' --cert-name studionexis.com || true
  certbot certonly -n --dns-cloudflare --dns-cloudflare-credentials "$CF" \
    --dns-cloudflare-propagation-seconds 30 \
    -d stg.studionexis.com -d '*.stg.studionexis.com' --cert-name stg.studionexis.com || true
fi
nginx -t && systemctl reload nginx

echo
echo "=== DONE. Verify BEFORE repointing DNS: ==="
for h in studionexis.com app.studionexis.com hq.studionexis.com; do
  echo "  curl -s -o /dev/null -w '$h %{http_code}\\n' --resolve $h:443:$IP https://$h/"
done
echo "Then repoint the studionexis.com A records (apex, *, stg, *.stg) to $IP."
