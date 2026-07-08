#!/usr/bin/env bash
# Go-live for a studio's custom domain on Studio Nexis v2.
# Usage: ./connect-domain.sh www.theirstudio.com
# Prereqs: the studio saved the domain in Settings, and their DNS A record
# points at 72.62.69.9. NOT yet exercised against real DNS.
set -euo pipefail

DOMAIN="${1:?usage: connect-domain.sh <domain>}"
IP="72.62.69.9"
CONF="/etc/nginx/conf.d/${DOMAIN}.conf"

echo "→ Checking DNS for ${DOMAIN}…"
RESOLVED=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
if [ "$RESOLVED" != "$IP" ]; then
  echo "✗ ${DOMAIN} resolves to '${RESOLVED:-nothing}', expected ${IP}. Fix DNS first."
  exit 1
fi

echo "→ Writing nginx vhost…"
cat > "$CONF" <<EOF
server {
    listen ${IP}:80;
    server_name ${DOMAIN};
    location / {
        proxy_pass http://127.0.0.1:3105;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }
}
EOF
nginx -t && systemctl reload nginx

echo "→ Issuing certificate…"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m haxkodi@gmail.com --redirect

# VestaCP quirk: certbot writes plain `listen 443 ssl` which never matches.
sed -i "s/listen 443 ssl/listen ${IP}:443 ssl/" "$CONF"
nginx -t && systemctl reload nginx

echo "→ Smoke test…"
sleep 2
CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://${DOMAIN}/")
echo "https://${DOMAIN}/ → ${CODE}"
[ "$CODE" = "200" ] && echo "✓ ${DOMAIN} is live." || echo "⚠ got ${CODE} — check nginx logs."
