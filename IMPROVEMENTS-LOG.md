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
