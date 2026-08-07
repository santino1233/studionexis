#!/usr/bin/env bash
# certbot renewal deploy hook — reloads nginx after ANY cert renews so freshly
# renewed custom-domain (and wildcard) certs are actually picked up.
# Install as root:
#   cp scripts/nexis-cert-renew-hook.sh /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#   chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
# certbot.timer (already enabled) runs `certbot renew` twice daily; this hook
# fires only when a certificate was actually renewed.
set -e
nginx -t && systemctl reload nginx
