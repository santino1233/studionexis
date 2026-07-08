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

## 2026-07-08 · V7 Point of Sale (live, fully verified)
- POS page per the reference: tappable catalog tiles (packages = orange
  tinted icon, products = blue, price + credits/stock meta) with a
  right-hand cart — client picker, quantity lines, cash/transfer/card
  toggle, big Charge button, success banner with order number.
- Checkout API, fully transactional and server-priced (client can never
  set prices): sequential order numbers per studio, order + line items,
  package purchases mint client credits with expiry, product sales
  decrement stock. Guards: insufficient stock, package without a client.
- Verified live: mixed cart charged correctly (45 + 2×2.50 = 50.00), Ava
  received 3 credits, stock 20→18, both guards rejected bad carts.

## 2026-07-08 · V8 Products & Packages management + Invoices (live)
- Products & Packages page: packages table (credits, validity, price,
  units sold) + add form; retail products table with stock-level pills
  (green/low-orange/out-red) + add form. New items appear in POS instantly.
- Invoices page: every order — number, client link, line-item summary,
  method, total, status pill, date in studio tz — plus a Collected total.
- Verified live: added a package + product through the forms, both listed;
  invoices shows order #1 (Ava, $50.00) from the V7 test sale.

## 2026-07-08 · V9 Analytics (reference KPIs + charts, live)
- KPI strip with the reference tinted-icon cards: revenue (orange),
  bookings (purple), avg occupancy (green, booked/capacity across the
  month's sessions), new clients (blue) + secondary strip (classes held,
  packages sold, orders, credits owed = outstanding liability).
- Orange area chart: revenue per day of month (server-rendered SVG with
  gradient fill, gridlines) — no chart library, zero JS weight.
- Purple-led donut: revenue by kind (packages/merch/drop-ins) with center
  total and legend; graceful empty state.
- Month navigation (← July 2026 →) computed in the studio timezone.
- Verified live: all 4 KPI cards, $50 revenue, both charts render, June
  shows the empty state.

## 2026-07-08 · V10 Settings + onboarding (live)
- Settings: Studio identity card (name, currency, timezone, brand color) +
  Booking policies card (per-kind free-cancel windows, waitlist toggle)
  stored as a MERGED json blob (never replaced wholesale — old system's
  PATCH-replace bug class avoided by design).
- Per-studio currency proven end-to-end: switching to EUR re-rendered all
  POS/analytics/invoice money as € instantly (then reverted to USD).
- /welcome: simplified one-page guided setup (identity → first class type →
  first package, blank sections skip) replacing the old 8-step wizard.
- Dashboard is now fully real: getting-started checklist derived from
  actual data (each item links to its fix), KPI row + Business Summary
  computed from orders/bookings/sessions in the studio timezone.
- Process note: a syntax error shipped mid-iteration briefly 502'd the
  preview because I restarted on a failed build — rule now: never restart
  unless the build exited 0.

## 2026-07-08 · V11 Public booking page (live)
- /book/<studio> — no login needed, studio-branded (name, initial mark,
  brand color drives buttons/accents), next 7 days of classes grouped by
  day with spots-left pills, price/duration/instructor per class.
- Inline booking: name + phone/email → matches an existing client by
  contact info or creates one (channel=website), uses their package credit
  if they have one, waitlists full classes. Friendly success/waitlist/
  error banners. Suspended studios and bad slugs 404.
- Middleware now whitelists /book + /api/public; admin stays locked.
- Verified live: anon page 200 + classes listed, booking created a
  "website" client, duplicate + missing-contact guards fire, admin still
  redirects anonymously.

## 2026-07-08 · V12 Signup + tenant provisioning + trials (live)
- /signup (public): studio name, owner, email, password → transactionally
  creates the tenant (unique slug with collision suffix -2, -3…), owner
  account, 14-day trial → auto-login → lands on /welcome guided setup.
- Trial/plan banner in the admin shell: days-left for trials, warnings for
  past-due/suspended. Login ↔ signup cross-links.
- Verified live: provisioned "Sunrise Yoga" end-to-end — TRIAL/starter row,
  auto-login, tenant-scoped (sees zero clients; dev-studio data invisible),
  its public booking page live at /book/sunrise-yoga immediately, slug
  collision produced sunrise-yoga-2.
- Stripe subscriptions: deferred to owner-assisted (needs API keys).

## 2026-07-08 · V13 Super-admin Mission Control (live, secret path)
- /hq/<secret> (secret in .env HQ_PATH; creds in .env.local.secrets,
  git-ignored): platform KPIs (studios, trials, GMV across all studios,
  end clients) + studio directory (status pill, trial end, clients/team/
  orders counts) with actions: +7d trial, mark Paid, Suspend, Restore.
- SUPERADMIN role: platform user with no tenant; login routes them to HQ.
  Studio owners and wrong secrets both get 404 (page hides, not 403).
- Suspension has teeth: suspended studio's public booking page 404s
  immediately (admin banner shows suspended notice).
- Verified live: superadmin login → HQ lists all studios; owner blocked;
  suspend → public page dead; extend → TRIAL until +7d.

## 2026-07-08 · V14 Cutover plan drafted — core rebuild backlog COMPLETE
- CUTOVER.md: gap list, per-entity Mongo→Postgres migration approach,
  freeze/sync/nginx-flip procedure with 30-day instant rollback, and the
  three decisions only the owner can make (which studios migrate, Stripe
  keys, go date). Nothing executes without an explicit go.
- V1–V14 all done. Seeded Wave 2 (W1–W10): the parity gaps that should
  close before cutover. Loop continues into W1.

