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

step "0. PRE-FLIGHT — refuse to run if we'd collide with anything already here"
FATAL=0
chk(){ # description, condition-already-in-use
  if [ "$2" = "1" ]; then echo "  CONFLICT: $1"; FATAL=1; else echo "  ok: $1"; fi
}
chk "docker container 'nexis-postgres' is free" "$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx nexis-postgres && echo 1 || echo 0)"
chk "docker volume 'nexis_pgdata' is free"      "$(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -qx nexis_pgdata && echo 1 || echo 0)"
for p in 3105 3106 5599; do
  chk "port $p is free" "$(ss -tlnH 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p\$" && echo 1 || echo 0)"
done
chk "/opt/nexis does not already exist"         "$([ -e /opt/nexis ] && echo 1 || echo 0)"
chk "no existing nexis-* systemd units"         "$(ls /etc/systemd/system/nexis-*.service >/dev/null 2>&1 && echo 1 || echo 0)"
if [ "$FATAL" = "1" ]; then
  echo; echo "ABORTED before making any change. Resolve the conflicts above first."; exit 1
fi
echo "  -> no conflicts; nothing on this server will be modified or replaced."

step "0b. unpack"
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
# Secrets: NEVER overwrite a file that already exists — this box may host other
# systems whose credentials live here (e.g. an unrelated cloudflare.ini).
mkdir -p /root/.secrets
for f in "$W/env/secrets"/*; do
  [ -f "$f" ] || continue
  b=$(basename "$f")
  if [ -e "/root/.secrets/$b" ]; then
    if cmp -s "$f" "/root/.secrets/$b"; then echo "  secrets: $b identical, leaving as-is"
    else echo "  secrets: $b ALREADY EXISTS and differs — NOT overwritten (kept theirs)"; fi
  else
    cp -a "$f" "/root/.secrets/$b"; echo "  secrets: $b installed"
  fi
done
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
# Prove the EXISTING config is healthy before we touch anything. If another
# system on this box already has a broken nginx, stop — don't take the blame.
if ! nginx -t >/dev/null 2>&1; then
  echo "  ABORT: nginx config was ALREADY invalid before we started. Not touching it."
  nginx -t; exit 1
fi
PLACED=()
for f in "$W/nginx"/*.conf; do
  b=$(basename "$f")
  if [ -e "/etc/nginx/conf.d/$b" ]; then
    echo "  skip $b — a file with that name already exists (not overwriting)"; continue
  fi
  sed -E "s/listen [0-9.]+:(80|443)/listen $IP:\1/g" "$f" > "/etc/nginx/conf.d/$b"
  PLACED+=("/etc/nginx/conf.d/$b"); echo "  added $b"
done
# If OUR vhosts break the config, remove them again so the other systems on this
# box are left exactly as we found them.
if ! nginx -t >/dev/null 2>&1; then
  echo "  nginx test FAILED with our vhosts — rolling them back:"
  nginx -t 2>&1 | sed 's/^/    /'
  [ ${#PLACED[@]} -gt 0 ] && rm -f "${PLACED[@]}"
  nginx -t && echo "  rolled back; existing nginx config is valid and untouched."
  exit 1
fi
echo "  nginx config valid (ours + existing)"

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
