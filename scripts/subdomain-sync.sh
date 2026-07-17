#!/bin/bash
# Sync v2 tenant slugs into the nginx exact-server_name carve-out so every
# new studio's subdomain serves v2 with the wildcard cert automatically.
set -euo pipefail
CONF=/etc/nginx/conf.d/v2-subdomains.nexis.revsports.ca.conf
export PGPASSWORD=$(grep NEXIS_PG_PASSWORD /opt/nexis/.env.local.secrets | cut -d'"' -f2)
SLUGS=$(docker exec nexis-postgres psql -U nexis -d nexis -tAc "SELECT slug FROM \"Tenant\" ORDER BY slug" | tr -d ' ' | grep -v '^$' | sed 's/$/.nexis.revsports.ca/' | tr '\n' ' ')
NAMES="app.nexis.revsports.ca hq.nexis.revsports.ca new.nexis.revsports.ca $SLUGS"
NAMES=$(echo $NAMES | xargs)
CURRENT=$(grep -m1 'server_name' $CONF | sed 's/^\s*server_name //; s/;//' | xargs)
if [ "$NAMES" != "$CURRENT" ]; then
  sed -i "s|^\(\s*\)server_name .*;|\1server_name $NAMES;|" $CONF
  nginx -t >/dev/null 2>&1 && systemctl reload nginx && echo "$(date -Is) synced: $NAMES" >> /var/log/nexis-subdomains.log
fi
