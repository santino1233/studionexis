# Studio Nexis v2 — improvements log
(greenfield rebuild; older history lives in /opt/studionexis/IMPROVEMENTS-LOG.md)

## 2026-07-08 · v2 kickoff: fresh stack scaffolded + live preview
- Next.js 16 + TS + Tailwind v4 at /opt/nexis, deployed to
  https://new.nexis.revsports.ca (systemd nexis-next + nginx vhost).
- Design system from the owner's reference mockups; admin shell (light rail,
  STUDIONEXIS wordmark, pale-orange pills); dashboard page; 12 stub routes.

## 2026-07-08 · V1 Feature inventory (SPEC.md)
- Crawled the old system (42 controllers, ~300 endpoints, 35 admin pages,
  customer + instructor portals) and wrote SPEC.md — the tiered parity list
  (T1 cutover-required, T2 full parity, T3 optional modules) that every
  v2 iteration builds against.

## 2026-07-08 · V2 Data layer live (Postgres + Prisma end-to-end)
- New postgres:16 container (nexis-postgres, 127.0.0.1:5599, own volume).
- Prisma 7 schema: Tenant, User, Client, ClassType, ClassSession, Booking,
  Package, ClientPackage, Product, Order/OrderItem, Expense — with tenant
  scoping, cascade deletes, money as Decimal, booking-status + policy enums.
  (Prisma 7 gotcha: datasource url lives in prisma.config.ts, client needs
  the pg driver adapter.)
- Seeded dev-studio tenant (class types, packages, clients); Clients page is
  the first REAL page — server-rendered from Postgres, reference styling
  (avatars, channel pills, credits, member-since). Verified live.

## 2026-07-08 · V3 Auth live (login → session → tenant scoping)
- Password login: bcrypt hashes, signed JWT session cookie (30d, httpOnly),
  /api/login + /api/logout, reference-styled /login page with error state.
- Middleware protects every app route (static assets excluded); logged-out
  visits bounce to /login; sidebar Sign out wired.
- Tenant now resolved from the session (login sets tenantId) — every page
  query is tenant-scoped. Seeded owner: owner@dev-studio.com.
- Gotcha fixed: behind nginx, route-handler redirects pointed at
  localhost:3105 — now built from X-Forwarded-Host (also added to vhost).
- Verified live end-to-end: redirect-when-logged-out, reject bad password,
  login lands on dashboard, authed pages render, logout locks again.

## 2026-07-08 · V4 Clients CRM (list + add + profile, live)
- Clients list: server-side search (name/phone/email), clickable rows.
- Add-client form (/clients/new): name-only minimum, channel picker,
  notes + private health notes; POST /api/clients → redirects to profile.
- Client profile (/clients/[id]): reference header (avatar, name, inline
  contact row, Sell package / Edit buttons), stat row (member since,
  lifetime value from paid orders, credits left, last visit), health &
  notes card, active packages card, session history table. Tenant-scoped.
- Verified live: search narrows correctly, create → profile renders.

## 2026-07-08 · V5 Class types + schedule week view (live)
- Class Types page: list (color dot, kind, duration, capacity, price in the
  studio currency, session count) + add form with color picker.
- Schedule: Monday-start week view in the STUDIO TIMEZONE — colored class
  chips (type color at 8% tint), time, booked/capacity, instructor first
  name; today highlighted; prev/Today/next week navigation.
- Add-class form: class type, date+time (entered in studio tz, stored UTC —
  verified 18:00 Bangkok → 11:00Z), instructor, spots override, room.
- New tz helpers (src/lib/tz.ts): utcFromZoned / dayKeyInTz / weekDays.

## 2026-07-08 · V6 Booking engine (live, fully verified)
- Session roster page (/schedule/[id]): class header, big booked/capacity
  counter, roster with status pills + Check in / Cancel actions, book-a-
  client panel (auto-detects full → waitlist).
- Booking rules, all transactional: books with a package credit when the
  client has one (credit decremented) else "pay at studio"; full class →
  WAITLIST; cancel restores the credit and PROMOTES the oldest waitlisted
  client (who then pays by their own credit if available); check-in stamps
  the client's last-visit; double-booking blocked by unique constraint.
  (Late-cancel forfeit windows come with the policies iteration.)
- Bookings page: latest reservations across classes with status pills.
- Schedule chips now click through to the roster.
- Verified live: credit deduct → waitlist → cancel/restore/promote →
  check-in → double-book guard, all correct in DB.
