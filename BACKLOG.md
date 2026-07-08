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
- [ ] W8 Stripe subscription billing (OWNER-BLOCKED: waiting on Stripe API keys).
- [x] W9 Migration script old Mongo → Postgres (script ready + typechecked; REHEARSAL OWNER-GATED: reading the live old Mongo was blocked by the safety classifier — needs owner go-ahead to run against wizard-test).
- [x] W10 Host-based tenant resolution (<slug>.nexis.revsports.ca) behind a
      flag, for cutover day.

## Wave 3 — hardening & daily-driver polish (autonomous)
- [x] H1 Nightly Postgres backups (pg_dump cron to /opt/nexis/backups,
      7-day rotation) — currently NO backups of v2 data.
- [x] H2 Schedule: edit/cancel a session from the roster page (cancel
      notifies/restores credits for everyone booked).
- [x] H3 Clients: edit-profile form (the profile button is still a stub).
- [x] H4 Rate limiting on public endpoints (login, signup, public booking,
      customer auth) — basic per-IP throttle.
- [x] H5 Friendly 404/error pages (currently Next defaults).
- [x] H6 Admin mobile pass: sidebar drawer + responsive tables.

## Wave 4 — no dead UI (everything clickable does something)
- [x] N1 Topbar search actually searches clients; "+" adds a class;
      dead bell removed; avatar shows the signed-in user's initial.
- [x] N2 Sidebar: dead dark-mode toggle + fake referral card removed;
      replaced with a live "Your booking page" link (opens /s/<slug>).
- [x] N3 Classes page real: upcoming/past tabs, booked counts, status
      pills, rows link to the roster.
- [x] N4 Plan & Billing real: plan name, trial countdown bar, what's
      included, support contact (Stripe self-serve still owner-gated).

## Wave 5 — port the old system's richness (owner: "carry elements over")
- [x] P1 Old system's studio photography (hero + 10 gallery shots) copied
      as v2 defaults; /s/<slug> now has a photo hero w/ brand overlay and
      an "Inside the studio" gallery.
- [x] P2 Class-type depth: description + difficulty level (form + API +
      shown on the public booking page like the old ClassBlueprints).
- [x] P3 Recurring classes: "repeat weekly for N weeks" on add-class
      (old system had recurring schedules).
- [x] P4 Dashboard depth: Today/Week/Month period toggle on Business
      Summary + wire the sales-mix donut (old dashboard had both).
- [x] P5 Client profile depth: tags, birthday, referral source (old
      Client entity) + show on profile header.
- [x] P6 Settings depth: expense-category editor (old system had custom
      categories per studio).
- [x] P7 Custom photo uploads for hero/gallery (needs media storage —
      currently defaults only).

## Wave 6 — owner requests (2026-07-08 evening)
- [x] O1 Real time-grid week calendar (hour gutter, positioned blocks w/
      class colors, today tint, "now" line) replacing stacked chips.
- [x] O2 Client portal like the original: stat strip (credits, attended,
      member since), packages w/ usage bars + frozen/expired states,
      upcoming w/ policy-aware cancel, session history, account card w/
      change-password (verified incl. wrong-current-password guard).
- [x] O3 Dark mode: admin-scoped (public pages stay studio-branded light),
      light default, sidebar toggle persists, pre-paint script = no flash.

## Wave 7 — subdomain architecture + original-style customer portal
- [x] S1 Host architecture: <slug>.nexis.revsports.ca = customer world
      (/, /book, /packages, /bookings, /my-packages, /account); admin
      HIDDEN there (all admin paths bounce to studio site); admin lives on
      app.nexis.revsports.ca; nginx exact-name carve-outs beat the old
      wildcard so v2 subdomains work TODAY without touching the old stack.
- [x] S2 Customer portal rebuilt to the original's design: tabbed nav,
      Book-a-Class w/ 14-day strip + level filters + next-available-day
      roll-forward + credits widget + one-click member booking; Buy
      Packages w/ dark hero + package cards + reserve(pay-at-studio) flow;
      My Bookings w/ Upcoming/Waitlist/Past tabs + REF numbers + payment
      notes; My Packages w/ dark credit cards + usage tab; My Account w/
      profile stats, editable personal info, security, logout.
- [x] S3 Commerce loop: online reserve → PENDING order → staff "Mark paid"
      in Invoices grants the credits → member one-click booking spends
      them. Verified end-to-end across both hosts.
- [ ] S4 At cutover: flip old wildcard vhost to v2 (middleware already
      handles every subdomain); add per-studio "connect" for more studios
      pre-cutover by appending server_names to v2-subdomains conf.
- [x] S5 Calendar to the original's design: rich blocks (time range, name,
      instructor chip, fill, attendee names when tall), click → right
      detail rail (chips, facts, Edit Session, Check In All, per-attendee
      Arrived/No show/Remove), instructor filter chips, class-type legend,
      today ring + now line. Server-rendered, zero client JS.

## Wave 8 — beta subscription structure (owner spec 2026-07-08)
- [x] B1 Plans in code (src/lib/plans.ts): Starter $36 (500 clients / 10
      staff / 2,000 bookings/mo / Stripe), Growth $49 (1,500 / 20 / 4,000 /
      SMS via Twilio), Scale $75 (unlimited); 7-day trial; annual = 20% off;
      add-ons: SMS credits (PAYG), custom website.
- [x] B2 ENFORCED limits at every door: admin add-client, team add, admin
      booking, public booking (incl. guest-created clients) — friendly
      upgrade messages; HQ can override per-tenant via policies.limits.
- [x] B3 Billing page: usage meters (hot at 85%), monthly/annual toggle,
      three plan cards w/ current-plan + most-popular states, add-ons,
      owner-only plan switching saved to tenant (Stripe checkout attaches
      here when keys arrive; HQ activates paid status meanwhile).
- [ ] B4 OWNER-GATED: Stripe keys → real checkout + webhooks; Twilio creds
      → SMS notifications + PAYG credits.
