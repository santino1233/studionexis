#!/usr/bin/env bash
# ============================================================================
# Studio Nexis — custom-domain provisioner (operator / cron, runs as root).
#
# WHAT IT DOES, per tenant with a customDomain, matching lib/domain.ts states:
#   • DNS not pointed here yet        -> PENDING   (keeps checking, no cert)
#   • DNS points elsewhere            -> FAILED    (never provision a cert we
#                                                   don't control the name for)
#   • DNS points here, no cert yet    -> VERIFYING -> issue cert + nginx vhost
#                                                   -> smoke test -> LIVE
#   • Already LIVE                    -> re-check DNS; if it stopped pointing
#                                        here, flip FAILED and DISABLE the vhost
#                                        so the app falls back to the subdomain.
#   • cert / nginx / smoke failure    -> FAILED    (with a short reason)
# It also removes vhosts for domains no longer present in the database.
#
# CERTS: Let's Encrypt via the HTTP-01 webroot challenge, served from a shared
# ACME webroot. certbot writes a standard renewal config, so the existing
# `certbot.timer` renews these automatically alongside the wildcard cert.
#
# INVOCATION:
#   sudo NEXIS_PUBLIC_IP=51.79.226.215 /opt/nexis/scripts/domain-provisioner.sh
#   (cron: every 5 min — see scripts/nexis-domains.cron)
#
# PREREQUISITES (one-time, done by the operator at deploy — NOT by the app):
#   • certbot installed (already present: 2.9.0).
#   • nginx installed and serving :80/:443 for studionexis (already present).
#   • The ACME webroot below must be reachable on :80 for every managed domain —
#     this script writes the port-80 vhost that makes that true.
#   • Run as root (writes /etc/nginx/conf.d and /etc/letsencrypt, reloads nginx).
# ============================================================================
set -uo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
# This server's public IP. Auto-detected so the script survives a migration;
# override with NEXIS_PUBLIC_IP if the box is behind NAT. Must match
# NEXT_PUBLIC_DOMAIN_TARGET_IP in the app's env (default 51.79.226.215).
IP="${NEXIS_PUBLIC_IP:-$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)}"
UPSTREAM="127.0.0.1:3105"
CONF_DIR="/etc/nginx/conf.d"
PREFIX="custom-domain-"
ACME_WEBROOT="/var/www/nexis-acme"
EMAIL="haxkodi@gmail.com"
LOG="/var/log/nexis-domains.log"
# Read tenants straight from the app's Postgres (runs in docker on this box).
PG="docker exec nexis-postgres psql -U nexis -d nexis -tAc"

log() { echo "[$(date '+%F %T')] $*" >> "$LOG"; }

if [ -z "${IP:-}" ]; then log "FATAL: could not determine public IP"; exit 1; fi
mkdir -p "$ACME_WEBROOT/.well-known/acme-challenge"

reload_nginx() { nginx -t >/dev/null 2>&1 && systemctl reload nginx; }

# Escape a value for safe inclusion inside a single-quoted SQL literal.
sql_lit() { printf "%s" "$1" | sed "s/'/''/g"; }

# set_status <tenant_id> <STATUS> [error message]
set_status() {
  local tid="$1" status="$2" msg="${3:-}"
  local errsql="null"
  [ -n "$msg" ] && errsql="'$(sql_lit "$msg")'"
  $PG "UPDATE \"Tenant\" SET policies = jsonb_set(coalesce(policies,'{}'::jsonb), '{domain}',
        jsonb_build_object('status','$status','error',$errsql::text,'checkedAt',to_jsonb(now())::text))
       WHERE id='$(sql_lit "$tid")'" >/dev/null 2>>"$LOG"
}

# resolves_here <domain> -> 0 if an A record equals our IP, else 1.
resolves_here() {
  getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | grep -qx "$IP"
}

# A domain must be shell-inert (no metacharacters) before it can reach a
# certbot/nginx command. Defence in depth — the app validates on save too.
valid_domain() { echo "$1" | grep -Eq '^[a-z0-9][a-z0-9.-]{1,251}[a-z0-9]$' && ! echo "$1" | grep -q '\.\.'; }

