# Studio Nexis v2 — feature parity spec
Source of truth: old system at /opt/studionexis (.NET API, 42 controllers /
~300 endpoints, 35 admin pages, customer portal, instructor portal). This is
what v2 must cover before cutover. Tiered: T1 = required for cutover, T2 =
required for full parity, T3 = optional modules (old system ships them OFF
for new tenants — port last or on demand).

## Platform (T1)
- Multi-tenancy: tenant per subdomain of nexis.revsports.ca, resolved by Host;
  apex = marketing + signup (SaasController); custom domains per tenant.
- Roles: owner/admin, staff/receptionist, instructor, customer, super-admin.
- Auth: staff login (AuthController), customer login/register/verify-email/
  reset (CustomerAuthController, 15 ep), per-page access rules (UserAccess,
  ManagementAccess module flags).
- Tenant provisioning on signup: trial plan, seeded admin, module defaults.
- Super-admin portal on secret host (Saas): studio directory, plan/status
  control, trial extension, mark-paid, suspend; cross-tenant finances.
- Per-studio settings: identity (name/logo), currency (drives ALL money
  display), timezone (drives scheduling), language, brand colors.

## Studio operations (T1)
- Class Types (ClassBlueprint, 7 ep): name, color, duration, capacity,
  group/private, pricing.
- Scheduling (30 ep): create/edit/cancel sessions, recurring schedules, week
  calendar, instructor assignment, rooms/locations, conflicts.
- Bookings (14 ep): book/cancel/check-in, waitlist, late-cancel policy
  windows per payment method, reschedule grace (per-account monthly cap).
- Clients CRM (Client 5 + Retention): profiles, contact channels (phone/
  email/Zalo), medical notes, membership stats, session history, search.
- Packages & credits (PackagePurchase, Wallet 6 ep): class-credit packages,
  expiry, freeze, balance; lifetime value.
- POS: sell packages/products/drop-ins; payment methods (cash, transfer,
  online); receipts.
- Products & merchandise (Product 6, MerchandiseSku 6, StockReceipt 3):
  catalog, SKUs, stock receiving.
- Invoices (9 ep): list, detail, status; Payments (6 ep).

## Money & insights (T1)
- Accounting (26 ep): expenses, expense categories, P&L.
- Analytics (18 ep): revenue/finance KPIs, daily trends, occupancy,
  customer metrics, channel/team breakdowns, month compare.
- Dashboard: KPI cards, business summary, getting-started checklist,
  demo-data seed/clear.

## Team (T2)
- Staff (13 ep) + Instructor (16 ep): profiles, roles, schedules,
  instructor portal (their classes, check-ins).
- Payroll & splits ("washout"): instructor pay rules, periods, payouts.
- Reception KPIs (kpi-bonus): receptionist scorecards/bonuses.

## Growth (T2)
- Promotions (7 ep), Vouchers (7 ep, batches), Referrals/Partners (4 ep).
- Notifications: rules engine (NotificationRule), Push (7 ep), Reminders,
  email templates.
- Onboarding wizard (8-step) + AI website builder: style presets, tones,
  publish tenant website (/site) with photos, pricing, FAQ, map.
- Customer portal: booking page, my-bookings, my-package, account,
  checkout, packages catalog, booking policy page.
- Tracking/analytics of site visitors (Tracking, MetaTracking).

## Optional modules (T3 — off by default in old system)
- Studio Rentals (8 ep), Owner loans (OwnerLoan 5, Owner 4), Equipment (6),
  Audit log, Customer data migration tooling (CustomerMigration), DevSeed.

## Non-functional carryovers
- All money formatted from studio currency setting; storage UTC, display in
  studio timezone; PATCH-merge semantics for settings; light-first UI from
  the owner's reference mockups; VestaCP nginx quirks (see CLAUDE.md).
