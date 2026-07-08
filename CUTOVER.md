# Cutover plan — v2 replaces the old system
Status: DRAFT for owner review. Nothing here runs without an explicit go.

## Where we stand
v2 (this repo, live at new.nexis.revsports.ca) has the working core: signup →
provisioning → trial, auth, clients CRM, class types, schedule, bookings
(credits/waitlist/check-in), POS + orders, products/packages, invoices,
analytics, settings (currency/timezone/policies), public booking pages,
super-admin HQ. The old system (nexis.revsports.ca, /opt/studionexis) still
has features v2 lacks — close these BEFORE cutover (Wave 2 in BACKLOG.md):

1. Team & instructors (staff accounts, instructor schedules) — W1
2. Customer accounts on the booking page (my bookings / my package) — W2
3. Expenses & P&L — W3
4. Notifications (booking confirmations/reminders via email) — W4
5. Promotions & vouchers — W5 (T2; can ship post-cutover)
6. Studio website builder — W6 (T2; public booking page covers the core)
7. Custom domains — W7 (needs the nginx/certbot go-live script port)
8. Stripe subscription billing — W8 (owner-assisted: needs API keys)
9. Payroll/washout, reception KPIs, rentals, loans, equipment — T3 optional
   modules, OFF by default in the old system; port on demand post-cutover.

## Data migration (old Mongo → new Postgres)
Per-tenant script (build + rehearse in Wave 2 as W9):
- tenants ← control DB Tenants (slug, name, plan, status, trial, currency,
  timezone, brand color)
- users ← per-tenant Users (bcrypt hashes carry over if same algorithm —
  verify; else force password reset emails)
- clients ← Clients (contacts, notes, memberSince, lastVisit)
- class types ← ClassBlueprints; sessions ← Scheduling (UTC already)
- packages ← package definitions; client credits ← wallets/purchases
  (creditsLeft, expiry, frozen)
- orders/invoices ← Invoices/Payments (map statuses; keep order numbers)
- products/stock ← Products/MerchandiseSkus
Rehearse on a copy, diff counts per collection/table, owner spot-checks one
studio end-to-end before any real switch.

## Domain switch (the actual cutover day)
1. Freeze old system writes (maintenance banner) — minutes, not hours.
2. Final incremental data sync.
3. nginx: point nexis.revsports.ca + *.nexis.revsports.ca at nexis-next
   (3105). Tenant subdomains: add host-based tenant resolution to v2
   middleware (small, prebuilt in Wave 2 as W10) so <slug>.nexis... maps to
   the tenant like /book/<slug> does today.
4. Old stack stays running on alternate ports for 30 days (instant
   rollback = revert nginx). Mongo backups retained regardless.

## Rollback
Everything is reversible until DNS/nginx flip, and even after: flip nginx
back, un-freeze old system. v2 data created during the window would need
manual reconciliation — keep the freeze window short.

## Owner decisions needed before go
- [ ] Which studios/tenants actually migrate (vs test junk to drop)
- [ ] Stripe keys for billing (or launch with manual/HQ-managed billing)
- [ ] Go date + acceptable freeze window
