# Studio Nexis — environments & staging

Two fully separate environments run on this server, sharing nothing but the
Postgres **container** (they use different **databases**).

| | Live (prod) | Staging |
|---|---|---|
| Base domain | `nexis.revsports.ca` | `stg.nexis.revsports.ca` |
| Hosts | `nexis` · `app.` · `hq.` · `<slug>.` | `stg` · `app.stg` · `hq.stg` · `<slug>.stg` |
| Code | `/opt/nexis` (branch `main`) | `/opt/nexis-staging` (branch `staging`) |
| Service | `nexis-next` (:3105) | `nexis-staging` (:3106) |
| Database | `nexis` | `nexis_staging` (same container `nexis-postgres`) |
| Nginx | `conf.d/nexis.revsports.ca.conf` + `v2-subdomains…` | `conf.d/stg.nexis.revsports.ca.conf` |
| TLS | `*.nexis.revsports.ca` | `*.stg.nexis.revsports.ca` (Cloudflare DNS-01) |
| Email/SMS | as configured | **disabled** (no SMTP/Twilio in staging `.env`) |

The only per-environment difference in code is the base domain, read from
`NEXT_PUBLIC_BASE_DOMAIN` via `src/lib/config.ts` (unset → prod default).

## Workflow: build on staging, promote to live

1. Do feature work on the **`staging`** branch, push it.
2. Deploy to staging and test on `https://stg.nexis.revsports.ca`:
   ```
   nexis-deploy-staging.sh
   ```
3. When it's approved, promote to live (merges `staging` → `main`, deploys prod):
   ```
   nexis-deploy-prod.sh
   ```

Live is never touched until step 3.

## Nightly data refresh (one-way: live → staging)

`/usr/local/bin/nexis-sync-staging.sh` runs daily at **04:00** (`/etc/cron.d/nexis-staging-sync`).
It wipes `nexis_staging`, restores a fresh copy of live data + uploads, and
restarts staging. It only ever **reads** from live (pg_dump) — staging can never
write to live.

Consequences:
- Any test data you create in staging is **wiped every night**.
- After a refresh, staging has *live's* schema. If the `staging` branch has
  in-progress migrations, re-run `nexis-deploy-staging.sh` to re-apply them.

## Rollback / ops

- Staging is disposable: `nexis-sync-staging.sh` rebuilds it from live at any time.
- Prod DB backups: `/opt/nexis/scripts/backup-db.sh` (nightly, 7-day rotation).