## 2026-07-08 · W1 Team & instructor accounts (live, role-gated)
- Team page: member list (role pill, classes taught, active status) +
  owner-only add-member form (staff or instructor, temp password) and
  deactivate/reactivate (deactivated members cannot log in).
- Role gates in middleware: instructors are redirected away from money/
  admin pages (POS, products, invoices, analytics, settings, billing,
  team) to the schedule; staff keep operational access; only owners
  manage the team (API enforces, not just UI).
- Instructors appear in the add-class instructor dropdown automatically.
- Verified live: add → login as instructor → blocked from POS, allowed on
  schedule → in dropdown → deactivate blocks login → API rejects
  instructor trying to add members.

## 2026-07-08 · W2 Customer accounts on the public page (live)
- /book/<slug>/me: sign-in + create-account (password on the Client;
  registering with the phone/email you book with links your existing
  history automatically). 90-day customer session, separate cookie from
  staff auth. "My account" link on the booking page.
- Portal shows credits (per package, expiry) and upcoming bookings with
  status; Cancel button enforces the studio's cancellation-policy window
  SERVER-SIDE (group/private hours from Settings) — inside the window the
  portal refuses and shows "call the studio"; outside it, cancel restores
  the credit and promotes the waitlist, same engine as staff cancels.
- Verified live: register→linked to existing client, portal lists data,
  out-of-window cancel OK, in-window cancel refused (BOOKED and WAITLIST),
  wrong password rejected.
- Fix en route: Prisma client types were stale after the migration —
  explicit `prisma generate` now part of the schema-change routine (build
  failed cleanly; no bad deploy thanks to the build-gate rule).

## 2026-07-08 · W3 Expenses & P&L (live)
- Expenses & P&L page (new sidebar item under Team & Insights): month nav,
  P&L strip (Revenue − Expenses = Profit, green/red), expense table with
  delete, quick add form (8 categories, date, note), by-category bars.
- Instructors blocked (middleware + API). Zero-amount guard.
- Verified live: 50.00 revenue − 17.75 expenses = 32.25 profit rendered,
  category bars present, guards firing.

## 2026-07-08 · W4 Email notifications (live; SMTP-ready no-op)
- Mailer (nodemailer): without SMTP env vars every send is logged in the
  new EmailLog table as "skipped" — flip on real email later with just
  SMTP_HOST/PORT/USER/PASS/FROM + restart, zero code changes.
- Booking confirmations: public bookings with an email get a confirmation
  (or waitlist notice) with a manage-booking link.
- Reminders: /api/cron/reminders (CRON_TOKEN-guarded, hit hourly by
  /etc/cron.d/nexis-reminders) emails clients whose class starts within
  24h; remindedAt stamp makes it idempotent.
- Verified live: confirmation logged on booking, reminder run reminded 1
  then 0 on rerun, bad token 403. (Middleware initially swallowed the
  cron route — whitelisted /api/cron, it has its own token guard.)

## 2026-07-08 · W5 Vouchers & promotions (live)
- Voucher codes: % or fixed-amount off, max uses, optional expiry; managed
  from Products & Packages (create form + usage table). Codes are unique
  per studio, normalized to UPPERCASE.
- POS cart has a voucher field; validation + consumption happen INSIDE the
  checkout transaction (server-side prices + server-side discount, atomic
  usedCount). Success banner shows amount charged and amount saved.
- Orders store discount + voucher link for reporting.
- Verified live: 10% code took 2.50→2.25, usage 1/2, third use rejected
  ("fully used"), invalid code rejected, management card renders.

## 2026-07-08 · W6 Public studio website (live)
- /s/<studio>: brand-color hero (tagline + about + Book CTA), next-3-days
  class strip, package pricing cards, Find-us block (address, phone,
  Instagram, hours). Sections hide when empty; suspended studios 404.
- Settings → "Your website" card edits it all (merged JSON on the tenant)
  with a "View my website" link.
- Verified live: saved content renders on the public page anonymously.
  (Gotcha: lucide-react dropped brand icons — Instagram → AtSign.)

## 2026-07-08 · W7 Custom domains (live; go-live script pending real DNS)
- Settings → Custom domain card: save your own domain (validated hostname,
  uniqueness across studios, base-domain blocked, clearable) with plain-
  English DNS steps (A record → 72.62.69.9).
- Middleware: requests arriving on a foreign Host serve that studio's
  website at "/" (rewrite → /s/~host); booking + portal + public APIs all
  resolve tenants by slug OR custom domain, and redirects stay on the
  customer's domain via X-Forwarded-Host.
- scripts/connect-domain.sh: DNS check → nginx vhost (VestaCP listen-IP
  quirk handled) → certbot → smoke test. Syntax-checked; needs a REAL
  domain pointing at the server for a live dry run (owner-assisted).
- Verified via Host-header simulation: custom host served the studio site,
  unknown host 404, invalid/duplicate domains rejected, base domain
  unaffected. Test domain cleared after verification.

## 2026-07-08 · W9 Migration script (ready; rehearsal awaits owner go)
- scripts/migrate-tenant.ts: migrates ONE studio old→v2. Reads old Mongo
  READ-ONLY (control Tenants + per-tenant Users/Clients/ClassBlueprints/
  CalendarSessions/Attendances/Waitlist/Products/ClientPackages/Invoices/
  Expenses — collection names + field shapes taken from the old C#
  entities), maps to v2 Postgres with id-mapping, role/status mapping,
  credit balances, bcrypt hashes carried over, --wipe for clean reruns,
  per-table counts printed for diffing.
- Parse-tested + typechecked clean. LIVE REHEARSAL NOT RUN: the safety
  classifier blocked reading the production Mongo from the agent loop —
  needs the owner to say "run the migration rehearsal on wizard-test".
- W8 (Stripe) marked owner-blocked (needs API keys).