write_http_vhost() { # <conf> <server_names>
  cat > "$1" <<EOF
# Managed by domain-provisioner.sh — do not edit by hand.
server {
    listen 80;
    listen [::]:80;
    server_name $2;
    location /.well-known/acme-challenge/ { root $ACME_WEBROOT; default_type "text/plain"; try_files \$uri =404; }
    location / { return 301 https://\$host\$request_uri; }
}
EOF
}

append_https_vhost() { # <conf> <server_names> <cert_dir>
  cat >> "$1" <<EOF
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $2;
    ssl_certificate     /etc/letsencrypt/live/$3/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$3/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    client_max_body_size 64m;
    location / {
        proxy_pass http://$UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
EOF
}

# ── Provision / re-check every domain in the DB ─────────────────────────────
ROWS=$($PG "SELECT id||'|'||\"customDomain\"||'|'||coalesce(policies->'domain'->>'status','NEW')
            FROM \"Tenant\" WHERE \"customDomain\" IS NOT NULL")
DOMAINS_IN_DB=""

while IFS='|' read -r TID DOMAIN STATUS; do
  [ -z "${DOMAIN:-}" ] && continue
  if ! valid_domain "$DOMAIN"; then
    set_status "$TID" "FAILED" "invalid domain"
    log "$DOMAIN: rejected (failed shell-inert validation)"
    continue
  fi
  DOMAINS_IN_DB="$DOMAINS_IN_DB $DOMAIN"
  CONF="$CONF_DIR/$PREFIX$DOMAIN.conf"

  # Normalize legacy statuses to the canonical machine.
  case "$STATUS" in PENDING_DNS) STATUS=PENDING ;; ERROR) STATUS=FAILED ;; esac

  # ── Already LIVE: only re-check that DNS still points here ────────────────
  if [ "$STATUS" = "LIVE" ]; then
    if resolves_here "$DOMAIN"; then
      set_status "$TID" "LIVE"
    else
      # Stop serving it and fall back to the subdomain.
      if [ -f "$CONF" ]; then mv -f "$CONF" "$CONF.disabled" && reload_nginx; fi
      set_status "$TID" "FAILED" "domain no longer points to this server"
      log "$DOMAIN: LIVE -> FAILED (DNS moved away), vhost disabled"
    fi
    continue
  fi

  # ── Not live: check DNS before doing anything ────────────────────────────
  RESOLVED=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1)
  if ! resolves_here "$DOMAIN"; then
    if [ -z "${RESOLVED:-}" ]; then
      set_status "$TID" "PENDING"
      log "$DOMAIN: no A record yet (want $IP)"
    else
      set_status "$TID" "FAILED" "domain points to $RESOLVED, expected $IP"
      log "$DOMAIN: points to $RESOLVED (want $IP) — refusing to provision"
    fi
    continue
  fi

  # DNS is good → mark VERIFYING while we provision.
  set_status "$TID" "VERIFYING"

  # Include www.<domain> when it also points here.
  NAMES="$DOMAIN"; CERT_ARGS="-d $DOMAIN"
  if [ "${DOMAIN#www.}" = "$DOMAIN" ] && resolves_here "www.$DOMAIN"; then
    NAMES="$DOMAIN www.$DOMAIN"; CERT_ARGS="-d $DOMAIN -d www.$DOMAIN"
  fi

  # Ensure a port-80 vhost exists so the ACME HTTP-01 challenge can be served.
  write_http_vhost "$CONF" "$NAMES"
  if ! reload_nginx; then
    rm -f "$CONF"; reload_nginx
    set_status "$TID" "FAILED" "nginx config rejected"
    log "$DOMAIN: nginx -t failed on http vhost, rolled back"
    continue
  fi

  # Issue (or expand) the certificate via webroot. Idempotent.
  if ! certbot certonly --webroot -w "$ACME_WEBROOT" $CERT_ARGS \
        --cert-name "$DOMAIN" --expand --non-interactive --agree-tos -m "$EMAIL" \
        --keep-until-expiring >> "$LOG" 2>&1; then
    set_status "$TID" "FAILED" "certificate issuance failed — is the domain reachable on :80?"
    log "$DOMAIN: certbot failed"
    continue
  fi

  # Add the HTTPS proxy vhost now that the cert exists.
  write_http_vhost "$CONF" "$NAMES"
  append_https_vhost "$CONF" "$NAMES" "$DOMAIN"
  if ! reload_nginx; then
    set_status "$TID" "FAILED" "nginx config rejected after cert"
    log "$DOMAIN: nginx -t failed on https vhost"
    continue
  fi

  sleep 2
  CODE=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$DOMAIN/")
  if echo "$CODE" | grep -Eq '^(200|30[0-9])$'; then
    set_status "$TID" "LIVE"
    log "$DOMAIN: LIVE ($CODE)"
  else
    set_status "$TID" "FAILED" "site answered $CODE after setup"
    log "$DOMAIN: smoke test got $CODE"
  fi
done <<< "$ROWS"

# ── Clean up vhosts for domains removed from the database ────────────────────
for f in "$CONF_DIR/$PREFIX"*.conf "$CONF_DIR/$PREFIX"*.conf.disabled; do
  [ -e "$f" ] || continue
  D=$(basename "$f"); D=${D#$PREFIX}; D=${D%.conf.disabled}; D=${D%.conf}
  if ! echo " $DOMAINS_IN_DB " | grep -q " $D "; then
    rm -f "$f"; reload_nginx
    log "$D: removed (no longer in database)"
  fi
done
