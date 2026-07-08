# Studio Nexis v2 — rebuild backlog (feature parity, fresh stack)
Old system = feature source of truth (/opt/studionexis). One slice per
iteration: implement → build → restart nexis-next → verify live at
https://new.nexis.revsports.ca → commit → log → next.

- [x] V1 Feature inventory: crawl the old codebase (controllers, pages) and
      write SPEC.md — every feature/endpoint/flow v2 must reach. Parity list.
- [x] V2 Data layer: Postgres (docker, new container, own volume) + Prisma
      schema — tenants, users, clients, class types, classes, bookings,
      packages/credits, products, orders/invoices, staff, settings.
- [x] V3 Auth: Auth.js credentials login, session, tenant scoping by
      subdomain host (middleware), roles (owner/staff/superadmin).
- [x] V4 Clients CRM: list + profile pages on real data (search, avatars,
      stats, packages, session history).
- [x] V5 Class types + classes + schedule (week calendar w/ colored chips).
- [x] V6 Bookings: create/cancel/check-in, waitlist, credit deduction.
- [x] V7 POS: product/package grid + cart + checkout (cash/at-studio first).
- [x] V8 Products & Packages management; Invoices list from orders.
- [x] V9 Analytics: KPI strip + orange area chart + purple donut (reference).
- [x] V10 Settings + onboarding wizard (studio identity, currency, timezone,
      policies) — simplified from the old 8-step flow.
- [x] V11 Public tenant booking page + website (light, studio-branded).
- [x] V12 Signup + tenant provisioning + trial plans; Stripe subscriptions.
- [x] V13 Super-admin portal (secret host): studios, plans, finances.
- [x] V14 Cutover plan: data migration from Mongo, domain swap, retire old.

## Wave 2 — close the parity gaps before cutover (see CUTOVER.md + SPEC.md)
- [x] W1 Team: staff/instructor accounts (invite, roles), instructor list
      page, assignable in schedule; instructors see their own classes.
- [x] W2 Customer accounts on the public page: magic-link or password login,
      my-bookings (cancel within policy window), my-credits.
- [x] W3 Expenses & P&L: expense entry + categories, monthly P&L view
      (revenue from orders − expenses).
- [x] W4 Email notifications: booking confirmation + reminder (SMTP env),
      graceful no-op without credentials.
- [x] W5 Promotions & vouchers (discount codes at POS/public checkout).
- [x] W6 Studio website: simple public studio page (about, photos, pricing)
      layered on the booking page.
- [x] W7 Custom domains: tenant domain field + connect script (nginx+certbot).
- [ ] W8 Stripe subscription billing (OWNER: needs API keys).
- [ ] W9 Migration script old Mongo → Postgres + rehearsal on a copy.
- [ ] W10 Host-based tenant resolution (<slug>.nexis.revsports.ca) behind a
      flag, for cutover day.
