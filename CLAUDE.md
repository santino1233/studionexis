# Studio Nexis v2 — greenfield rebuild

Full from-scratch rebuild of Studio Nexis (studio-management SaaS) on a fresh
stack, per owner mandate: "take all the features and start a fresh code stack."

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 (@theme tokens in
src/app/globals.css) · lucide-react · (planned: Postgres + Prisma, Auth.js,
Stripe). Node 22, npm.

## Deployment
- Domain: **studionexis.com** only (nexis.revsports.ca was scaffolding, retired 2026-07-22).
  The base domain is env-driven via `NEXT_PUBLIC_BASE_DOMAINS` (src/lib/config.ts) —
  NEVER hardcode a domain in code, docs or scripts; derive it from config.
- LIVE: systemd nexis-next.service → `next start -p 3105`, /opt/nexis (branch `main`),
  nginx conf.d/studionexis.com.conf, wildcard cert /etc/letsencrypt/live/studionexis.com/
- STAGING: systemd nexis-staging.service → `-p 3106`, /opt/nexis-staging (branch `staging`),
  nginx conf.d/stg.studionexis.com.conf, database `nexis_staging`. See STAGING.md.
  (VestaCP: vhosts MUST use `listen 72.62.69.9:80/443`)
- Workflow: build on **staging** first (`nexis-deploy-staging.sh`), promote to live only
  when the owner approves (`nexis-deploy-prod.sh`). Never restart on a failed build.

## Rules
- The OLD system in /opt/studionexis stays live and untouched until v2 reaches
  parity. Never break it. Feature source of truth = its codebase.
- Design source of truth = owner's reference mockups (light SaaS: white rail,
  pale-orange active pills, STUDIO+NEXIS wordmark, 30px Manrope titles,
  tinted-icon KPI cards, airy tables). Tokens already in globals.css.
- Light-first. No dark-mode default.

## Twilio SMS (framework live; creds owner-gated)
Env to activate real sending: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
TWILIO_FROM (in .env, then systemctl restart nexis-next). Optional
TWILIO_EST_PRICE (default 0.0083/segment). Economics: pay-as-you-go
credits (tenant.smsBalance), 10% markup on carrier cost (SMS_MARKUP in
src/lib/sms.ts) — deducted at send (estimate), reconciled to actual via
/api/twilio/status webhook (CRON_TOKEN-guarded). Top-ups $10/50/100/
custom($5-1000) → PENDING → HQ "Mark paid" credits balance (Stripe later).
Plan-gated (Growth+). Auto-sends: booking confirmations + reminders to
phone-only clients.
