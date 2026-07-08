# Studio Nexis v2 — rebuild backlog (feature parity, fresh stack)
Old system = feature source of truth (/opt/studionexis). One slice per
iteration: implement → build → restart nexis-next → verify live at
https://new.nexis.revsports.ca → commit → log → next.

- [x] V1 Feature inventory: crawl the old codebase (controllers, pages) and
      write SPEC.md — every feature/endpoint/flow v2 must reach. Parity list.
- [ ] V2 Data layer: Postgres (docker, new container, own volume) + Prisma
      schema — tenants, users, clients, class types, classes, bookings,
      packages/credits, products, orders/invoices, staff, settings.
- [ ] V3 Auth: Auth.js credentials login, session, tenant scoping by
      subdomain host (middleware), roles (owner/staff/superadmin).
- [ ] V4 Clients CRM: list + profile pages on real data (search, avatars,
      stats, packages, session history).
- [ ] V5 Class types + classes + schedule (week calendar w/ colored chips).
- [ ] V6 Bookings: create/cancel/check-in, waitlist, credit deduction.
- [ ] V7 POS: product/package grid + cart + checkout (cash/at-studio first).
- [ ] V8 Products & Packages management; Invoices list from orders.
- [ ] V9 Analytics: KPI strip + orange area chart + purple donut (reference).
- [ ] V10 Settings + onboarding wizard (studio identity, currency, timezone,
      policies) — simplified from the old 8-step flow.
- [ ] V11 Public tenant booking page + website (light, studio-branded).
- [ ] V12 Signup + tenant provisioning + trial plans; Stripe subscriptions.
- [ ] V13 Super-admin portal (secret host): studios, plans, finances.
- [ ] V14 Cutover plan: data migration from Mongo, domain swap, retire old.
