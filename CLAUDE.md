# Studio Nexis v2 — greenfield rebuild

Full from-scratch rebuild of Studio Nexis (studio-management SaaS) on a fresh
stack, per owner mandate: "take all the features and start a fresh code stack."

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 (@theme tokens in
src/app/globals.css) · lucide-react · (planned: Postgres + Prisma, Auth.js,
Stripe). Node 22, npm.

## Deployment
- systemd: nexis-next.service → `next start -p 3105` (3100 is taken by docker)
- nginx: /etc/nginx/conf.d/new.nexis.revsports.ca.conf → https://new.nexis.revsports.ca
  (VestaCP: vhosts MUST use `listen 72.62.69.9:80/443`; wildcard cert lives at
  /etc/letsencrypt/live/nexis.revsports.ca-0001/ — the non-0001 cert is apex-only)
- Deploy = `npm run build && systemctl restart nexis-next`

## Rules
- The OLD system in /opt/studionexis stays live and untouched until v2 reaches
  parity. Never break it. Feature source of truth = its codebase.
- Design source of truth = owner's reference mockups (light SaaS: white rail,
  pale-orange active pills, STUDIO+NEXIS wordmark, 30px Manrope titles,
  tinted-icon KPI cards, airy tables). Tokens already in globals.css.
- Light-first. No dark-mode default.
