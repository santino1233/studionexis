# Studio Nexis — move to a new server

Everything the app needs, and the exact steps to stand it up on a fresh box and
cut over with minimal downtime. Fill in `NEW_IP` (the new server's public IP).

## What runs today (source server 72.62.69.9, VestaCP/Hostinger)

| Piece | Where |
|---|---|
| App (prod) | systemd `nexis-next` :3105, `/opt/nexis` (branch `main`) |
| App (staging) | systemd `nexis-staging` :3106, `/opt/nexis-staging` (branch `staging`) |
| Database | Docker `nexis-postgres` (postgres:16-alpine), volume `nexis_pgdata`, `127.0.0.1:5599`; DBs `nexis` + `nexis_staging`, user `nexis` |
| Uploads | `/opt/nexis/uploads` |
| Env/secrets | `/opt/nexis/.env`, `/opt/nexis/.env.local.secrets`, `/opt/nexis-staging/.env`, `/root/.secrets/cloudflare*.ini` |
| nginx | `/etc/nginx/conf.d/{studionexis.com,stg.studionexis.com}.conf` |
| Cron | `/etc/cron.d/nexis-{backup,reminders,staging-sync,domains,subdomains}` |
| TLS | LE certs for `*.studionexis.com`, `*.stg.studionexis.com` (via certbot dns-cloudflare) |
| Domains | `studionexis.com` only (grey-cloud → server IP). `nexis.revsports.ca` was retired 2026-07-22. |

## 0. Prereqs on the NEW server (Ubuntu/Debian assumed)
```
apt update && apt install -y nginx certbot python3-certbot-nginx python3-certbot-dns-cloudflare git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
curl -fsSL https://get.docker.com | sh
# GitHub deploy key: put the repo's read key at /root/.ssh/id_ed25519 (same as source)
```

## 1. Build the bundle on the SOURCE and copy it over
```
/usr/local/bin/nexis-migrate-bundle.sh          # -> /opt/nexis-migration/nexis-migration-<stamp>.tar.gz (0600, has secrets)
scp /opt/nexis-migration/nexis-migration-*.tar.gz root@NEW_IP:/root/
```

## 2. Restore on the NEW server
```
mkdir -p /root/mig && tar -xzf /root/nexis-migration-*.tar.gz -C /root/mig && cd /root/mig

# 2a. Postgres container + data
./docker/run-postgres.sh
until docker exec nexis-postgres pg_isready -U nexis; do sleep 1; done
docker exec nexis-postgres psql -U nexis -d postgres -c "CREATE DATABASE nexis_staging OWNER nexis;" || true
docker exec -i nexis-postgres pg_restore -U nexis -d nexis          --clean --if-exists < db/nexis.dump
docker exec -i nexis-postgres pg_restore -U nexis -d nexis_staging  --clean --if-exists < db/nexis_staging.dump

# 2b. Code
git clone git@github.com:santino1233/studionexis.git /opt/nexis         && (cd /opt/nexis && git checkout main)
git clone git@github.com:santino1233/studionexis.git /opt/nexis-staging && (cd /opt/nexis-staging && git checkout staging)

# 2c. Env, secrets, uploads
mkdir -p /root/.secrets
cp env/_opt_nexis_.env                       /opt/nexis/.env
cp env/_opt_nexis_.env.local.secrets         /opt/nexis/.env.local.secrets
cp env/_opt_nexis-staging_.env               /opt/nexis-staging/.env
cp env/_root_.secrets_cloudflare.ini         /root/.secrets/cloudflare.ini
cp env/_root_.secrets_cloudflare-studionexis.ini /root/.secrets/cloudflare-studionexis.ini
chmod 600 /root/.secrets/*.ini /opt/nexis/.env* /opt/nexis-staging/.env
tar -xzf uploads/nexis-uploads.tar.gz -C /opt/nexis
cp -a uploads/nexis-uploads.tar.gz /tmp/ && tar -xzf /tmp/nexis-uploads.tar.gz -C /opt/nexis-staging   # staging mirror

# 2d. Build both apps
for d in /opt/nexis /opt/nexis-staging; do (cd "$d" && npm ci && npx prisma generate && npm run build); done

# 2e. Ops scripts, systemd, cron
cp nexis-*.sh /usr/local/bin/ && chmod +x /usr/local/bin/nexis-*.sh
cp systemd/*.service /etc/systemd/system/ && systemctl daemon-reload
cp cron/nexis-backup cron/nexis-reminders cron/nexis-staging-sync /etc/cron.d/     # + domains/subdomains if using custom domains

# 2f. nginx — REWRITE the listen IP (72.62.69.9 -> NEW_IP, or drop to plain `listen 443 ssl`)
cp nginx/*.conf /etc/nginx/conf.d/
sed -i 's/72\.62\.69\.9:/NEW_IP:/g' /etc/nginx/conf.d/{nexis.revsports.ca,v2-subdomains.nexis.revsports.ca,studionexis.com,stg.nexis.revsports.ca}.conf

# 2g. Certs — RE-ISSUE on the new box (DNS-01 works from anywhere, no IP dependency)
certbot certonly -n --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/cloudflare-studionexis.ini --dns-cloudflare-propagation-seconds 30 -d studionexis.com -d '*.studionexis.com' --cert-name studionexis.com
certbot certonly -n --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/cloudflare.ini            --dns-cloudflare-propagation-seconds 30 -d nexis.revsports.ca -d '*.nexis.revsports.ca' --cert-name nexis.revsports.ca-0001
certbot certonly -n --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/cloudflare.ini            --dns-cloudflare-propagation-seconds 30 -d stg.nexis.revsports.ca -d '*.stg.nexis.revsports.ca' --cert-name stg.nexis.revsports.ca
# also the apex-only nexis.revsports.ca.conf references live/nexis.revsports.ca/ — issue that too if used.

# 2h. Start
nginx -t && systemctl enable --now nginx nexis-next nexis-staging
```

## 3. Pre-cutover verification (before touching DNS)
Point your own machine at the new IP with curl `--resolve` and confirm 200s:
```
for h in studionexis.com app.studionexis.com hq.studionexis.com dev-studio.studionexis.com; do
  curl -s -o /dev/null -w "$h %{http_code}\n" --resolve $h:443:NEW_IP https://$h/; done
```

## 4. Cutover (DNS) — the quick, reversible switch
Lower TTLs to 60s a few hours ahead, then flip the A records to `NEW_IP`
(grey-cloud/DNS-only) via each Cloudflare zone:
- `studionexis.com` zone (token `cloudflare-studionexis.ini`): apex `@` + wildcard `*` → NEW_IP
- `revsports.ca` zone (token `cloudflare.ini`): `nexis` + `*.nexis` (and `stg`/`*.stg`) → NEW_IP

Both servers serve identical content during propagation, so there's no hard cutover
moment. Roll back by pointing the A records back to 72.62.69.9.

## 5. After it's confirmed good
- Real tenant **custom domains** (e.g. dealerleads.me) point at the OLD IP by their own
  DNS — update those A records to NEW_IP and re-issue their http-01 certs on the new box
  (`scripts/domain-provisioner.sh` handles this once DNS points here).
- Decommission the old server only after a few days of clean logs + a fresh backup.

> The bundle contains secrets and client data. Keep it 0600, move it only over scp,
> and delete it from both servers once the move is verified.
