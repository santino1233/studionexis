#!/usr/bin/env bash
# Automatic custom-domain provisioning for Studio Nexis v2.
# Runs from cron every 5 minutes as root.
#
# For every tenant with a customDomain:
#   DNS not pointed at us yet  -> status PENDING_DNS (keeps checking)
#   DNS ok                     -> nginx vhost + Let's Encrypt cert -> LIVE
#   Anything fails             -> status ERROR with a short message
# Also removes vhosts for domains no longer in the database.
set -uo pipefail

IP="72.62.69.9"
UPSTREAM="127.0.0.1:3105"
CONF_DIR="/etc/nginx/conf.d"
PREFIX="custom-domain-"
LOG="/var/log/nexis-domains.log"
PG="docker exec nexis-postgres psql -U nexis -d nexis -tAc"

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

set_status() { # tenant_id status message
  local msg=${3:-}
  $PG "UPDATE \"Tenant\" SET policies = jsonb_set(coalesce(policies,'{}'::jsonb), '{domain}', jsonb_build_object('status','$2','error',$([ -n "$msg" ] && echo "'\''$msg'\''" | tr -d "\\\\" || echo null)::text,'checkedAt',to_jsonb(now()))) WHERE id='$1'" >/dev/null
}

reload_nginx() { nginx -t >/dev/null 2>&1 && systemctl reload nginx; }

# ── Provision / re-check every domain in the DB ─────────────────────────
ROWS=$($PG "SELECT id||'|'||\"customDomain\"||'|'||coalesce(policies->'domain'->>'status','NEW') FROM \"Tenant\" WHERE \"customDomain\" IS NOT NULL")
DOMAINS_IN_DB=""
while IFS='|' read -r TID DOMAIN STATUS; do
  [ -z "${DOMAIN:-}" ] && continue
  DOMAINS_IN_DB="$DOMAINS_IN_DB $DOMAIN"
  [ "$STATUS" = "LIVE" ] && continue

  RESOLVED=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1)
  if [ "$RESOLVED" != "$IP" ]; then
    set_status "$TID" "PENDING_DNS"
    log "$DOMAIN: DNS -> '${RESOLVED:-none}' (waiting for $IP)"
    continue
  fi

  # Cover www.<domain> too when it also points at us
  NAMES="$DOMAIN"
  CERT_ARGS="-d $DOMAIN"
  if [ "${DOMAIN#www.}" = "$DOMAIN" ]; then
    WWW="www.$DOMAIN"
    if [ "$(getent hosts "$WWW" | awk '{print $1}' | head -1)" = "$IP" ]; then
      NAMES="$DOMAIN $WWW"
      CERT_ARGS="-d $DOMAIN -d $WWW"
    fi
  fi

  CONF="$CONF_DIR/$PREFIX$DOMAIN.conf"
  if [ ! -f "$CONF" ]; then
    cat > "$CONF" <<EOF
server {
    listen $IP:80;
    server_name $NAMES;
    location / {
        proxy_pass http://$UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
}
EOF
    if ! reload_nginx; then
      rm -f "$CONF"; reload_nginx
      set_status "$TID" "ERROR" "server config failed"
      log "$DOMAIN: nginx config failed, rolled back"
      continue
    fi
  fi

  NEED_CERT=0
  if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    NEED_CERT=1
  elif echo "$NAMES" | grep -q www. && ! openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" -noout -text | grep -q "www.$DOMAIN"; then
    # cert exists but www was pointed later — expand it, and make sure the
    # vhost answers for www so the challenge can pass
    NEED_CERT=1
    sed -i "s/server_name $DOMAIN;/server_name $NAMES;/g" "$CONF"
    reload_nginx
  fi
  if [ "$NEED_CERT" = "1" ]; then
    if ! certbot --nginx $CERT_ARGS --expand --non-interactive --agree-tos -m haxkodi@gmail.com --redirect >> "$LOG" 2>&1; then
      set_status "$TID" "ERROR" "certificate issuance failed - is the domain reachable?"
      log "$DOMAIN: certbot failed"
      continue
    fi
    # VestaCP quirk: certbot writes plain `listen 443 ssl` which never matches
    sed -i "s/listen 443 ssl/listen $IP:443 ssl/" "$CONF"
    reload_nginx
  fi

  sleep 2
  CODE=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$DOMAIN/")
  if [ "$CODE" = "200" ]; then
    set_status "$TID" "LIVE"
    log "$DOMAIN: LIVE ✔"
  else
    set_status "$TID" "ERROR" "site answered $CODE after setup"
    log "$DOMAIN: smoke test got $CODE"
  fi
done <<< "$ROWS"

# ── Clean up vhosts for removed domains ────────────────────────────────
for f in "$CONF_DIR/$PREFIX"*.conf; do
  [ -e "$f" ] || continue
  D=$(basename "$f" .conf); D=${D#$PREFIX}
  if ! echo " $DOMAINS_IN_DB " | grep -q " $D "; then
    rm -f "$f"; reload_nginx
    log "$D: removed (no longer in database)"
  fi
done
