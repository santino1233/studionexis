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

## 2026-07-08 · W10 Tenant subdomains behind a flag — WAVE 2 COMPLETE
- <slug>.nexis.revsports.ca now resolves on v2 (/, /book, /book/me →
  that studio's site/booking/portal) behind TENANT_SUBDOMAINS=1. Inert in
  prod: nginx still routes tenant subdomains to the old system until
  cutover; verified via local Host-header simulation + old system intact.
- Wave 2 done except the two owner-gated items: W8 Stripe keys, W9
  migration rehearsal approval. Seeded Wave 3 (hardening): backups,
  session edit/cancel, client edit, rate limits, error pages, mobile.

## 2026-07-08 · H1 Nightly database backups (live + restore-verified)
- scripts/backup-db.sh: pg_dump | gzip to /opt/nexis/backups, 7-day
  rotation; /etc/cron.d/nexis-backup runs it 02:30 nightly, logs to
  /var/log/nexis-backup.log.
- Not just "backup exists" — VERIFIED RESTORE: restored into a scratch DB
  and diffed row counts against live (tenants/clients/bookings/orders all
  matched), then dropped the scratch.

## 2026-07-08 · H2 Manage a class from the roster (live)
- Roster page gains a "Manage this class" card: change spots, room and
  instructor; and a danger-zone "Cancel this class" — transactionally
  cancels every active booking (incl. waitlist) and returns any package
  credits to the clients, then marks the session cancelled (drops off
  schedule + public page).
- Verified live: book-with-credit 8→7, capacity/room update stuck,
  cancel → session CANCELLED, booking CANCELLED, credits back to 8.

## 2026-07-08 · H3 Client editing + H4 rate limiting (live)
- H3: /clients/<id>/edit — full edit form (name, contact, channel, notes,
  private health notes), wired to the profile's Edit button; tenant-scoped.
- H4: per-IP sliding-window rate limits on the public endpoints —
  login 10/min, signup 5/5min, public booking 15/min, customer auth
  15/min → 429 with a friendly message. In-process (single instance);
  swap to Redis if we ever scale out.
- Verified live: edit persisted; 12 rapid bad logins → limited after 10;
  authed traffic unaffected.

## 2026-07-08 · H5 error pages + H6 mobile pass — WAVE 3 COMPLETE
- H5: branded 404 (Take me home) + error page with Try again; verified on
  authed unknown paths and dead public studio links (logged-out unknown
  paths still bounce to login — correct).
- H6: on phones the sidebar becomes a slide-in drawer (hamburger top-left,
  closes on navigation/backdrop); data tables scroll sideways instead of
  crushing. Desktop unchanged. All 13 admin pages 200 after the change.
- AUTONOMOUS BACKLOG EXHAUSTED. Remaining items are owner-gated:
  W8 Stripe keys · W9 migration rehearsal go-ahead · real-domain dry run
  (W7 script) · SMTP credentials (W4) · owner mobile QA on a real device.
  Loop stopping cleanly; nightly agent remains scheduled.

## 2026-07-08 · Wave 4: no dead UI (live)
- Every control in the shell now does something: topbar search filters
  clients, "+" opens add-class, dead bell/dark-mode/referral-card removed,
  sidebar gained a real "Your booking page" link (per-studio slug).
- Classes page rebuilt (upcoming/past, booked counts, links to rosters);
  Plan & Billing rebuilt (plan, trial countdown, inclusions, support).
- Note: migration rehearsal attempted on owner's "continue" — safety
  classifier requires more explicit authorization for reading production
  client data; asked owner directly, no preference given, left parked.

## 2026-07-08 · Wave 5 begins: porting the old system's richness (P1–P3)
- Owner: v2 feels bare-bones vs the old system — carry elements over.
- P1: copied the old system's 2.4MB of studio photography (hero + 10
  gallery shots) as v2 defaults; studio websites now open with a photo
  hero under a brand-tinted gradient + an "Inside the studio" gallery.
- P2: class types got description + difficulty (Beginner→Advanced), shown
  on the public booking page under each class like old ClassBlueprints.
- P3: recurring classes — add-class can repeat weekly up to 12 weeks
  (verified: 4 weekly sessions created on consecutive dates).
- P4–P7 queued (dashboard periods+donut, client tags/birthday/referral,
  expense categories, custom photo uploads).

## 2026-07-08 · P4 Dashboard depth (live)
- Business Summary gained the old system's Today / Week / Month toggle
  (chip buttons); all six tiles (revenue, orders, packages sold, new
  clients, bookings made, classes held) recompute per period in studio tz.
- "What's Driving Revenue" donut is real: sales mix by kind for the chosen
  period with center total + legend (verified $54.50 = sum of orders).
- Getting-started card now hides once all six steps are complete.

## 2026-07-08 · P5 Client profile depth (live)
- Clients gained tags (up to 8, comma-entered, shown as brand pills next
  to the name like the old system's VIP badge) and birthday (cake icon in
  the contact row — birthday lists/automations can build on this).
- Wired through add + edit forms and both APIs; verified live (VIP +
  prenatal pills and "March 14" render on Ava's profile, form prefills).

## 2026-07-08 · P6 Custom expense categories (live)
- Settings gained an "Expense categories" card (comma-edited, up to 20,
  blank = standard list); the expense form uses the studio's own list.
- Merge-safe: saving categories preserved cancel windows + waitlist flag
  in the same policies blob (verified in DB).

## 2026-07-08 · P7 Custom website photos — WAVE 5 COMPLETE
- Settings → "Website photos": upload your own hero (one shot, replaces
  old file) and up to 8 gallery photos (JPG/PNG/WebP ≤5MB) with per-photo
  remove; site falls back to the ported default photography when unset.
- Storage on disk per tenant (/opt/nexis/uploads, git-ignored, now
  included in the nightly backup as a tarball); served via /api/media
  with mime allowlist + basename()-guarded paths.
- Verified live: upload → stored → served → rendered on the site; remove
  works; anon blocked; wrong types rejected; traversal 404s. Test studio
  reset to defaults afterward.

## 2026-07-08 · Wave 6: owner's three asks (calendar, portal, dark mode)
- O1 Schedule redesigned as a true week time-grid: hour gutter, class
  blocks positioned/sized by start+duration in studio tz, color-coded
  with left accent + fill counts, today column tinted, live "now" line.
- O2 Customer portal rebuilt to old-system depth: credits/attended/member
  stat strip, every package with usage progress bar (frozen/expired
  badges), upcoming with policy-aware cancel, 30-session history with
  friendly statuses, account section with change-password (bcrypt-
  verified current password).
- O3 Dark mode for the admin: variable overrides scoped to the admin
  wrapper (public booking/site pages stay light + studio-branded),
  LIGHT default, explicit sidebar toggle persisted in localStorage,
  pre-paint script prevents flash. KPI washes, shadows and lines all
  have dark values.

## 2026-07-08 · Wave 7: subdomain infrastructure + original-style portal
- Infra: studio subdomains live TODAY (dev-studio./sunrise-yoga. via nginx
  exact-name carve-outs; old wildcard untouched); admin hidden on
  app.nexis.revsports.ca; tenant hosts expose ONLY the customer world
  (admin paths redirect to the studio site). Custom domains share the
  same alias map.
- Portal rebuilt to the owner's screenshots of the original system (see
  backlog S2 for the full page list). Members book with ONE CLICK (no
  guest form), guests keep the inline form.
- New commerce loop: customers reserve packages online → studio marks
  paid at the desk (Invoices → Mark paid) → credits activate instantly.
  Full loop verified across both hosts including credit auto-spend.

## 2026-07-08 · Calendar matched to the original (owner screenshot)
- Blocks now carry the original's density: time range, class name in type
  color, instructor mini-avatar chip, booked/capacity, first attendee
  names when the block is tall enough.
- Click a class → right-hand detail rail (like the original's): kind/level
  /Full chips, date/time/instructor/booked facts, Edit Session,
  Check In All, and per-attendee Arrived / No show / Remove controls that
  return you to the calendar (safe `back` param on the action APIs;
  NO_SHOW action added). Instructor filter chips + class-type legend +
  today ring + live now-line. All server-rendered.
- Verified live: panel actions update state and land back on the calendar.

## 2026-07-08 · Wave 8: beta subscription structure (enforced)
- Plans (Starter $36 / Growth $49 / Scale $75, annual −20%, 7-day trial)
  defined in src/lib/plans.ts and ENFORCED: client, staff and monthly
  booking caps block at admin + public doors with upgrade messages; HQ
  can override per tenant via policies.limits (also how enforcement was
  live-verified: caps hit → blocked → removed → flows normal again).
- Billing rebuilt: usage meters, monthly/annual toggle (annual shows
  discounted $28.80/$39.20/$60), plan cards, add-ons (SMS PAYG "coming
  soon", custom website → Settings). Plan choice persists (growth/annual
  verified in DB). Stripe/Twilio wiring awaits owner keys.

## 2026-07-08 · Automatic custom-domain deployment — VERIFIED with a real cert
- scripts/domain-provisioner.sh + /etc/cron.d/nexis-domains (every 5 min):
  pending domains → DNS check → nginx vhost → Let's Encrypt cert →
  listen-IP fix → smoke test → status LIVE in policies.domain; failures
  → ERROR with reason; removed domains → vhost auto-cleanup. Settings
  card shows Waiting for DNS / Live / Problem and stamps PENDING_DNS on
  save. connect-domain.sh superseded.
- END-TO-END PROVEN: real Let's Encrypt cert issued automatically for a
  test hostname (CN=studio-test.nexis.revsports.ca, LIVE in ~30s), then
  auto-cleaned after removal. App-side custom-domain resolution
  re-verified separately (~host path serves the right studio).

## 2026-07-08 · Wave 9: five website templates + design picker
- /s/<slug> is now a template dispatcher over shared SiteData. Five full
  designs: Boutique (cream/serif/editorial), Luxury (near-black/tracked
  uppercase/full-bleed), Minimal (white/huge type/hairlines), Serene
  (sage/arches/airy — default), Bold (brand-drenched/oversized/marquee).
  Every one: hero w/ name+slogan+text, multiple Book-a-Class CTAs to the
  booking page, classes + packages + gallery, contact footer with an
  embedded Google Map (mapEmbedSrc handles share/place/embed links or a
  plain address).
- Settings → Website design: visual template cards, theme-colour swatches
  + custom colour (writes brandColor so the whole customer world matches),
  maps field, one-click ?preview= links for trying templates safely.
- Fixed: tenant-host rewrites dropped query strings (broke previews AND
  the booking day-strip on subdomains).
- Verified live: all five render distinctly on dev-studio subdomain w/
  CTA + map; saved default (serene + sage) persists; picker renders 7/7.

## 2026-07-08 · Template picker fixes (owner report: "stuck on boutique")
- Root cause: clicking a template card gave NO visual feedback (highlight
  was server-rendered only, updated after save+reload) so selection
  appeared stuck. Cards now use peer-checked styling — instant brand
  border + ✓ badge on click, no JS.
- Second bug: the custom colour input shared name="accent" with the
  swatches and could shadow them; renamed to accentCustom with explicit
  precedence (picked swatch wins, else custom colour).
- Verified: bold+custom saved and rendered, swatch precedence correct,
  saved template returns checked on reload.

## 2026-07-08 · REAL custom domain live: dealerleads.me (owner's dry run)
- Owner pointed dealerleads.me at the server and saved it on test-studio;
  the provisioner took it LIVE automatically with a real Let's Encrypt
  cert — the full production path (Settings → DNS → auto-cert → serving
  the studio site + booking) is now proven on a genuine external domain.
- Hardened for www: provisioner now detects www.<domain> pointing at us,
  covers it in server_name AND the certificate (expands existing certs),
  and the resolver matches www↔bare either way. Verified: cert SANs =
  dealerleads.me + www.dealerleads.me, both serve the studio over HTTPS.
- Cron confirmed healthy (18 runs in the last hour).

## 2026-07-08 · Twilio SMS framework (pay-as-you-go, +10% markup)
- Schema: tenant.smsBalance + SmsTopup (PENDING→PAID) + SmsMessage
  (SENT/DELIVERED/FAILED/SKIPPED_* with est+final charges).
- lib/sms.ts: plan gate (Growth+) → credit gate → Twilio REST send with
  status callback; charge = segments × est-rate × 1.10 deducted at send;
  no creds → SKIPPED_NO_TWILIO (activates with env vars only).
- /api/twilio/status webhook: delivery status + reconciles est vs actual
  Twilio price ×1.10, refunds over-estimates and failed sends.
- Top-ups: $10/$50/$100 packs + custom ($5–$1,000) on Billing → PENDING →
  HQ "SMS top-ups awaiting payment" queue → Mark paid credits balance.
- Billing SMS card: balance, usage this month, pending note, packs,
  recent messages w/ per-message charges; Starter sees upgrade prompt.
- Auto-usage: booking confirmations + hourly reminders now SMS clients
  who have a phone but no email.
- VERIFIED: topup→HQ→balance 50; zero-balance send skipped; simulated
  send charged 0.0183 est; webhook (Price −0.0079) reconciled to 0.0087
  final (exact ×1.1) and refunded the difference; bad token 403; billing
  card renders balance 49.9913.

## 2026-07-08 · SMS pricing presentation (owner request)
- No fee/markup language anywhere customer-facing — the marked-up rate is
  simply "the price" (markup stays internal in lib/sms.ts).
- Top-up packs now show estimated message counts ($10 ≈ 1,095 texts,
  $50 ≈ 5,476, $100 ≈ 10,952) + "≈ 109 texts per $1" hint for custom
  amounts, derived from the effective SMS_RATE so estimates always track
  the configured carrier estimate.

## 2026-07-08 · Wave 10 begins (video spec) — X1 session lifecycle
- Watched + transcribed the owner's 9-min recording (VIDEO-SPEC.md).
- X1 shipped: Block this class (striped + 🔒 on calendar, hidden from
  public booking, guest bookings rejected, one-click Unblock), Mark class
  completed (✓ green), "Visible on public booking page" per session
  (hidden = internal-only booking, 🙈 marker), override note, reschedule
  (date/time/duration) from the manage card, Color-by Class/Status
  toggle, status legend. All verified live incl. tz-correct reschedule.

## 2026-07-08 · X2 Studio time blocks (live)
- "🔒 Block time" on the calendar header: date + from/to + reason →
  striped dashed block in the day column, sized to the range (tz-correct:
  12:00–14:30 Bangkok stored 05:00–07:30Z). Clicking the block unblocks
  it (like the original's "click to unblock"). Bad ranges rejected.

## 2026-07-08 · X3 Checkout mini-POS (live, verified)
- Every BOOKED attendee (calendar rail + roster) gets a Checkout button →
  mini-POS page: "Use package credit" (shows their packs, consumes 1,
  no double-spend if booking already used one) OR "Charge for this visit"
  (drop-in price + add merch w/ stock guard + voucher, cash/transfer/
  card) — both create the paper trail (order linked to the booking) and
  mark CHECKED_IN. "✓ Checked out & checked in" toast, exactly like the
  original. UNPAID label on at-studio bookings until settled.
- Verified live: charge path (drop-in 28 + merch 5 − voucher 5 = 28.00
  card, stock −2, order linked) and credit path (credits 7→6), labels
  cleared, guards for no-credits/stock/voucher.

## 2026-07-08 · X4 Instructor earnings & class revenue (live)
- Team page: per-member commission % (owner sets inline).
- Class revenue = drop-in checkout lines for the session + per-class
  value of each package credit spent (pricePaid ÷ pack credits) — the
  original's fractional-value model. Instructor earning = revenue × rate.
- Calendar rail shows both LIVE for scheduled classes; "Mark class
  completed" freezes the figures onto the session (payroll/analytics
  ready). Verified: $28 drop-in + $15 credit value = $43.00 revenue,
  $12.90 at Mia's 30%, frozen on complete, rendered in the rail.

## 2026-07-08 · X5 quick-add client + X6 Week/Day/Month views (live)
- Calendar rebuilt cleanly with Week / Day / Month tabs (original had all
  three): Day = single wide column w/ more attendee names on blocks;
  Month = Monday-first grid, per-day mini class chips w/ fill counts,
  "+n more", every cell clicks through to that day's Day view. Nav
  arrows step by day/week/month per view.
- Rail gained "add attendee": existing-client dropdown + "+ New client
  (quick add)" (name+phone → creates walk-in client AND books them in
  one submit, plan limits enforced). Verified end-to-end.
- Fix en route: missing checkClientLimit import caught by build gate.

## 2026-07-09 — X7: Class blueprint editor (video spec)
- New `/class-types/[id]` editor with General / Pricing / Schedule tabs; class names + "Edit blueprint" on the list link into it.
- Ported the MuscleMapJS body map from the original SoulPilates repo: clickable front/back female SVGs (`src/components/muscle-map/`), selected muscle groups fill in brand color, saved as `ClassType.muscles`.
- General tab: basics, benefits / good-for / tags / equipment (comma lists), per-class hero image upload (kind=classhero in media route).
- Schedule tab: default instructor, valid from/until window, public-by-default toggle, recurring weekly slots (day → time, optional per-slot capacity override) and skip dates (holidays).
- Materialiser (`lib/blueprint.ts`): idempotently creates sessions ~4 weeks ahead in the studio timezone honoring exceptions/validity window; runs on every schedule edit and daily via `/api/cron/materialise` (03:25 cron, token-gated).
- Verified live on dev-studio: slot Wed 07:30 cap 6 → 4 sessions at 07:30 local / cap 6 / public / 45 min; re-add = no dupes, 0 new; exception date not recreated; muscles/benefits/pricing persisted; hero upload served 200; cron 200 with token, 401 without.

## 2026-07-09 — X8: Public class detail page + booking with quantity & payment choice (video spec)
- New public page: `/class/<sessionId>` on studio domains (middleware rewrite) → hero image (or class-color gradient), difficulty/format/tags chips, date-time-instructor-location strip, description, benefits, good-for, read-only muscle map, equipment.
- Booking card: price/person, live spots left, "How many people?" (1–5, capped at spots), payment choice — package credits (members, shows balance), pay at the studio, plus disabled "pay online" / "deposit" stubs that light up with Stripe.
- `Booking.qty`: capacity, rosters, checkout and earnings are now people-aware — schedule rail shows ×N chips, mini-POS charges drop-in × qty, credit checkout consumes qty credits, session revenue counts credit value × qty.
- Studio policy toggle in Settings → Booking policies: "Allow pay at the studio" (default on). Off = credit/online only; guests get pointed at packages; API enforces it (err=pay).
- Verified live on dev-studio: guest booked 3 spots at-studio (6→3 left), overbook qty=4 rejected, member paid 2 spots with credits (2→0, pack linked), 0-credit retry rejected, toggle off blocked at-studio + hid the option, checkout order = 3×$18.50=$55.50, rail revenue $85.50 = drop-ins + credit value.

## 2026-07-09 — X9: Studio-configurable class formats + difficulty labels (video spec — Wave 10 complete)
- Settings → "Class setup": two comma lists — class formats (Mat, Reformer, Barre, Private) and difficulty labels (Beginner…All levels) — stored in the policies blob; defaults apply when blank.
- New `ClassType.format` label; blueprint editor and the add-class form now offer the studio's own formats and difficulty labels (legacy enum values still render nicely); API validates against the configured lists.
- Public booking: difficulty filter is built from the labels the studio actually uses (URL-encoded for spaces), class cards and the class detail hero show format + difficulty chips.
- Verified live on dev-studio: saved "Gentle/Moderate/Athletic/All levels" + "Tower" format, editor offered them, Reformer Flow saved as Reformer/Athletic, bogus difficulty rejected, public list filter + detail chips render the custom vocabulary.

## 2026-07-14 — Y1: Rich website sections on all 5 templates (Wave 11)
- New shared skin-driven section library (src/components/site/sections.tsx): About & philosophy w/ why-us checklist, Classes showcase (auto from blueprints: hero/color, format+difficulty chips, description, benefits, price), Meet the team (instructors, photo or initials), Testimonials (5-star quote cards), FAQ accordion (sensible defaults incl. cancellation window from settings), big Book CTA banner, socials (IG/FB/TikTok) in footers.
- Each template passes its own SiteSkin (colors, serif, radius, dark) so sections match the design — Boutique cream/serif, Luxury black/sharp, Minimal hairline, Serene rounded sage, Bold neon dark.
- SiteData expanded; tenant.website blob now holds philosophy/why/testimonials/faqs/socials/sections-enabled map + per-instructor bios (editors land with Y2 builder). All sections respect the enabled map (default on) — the Y2 builder toggles them.
- Seeded dev-studio with philosophy/why/testimonials; verified all five templates live render philosophy, classes, team, testimonials, FAQ and CTA with real blueprint + instructor data.

## 2026-07-14 — Y2: Mini website builder (Wave 11)
- New admin page /website ("Website" in the sidebar): every site section has a Shown/Hidden toggle and an inline editor — philosophy + why-us lines, up to 3 testimonials, up to 6 FAQ pairs (blank = friendly defaults), contact/hours/map + Instagram/Facebook/TikTok, and per-instructor bios with portrait photo uploads (media kind=teamphoto).
- Automatic sections (classes/schedule/pricing/gallery) show where their data comes from with jump links, plus preview chips for all five templates.
- /api/website merges each section into the tenant.website blob; toggles feed the enabled map added in Y1.
- Verified live: toggle removed/restored the testimonials band on the public site, custom FAQ ("Do you have showers?"), Mia's bio and uploaded portrait all render on dev-studio's site.

## 2026-07-14 — Y3: Staff profile & settings pages (Wave 11)
- New /team/[id] profile (owner-only; team list names link in): contact card (name, login email w/ clash guard, phone), role switch (staff ↔ instructor), password reset (bcrypt, verified by real login), deactivate/reactivate.
- Pay card: monthly base salary + hourly rate (new User columns, Decimal 12,2) — feeds the Y4 payroll report. Commission card shows the current % for instructors; tiered/fixed/per-head modes land with Y4 (schema columns commissionMode/commissionConfig already migrated).
- Instructor stat line: classes taught this month + all-time.
- Verified live on Mia: phone/salary/hourly persisted, new password logs in, duplicate email rejected with error chip.

## 2026-07-14 — Y4: Commission engines + payroll report (Wave 11)
- Four commission modes per instructor (Team → profile → Commission): % of revenue, tiered % by monthly class count (3 tiers + RETROACTIVE toggle), fixed $ per class, per-head $ table (highest matching row applies).
- Earnings engine (lib/earnings.ts) is mode-aware: session financials compute attendees (qty-aware) + instructor's month class count for tiers; "Mark completed" freezes mode-correct figures; calendar rail shows the basis live (e.g. "Instructor earns (8 ppl)").
- New /payroll page (owner, month picker): per member — commission plan chip, classes, taught hours, base salary, hourly pay, commission, total; retroactive tiered plans re-price the whole month at the final tier (shown as "retro N%"); grand total row.
- Verified live on dev-studio: Mia tiered retro (0→20/10→25/100→30) with 7 July classes → chip "retro 20%", commission $143.50 = 20%×$717.50 (frozen $215.25 correctly overridden), hourly $123.75 = 5.5h×$22.50, total $1,067.25; Sofia per-head (1→20/2→30/4→40/6→50): rail shows "(8 ppl)" → $50.00 on a full class; non-retro staff keep frozen sums.

## 2026-07-14 — Y5: Roles, module access & portals (Wave 11 complete)
- New MANAGER role; STAFF is now labelled "Reception". Access matrix in lib/access.ts enforced by middleware AND the sidebar (each role only sees its pages): Admin/owner = everything; Manager = everything except billing, team & payroll; Reception = schedule/clients/POS/products/invoices/dashboard; Instructor = schedule + new My Earnings page.
- Role-aware login landing (instructors → schedule), API hardening (settings/website APIs reject reception+instructor), Team forms offer all three roles with plain-English descriptions.
- /my-earnings (instructor-only): month picker, per-class table (people, class revenue, their cut) + stat cards for classes, commission (retro-aware), base+hourly, total pay.
- Verified live with real logins: Ben (reception) blocked from payroll/settings/website/analytics/team but works the desk; Priya (new manager) gets analytics/settings/website but not payroll/team/billing; Mia (instructor) lands on schedule, sees My Earnings ($143.50 retro-20% + $923.75 base+hourly = $1,067.25 — matches payroll), blocked from clients/POS; sidebars filtered per role.

## 2026-07-14 — Z2: Calendar popups & payment-at-a-glance (Wave 12)
- Checkout is now a POPUP on the calendar (?co=<booking>): shared CheckoutPanel component (credits card + charge card w/ merch + voucher) rendered in an overlay; errors reopen the popup, success closes it with the ✓ toast. Old full page still works for deep links.
- Checked-in but unpaid attendees show a "💳 Take payment" button in the rail (was only available before check-in).
- Click any EMPTY slot on the week/day grid (196 hover-highlighted hour cells) → popup: "➕ Add a class here" (prefilled) or "🔒 Block this hour" (one click).
- "Add Class" is a popup too (?nw=…): class type, date/time (prefilled from the clicked slot), instructor, repeat-weekly, room, and a "Show in the public booking system" toggle — untick = private session (🙈 on the grid, invisible to clients). /api/sessions honors isPublic + back.
- Verified live: slot modal, prefilled add modal, hidden class created via popup absent from public /book, charge-via-popup → CHECKED_IN + cash order + done toast, take-payment on a checked-in booking.

## 2026-07-14 — Z3: Product settings & stock management (Wave 12)
- Product rows are fully editable inline: name, price and exact stock count with Save; separate quick "Restock +N" action; Archive/Restore with an "Archived (N)" view toggle (archived items leave the register and POS).
- Stock chips now flag "Low · N left" (≤5) and "Out of stock". New /api/products/[id] (update/restock/archive/restore, reception allowed, instructors blocked).
- Verified live on dev-studio: price 12→13.50, stock set to 4, restock +10 → 14, archive → appears in archived view, restore → active again.

## 2026-07-14 — Z4: Monthly & yearly memberships (Wave 12)
- Packages now have a Billing setting: one-time pack (unchanged) / monthly membership / yearly membership. Membership = credits reset every period and it auto-renews.
- Purchases (POS + invoice mark-paid) give memberships a one-period expiry; daily 03:35 cron (lib/memberships.ts, /api/cron/renewals) rolls lapsed memberships forward — credits reset, expiry advances one period from the OLD expiry, and a PENDING "membership renewal" order is logged for the desk to collect (Stripe auto-charge takes over when connected). Frozen memberships pause.
- Admin table shows MONTHLY/YEARLY chips, "credits / month", "Auto-renews", price "/mo·/yr"; public packages page shows "$99/month", "12 credits every month", "Renews automatically — cancel anytime".
- Verified live: created $99/mo membership, sold via POS (expiry +1 month), simulated lapse → cron renewed (credits 2→12, period rolled, $99 PENDING renewal order).

## 2026-07-14 — Z5: Settings split into sub-menu categories (Wave 12)
- Settings is now tabbed: General (identity/currency/timezone/brand) · Classes & Policies (class setup + booking policies) · Website (template picker, texts, photos) · Domain (custom domain) · Money (expense categories — Stripe connect lands here with Z6).
- Saving any card returns to the tab you were on (referer-aware redirect in /api/settings).
- Verified live: each tab renders only its cards; policy save from the Classes tab redirected back to ?tab=classes&saved=1.

## 2026-07-14 — Z6: Stripe payments framework (Wave 12) — live the moment keys are added
- Two independent levels:
  · STUDIO: Settings → Money → "Stripe" card — studio pastes its own secret key (validated against the live Stripe API before saving; bad keys rejected). Once connected, the public packages page grows a "Pay online now" button for signed-in members → Stripe Checkout in the studio's currency → success handler verifies the session server-side (no webhook needed), creates a PAID order (method=stripe, unique stripeSessionId = idempotent) and grants the package/membership instantly ("Payment received" banner on My Packages). Disconnect supported. Money goes directly to the studio's Stripe.
  · PLATFORM: with STRIPE_SECRET_KEY env, Plan & Billing buttons switch from "Choose" to "Subscribe —" and create real subscription Checkouts (monthly/annual incl. 20% discount); /api/stripe/webhook (STRIPE_WEBHOOK_SECRET) activates plans on checkout.session.completed and flags PAST_DUE on failed payment / cancellation. Returns 503 until configured.
- New: stripe npm dep, lib/stripe.ts (platform/studio clients, key verification, zero-decimal currency handling), Order.stripeSessionId (unique).
- Verified live: connect card renders; fake key rejected (error=stripekey, nothing stored); simulated connected studio → Pay online button appears and a bad-key checkout degrades to err=stripe banner; disconnect clears config; webhook 503 without keys.
- Follow-up noted: per-class "pay online / deposit" booking options activate next once a studio is genuinely connected.

## 2026-07-14 — Z7: Visitor tracking & website analytics (Wave 12)
- First-party, anonymous page-view pipeline: TrackView beacon on every public page (site templates + all booking pages via CustomerNav) → /api/public/track — 1-year nx_vid cookie, path, UTM/referrer classified into sources (instagram/facebook/tiktok/google/…/direct), device, rate-limited, 6-month retention sweep. No third-party scripts.
- Analytics page gains a "Website visitors" section: LIVE viewers (pulsing, last 5 min), views + unique visitors (7/30 days), booking conversion (website bookings ÷ uniques), views-per-day bar chart, Top sources and Top pages (30 days).
- Verified live: simulated visits from Instagram(mobile)/Google/newsletter-UTM/direct classified correctly in DB; new visitors receive the cookie; analytics section renders all tiles, sources and pages.

## 2026-07-14 — Z8+Z9: Custom paid features + super-admin subdomain portal (Wave 12 complete)
- Z8 CUSTOM FEATURES: Billing → "Custom features" card — studios see their bespoke add-ons (name, $x/mo, Active/Paused) and can request new ones (queued to HQ, capped 20). lib/features.ts hasFeature(tenant, id) gates tenant-only code paths. HQ grants/pauses/removes features with a monthly price; feature MRR counts into platform MRR.
- Z9 HQ PORTAL on hq.nexis.revsports.ca (nginx carve-out + middleware rewrite; secret path still required internally, superadmin login works on the subdomain): dashboard adds MRR KPI (active plans + custom features, annual-aware) and a "New custom-feature requests" review queue; studio names link to a per-tenant drill-down /t/<id> — MRR to us, their revenue (30d/all-time), bookings, clients, site views, plan switcher, trial/suspend controls, custom-feature management, request status workflow, recent orders.
- Verified live: owner request → appeared in HQ queue → granted "Digital waiver forms" $15/mo → visible as Active on the studio's Billing → request marked DONE; hq subdomain login + dashboard + drill-down all 200 with real numbers.

## 2026-07-14 — P1+P2: qty-refund bugfixes + pay-online for classes (Wave 13)
- P1 BUGFIX (money-losing): all three cancel paths (admin booking cancel, client portal cancel, whole-class cancel) refunded exactly 1 credit even when the booking held multiple seats — clients with a ×2 booking lost a credit on cancel. Now refunds booking.qty everywhere; waitlist promotion promotes one waitlisted client per freed SEAT (shared lib/bookings.ts promoteWaitlist). Verified live: cancelling a ×2 credit booking restored 2 credits.
- P2: "Pay online in full" on the class page is real — when the studio has Stripe connected, signed-in members get the option; payment creates a Stripe Checkout (price × people), and the booking + PAID order (dropin line, method=stripe, idempotent stripeSessionId) are created only when the payment confirms; "Paid & booked" banner on My Bookings; cancelled checkouts book nothing. Guests see "sign in to pay online"; studios without Stripe keep the "coming soon" stub. Deposit remains a stub. Verified all reachable states live (full payment run needs a real key).

## 2026-07-14 — P4+P5: dashboard/HQ tiles + membership & seat chips (Wave 13 complete)
- Dashboard gains a "Live on your site" KPI (unique visitors, last 5 min — links to Analytics); HQ adds "Signups this month".
- Membership visibility: client portal package cards show a brand "Renews monthly/yearly" chip; admin client profiles tag membership packs; the admin Bookings list shows ×N seat chips on group bookings.
- Verified live: dashboard + HQ tiles render; Ava's portal shows "Renews monthly"; her admin profile shows the chip; bookings list shows 16 ×2 and 1 ×3 chips.

## 2026-07-15 — Z1: GitHub connected (Wave 12 fully complete)
- Repo github.com/santino1233/studionexis (private, deploy key w/ write access). Full 111-commit history pushed after a secrets audit: no env/secret files ever tracked; the one leak (.hq-path secret segment) neutralized by rotating HQ_PATH and untracking the file (HQ subdomain unaffected). post-commit hook auto-pushes every future commit.

## 2026-07-17 — V1: Calendar depth + "needs completion" pulse (Wave 14)
- The receptionist TODO signal from the old system: any PAST class still SCHEDULED with active attendees pulses (amber ring animation, ⚠ prefix) in week/day/month views, with a legend entry; selecting it shows an amber banner — "check everyone in, take payment, then Mark class completed so the instructor gets paid."
- Denser, bigger grid: hour rows 64→84px, week min-width 840→1060px, attendee names in week blocks (3), counts show at smaller block heights.
- Verified live: 5 real unsettled sessions this week render 18 pulse markers; rail banner present; wider grid served.

## 2026-07-17 — V2: Sell a package inside checkout (Wave 14)
- When the client at checkout has no usable credits, the popup leads with a full-width "Sell a package & use it now" card: pick a package (filtered to the class kind, membership pricing shown), pick cash/transfer/card, one button — creates the PAID package order, grants the ClientPackage (membership-aware expiry), spends qty credits on this class and checks them in atomically.
- Verified live: no-credit client sold "Intro — 3 Classes" $45 cash → CHECKED_IN via package_credit, 2 of 3 credits remaining, order + line attached to the booking; upsell card renders in the calendar popup only when credits are insufficient.

## 2026-07-17 — A1: Public REST API v1 + developer docs with live testing (Wave 15)
- Settings → new API tab: generate/regenerate/revoke a per-studio key (nx_live_…, unique, masked w/ reveal), link to docs. Keys grant full single-studio access; regenerating kills the old key.
- REST API v1 (Bearer auth, 120 req/min/key, uniform error shape): GET /me · GET+POST /clients · GET /clients/:id (profile + active packages) · GET /classes (+/:id, live spotsLeft) · GET+POST /bookings (find-or-create client by contact, credits auto-spent, waitlist when full) · POST /bookings/:id/cancel (qty-aware refund + waitlist promotion) · GET /packages · GET /orders.
- PUBLIC /developers documentation: sticky section sidebar (Introduction / Authentication / Errors & limits / per-resource sections / Make.com & Zapier guide), every endpoint with params table, example response, and a LIVE "Try it" console (key stored in localStorage, real requests, status + timing + pretty JSON). Data-driven endpoint catalogue so docs grow with the API.
- Verified live end-to-end with a generated key: 401 without key, /me, client search, create client (201), list classes, create booking (auto-matched existing client by phone), duplicate → 409, cancel → refund/promotion path, packages incl. membership billing labels, orders; docs page 200 with 12 Try-it consoles.

## 2026-07-17 — V3: Product variants with per-variant stock (Wave 14)
- New ProductVariant model (label, optional price override, own stock). Products page: per-product "Variants" expander — add/edit/remove sizes/colours/packs inline; product stock chip sums variant stock and shows the variant count.
- Checkout mini-POS merch is variant-aware: each in-stock variant is its own line ("Grip Socks — 3-Pack · $30"); charging decrements the variant's stock and the order line carries the full variant label.
- Verified live: 3 variants on Grip Socks (S/M inherit $13.50, 3-Pack $30), popup listed all rows, sale decremented 3-Pack 5→4 with correct order line.

## 2026-07-17 — V4: Booking page overhaul (Wave 14)
- Old-system parity on /book: "All class times are shown in <city> time (GMT+X)" banner from studio settings; Group Classes / Private Sessions tabs with per-kind credit balance; class list filtered by kind.
- Class details now open as a SLIDE-OVER on the same page (hero/color header, chips, description, benefits, read-only muscle map, qty + payment radios incl. pay-online when Stripe on, guest contact fields) — no page hop; full page still available ("Open full page ↗"). Guest "Book now" dead-end fixed (opens the sidebar).
- Proper confirmation: "You're All Set!" card with booking reference (NX-yymmdd-XXXX), View My Bookings + Book another class CTAs.
- Verified live: banner GMT+7, tabs render, sidebar shows muscle map/qty/payment/guest fields, guest booking through the sidebar returned ref NX-260717-OZBJ and the confirmation screen rendered it.

## 2026-07-17 — V5: Client onboarding wizard + auth redesign (Wave 14)
- Old-system client onboarding: after Sign Up, clients land on /welcome — progress bar, "Skip for now", steps: welcome greeting → date of birth (🎂) → medical conditions (🩺, staff-visible) → "How did you hear about us?" chips (→ client.channel) → booking page. Every step optional; data saves via mode=onboard (fixed: branch had to run before the auth-field guard).
- Signed-out Account page redesigned to the old split look: dark serif brand panel ("Move better. Feel stronger. Live brighter.", studio hero when set) beside Log In + Sign Up forms.
- Verified live: new signup redirected to the wizard, greeting personalized, DOB 1995-04-12 + medical note + Instagram channel all persisted to the client profile.

## 2026-07-17 — V6: Booking upsell (Wave 14)
- Settings → Money → "Booking upsell": pick the package to offer for group vs private bookings, plus "hide when the client already has an active package" (default on).
- The booking slide-over shows a brand-tinted card — package name, price (membership-aware), per-class math vs the drop-in price, "Get the package →". Guests always see it; members only when they lack an active package of that kind (per the toggle).
- Verified live: config saved; guest sidebar showed "10-Class Pack — $220 for 10 classes ≈ $22/class"; Ava (active pack) saw nothing; settings card renders.

## 2026-07-17 — V7: Website content freedom (Wave 14)
- Per-instructor "On site / Hidden" toggle in the builder's team card (website.teamBios[id].hidden) — the public site filters accordingly.
- Testimonials and FAQs are now unlimited: the builder always shows two blank "add another…" rows beyond what exists (parses up to 50), and the site renders all quotes instead of capping at three.
- Verified live: hiding Mia removed her from the site (restore worked), 5 testimonials saved & the 5th rendered publicly, builder shows toggles + expanding rows.

## 2026-07-17 — V8: Website revamp (Wave 14 COMPLETE)
- Neutral defaults: five tasteful gradient-art SVGs (public/studio-neutral/) replace the owner's own studio photos as fallbacks for every tenant.
- Section REORDER: all five templates refactored to render their middle sections (about/classes/schedule/team/pricing/testimonials/gallery/faq) from a per-studio order list (website.sectionOrder); builder gains a "Section order" card with ↑/↓ per section (disabled sections shown struck through). Verified: moving FAQ re-ordered the live page.
- "Create my website" wizard at /website/setup: template pick → tagline/about → hero+gallery uploads → contact/socials → done ("Open my website"); reuses the real settings/media APIs via a safe `next` redirect param. Button in the builder header.
- Verified live: all 5 templates 200 post-refactor with zero regressions, neutral hero on a photo-less studio, all wizard steps render.
- GrapesJS-style drag-drop advanced editor noted as a future spike (guardrails required).

## 2026-07-17 — A2+A3: Outgoing webhooks + App Store (Wave 15 COMPLETE)
- A2 WEBHOOKS: per-studio outgoing webhooks (up to 5; url + auto-generated whsec_ secret + event picks). Events fire instantly and non-blocking from every relevant path: booking.created (public + API), booking.cancelled (admin/portal/API), client.created, order.paid (mini-POS + Stripe confirms). Payload JSON with X-Nexis-Event + X-Nexis-Signature (HMAC-SHA256) headers; docs "Make.com & Zapier" section updated with verification details. Verified live: a real guest booking delivered a signed payload to a listener within seconds.
- A3 APP STORE (/apps, in the sidebar): Pipedrive-style grid — Make/Zapier webhook manager; Slack/Discord/Telegram booking-and-sale alerts (human-readable lines to their webhook/bot); Google/Apple/Outlook calendar feed (tokened iCal of upcoming public classes, regenerable; bad token 404s); GA4/Meta/TikTok ad pixels injected on the public site + booking pages; Stripe & Twilio status cards linking to their setup. Verified live: GA4 tag appeared on /book after saving; valid VCALENDAR served.

## 2026-07-17 — Wave 16 COMPLETE: HQ Super-Admin CRM overhaul (PDF spec)
- NEW HQ SHELL: sidebar Mission Control (Dashboard/Studios/Support/Requests/Billing/Analytics/Broadcasts/Status/Logs/Email&SMS/Flags/Releases/Team/KB/Settings) with open-ticket badge + global search. 15 sections, all live.
- STUDIOS: searchable/filterable directory (searches studio names AND their clients) with automatic 0–100 HEALTH SCORES (login recency, booking trend, payment status, support load); profile page adds onboarding checklist, internal notes, VIP/churn tags, complimentary flag, per-staff password resets, and audit-logged 🎭 IMPERSONATION (60s signed token → logged in as the owner on the app host, name suffixed "(HQ)").
- SUPPORT CENTER: studios get a Support tab (tickets + 🐛 bug reports with auto-captured URL/browser/screen); HQ gets the queue (status/priority/assignee filters), threaded replies, triage (GitHub issue link, fix version, internal notes). Verified round-trip: bug filed → HQ replied → CRITICAL/assigned → studio saw the reply.
- FEATURE REQUESTS: kanban board across all studios with per-card status moves.
- PLATFORM ANALYTICS: studios/active/trial, MRR/ARR, churn, conversion, ARPA, LTV, staff DAU/WAU/MAU, signups-per-day + platform bookings-per-day charts, product usage (packages sold, group:private ratio), 30-day revenue leaderboard.
- BILLING: per-studio plan/MRR/custom-feature count/SMS topups/lifetime GMV/comp flag.
- BROADCASTS: targeted announcements (all/trial/plan/single studio; info/maintenance/security/release; optional expiry) → banners in studio dashboards. Global maintenance banner via Settings. Verified live on dev-studio.
- RELEASES: publish version notes → every studio's new "What's new" page. ACTIVITY LOGS: every HQ action audited (plan changes, suspensions, impersonations, broadcasts, resets) with search. SYSTEM STATUS: live DB/disk/backup-age/cron/SMTP/Twilio/Stripe/uptime checks. FEATURE FLAGS: global beta flags w/ studio allowlists. EMAIL & SMS log viewer w/ email resend. HQ TEAM: add Support/Developer/Finance/Sales members. KNOWLEDGE BASE: searchable SOP/macro articles.
- Deferred (needs infra/creds, noted in HQ-SPEC-3.md): websocket live chat + push, screenshots/recordings, email opens, AI assistant, fraud/GDPR suites, Stripe refunds/coupons.

## 2026-07-17 — Signup onboarding brought to life (owner mockups)
- /signup is now a client-side wizard matching the generated screens: intro splash ("Let's build your studio 🎉", benefit bullets, illustration blob) → 4-step progress rail (Studio Info → Your Details → Studio Setup → You're All Set): studio name/type/country/city → contact + password (show/hide) + Terms checkbox → describe-your-studio chips (Reformer/Mat/Yoga/Barre/Mixed), instructor-count bands, biggest-goal select → one POST creates the studio.
- Signup API stores the answers (policies.onboarding) and lands on the new /getting-started page: 🎉 "You're all set, <name>!" with studio summary card (name/type/location/instructors/booking URL), green checklist, "Go to Dashboard →" + "✨ Create my website", next-step links.
- Per-step validation with friendly errors; decorative brand-blob illustration panels; back navigation. Verified live: full wizard signup created "Wizard Flow Studio" and the summary rendered every answer.

## 2026-07-17 — Fix: new studio subdomains get SSL automatically
- ROOT CAUSE: the wildcard *.nexis vhost carried a single-host certificate (studio-test) so every new subdomain showed a cert mismatch, and it routed to the old stack; new v2 slugs were never added to the exact carve-out list.
- FIX: wildcard fallback now uses the real *.nexis.revsports.ca certificate, and /opt/nexis/scripts/subdomain-sync.sh (cron every 5 min) syncs every v2 tenant slug into the v2 nginx carve-out, reloading nginx only on change (log: /var/log/nexis-subdomains.log).
- Verified: wizard-flow-studio.nexis.revsports.ca serves its v2 booking page over a valid wildcard cert; unknown subdomains present a valid cert; dev-studio and app unaffected.

## 2026-07-17 — Native live chat (open-source Tidio alternative, built in)
- Floating 💬 chat bubble on every studio website + booking page (brand-colored, greeting, optional visitor name, unread badge, 3-second polling). Visitors chat without an account; logged-in clients are auto-linked to their profile.
- New Inbox page for studio staff (reception+): live conversation list w/ unread counts, threaded reply panel, close/reopen, "Open client →" jump; sidebar Inbox item with unread badge.
- Plumbing: ChatConversation model (capped 200 msgs), /api/public/chat (visitor, nx_vid cookie identity, rate-limited) + /api/chat (staff JSON), chat.message flows into the existing Slack/Discord/Telegram alert pipe, App Store "Live chat widget" card with on/off kill switch (default on).
- Verified live: visitor→studio→visitor round trip with unread counters both directions, widget on both public surfaces, toggle disables/enables the API + bubble.

## 2026-07-17 — Wave 17: uploads fixed, beta bug button, domain paywall, GrapesJS editor
- **Image uploads fixed** (recharged bug): server never received their uploads — cap raised 5→12 MB (matches nginx), upload errors now redirect back to the wizard step with a clear banner ("use JPG, PNG or WebP up to 12 MB — iPhone HEIC isn't supported, export as JPG") instead of silently landing on /settings.
- **🧪 Beta / report-a-bug card** in every studio sidebar → /support (feeds HQ Support Center); beta feedback note on the support page.
- **Custom domain paywall**: Settings → Domain now shows a $12/mo unlock card until purchased (customFeatures `custom-domain`, counts into MRR, audited); website wizard's done step upsells "Get your own domain".
- **Advanced editor (GrapesJS)**: /website/editor — open-source drag-and-drop builder with starter blocks; Save & publish stores sanitized HTML/CSS (scripts + on* handlers stripped) in website.custom and replaces the template on the public site; one click switches back to templates. Verified live round-trip on dev-studio.

## 2026-07-17 — Studio ↔ Nexis HQ live chat
- New live chat channel between studio owners and Studio Nexis support: studios chat from Help & Support (💬 Live chat with Nexis Support panel); HQ replies from the new **Live Chat** section in the HQ portal. Separate `channel` on ChatConversation keeps these threads out of the studio's own customer inbox. Verified full round-trip live (studio → HQ → studio, unread counts both ways).

## 2026-07-17 — Overnight loop #1: security audit + chat unread badges
- **Security audit (API v1)**: verified cross-tenant isolation holds — recharged's API key gets 404 (not a leak) fetching dev-studio's client id; invalid bearer → 401; `/clients/[id]` is correctly scoped by `tenantId`. The earlier 308 was just a trailing-slash redirect on an empty test id, not an IDOR. No vulnerability found.
- **HQ Live Chat unread badge**: HQ sidebar now shows a count on Live Chat when studios have unread messages waiting (mirrors the Support ticket badge).
- **Studio-side "Nexis replied" badge** (gap closed): after filtering the customer-inbox badge to visitor chats only, studios had no signal when Nexis Support answered. The sidebar beta card now flips to "Nexis Support replied — open chat →" with an "N new" badge whenever there are unread HQ replies. Verified live.

## 2026-07-17 — Photo attachments in all chats
- Added 📎 photo attachments to every chat surface: visitor↔studio widget, studio↔Nexis support panel, staff Inbox, and HQ Live Chat. New shared endpoint `/api/chat/upload` handles all three auth contexts (public visitor via slug, studio staff via session, HQ superadmin via tenantId), validates JPG/PNG/WebP ≤8 MB, and stores under the tenant's uploads folder (served publicly by /api/media). All four chat APIs now accept an optional `image` (validated to `/api/media/` paths), allow image-only messages, and show "📷 Photo" in list previews. Verified end-to-end live: visitor→studio, studio→Nexis (with image), HQ→studio reply (with image), image served 200, plus security (no-auth blocked, non-image type rejected).

## 2026-07-17 — Canonical public URLs (studio.nexis.revsports.ca)
- Fixed inconsistent booking-site URLs: some links pointed at app.nexis.revsports.ca/s/<slug>. New `lib/site-url.ts` publicSiteUrl() returns the canonical public origin (custom domain if set, else <slug>.nexis.revsports.ca); every "view/open my website" link (website builder, settings, setup wizard done step, sidebar card) now routes through it. Verified: 0 /s/ hrefs remain on admin pages, subdomain preview links resolve 200.

## 2026-07-17 — App Store is now a real install/uninstall store
- Rebuilt /apps from a wall of config cards into a proper store: a compact "Browse the store" catalog of tiles (icon, category, blurb, ＋ Add to studio) and a "Your apps" section that shows full configuration ONLY for apps the studio has added. New lib/appstore.ts catalog + appInstalled()/appConfigured(); policies.apps.installed[] tracks added apps (apps with existing live config auto-appear so nothing is hidden). Removing an app clears its config so it truly goes away. Status apps (Stripe/Twilio) link to their real setup. Verified install→config-appears→uninstall→gone round-trip live.

## 2026-07-17 — Multi-location foundation (design + dormant schema)
- Designed franchise/multi-location support (LOCATIONS-SPEC.md). Key decision: a location = a Tenant, grouped by a new Organization — isolation is the safe default (every existing tenantId query stays correctly scoped), sync is explicit opt-in per franchise. Rejected the risky "locationId column everywhere / one shared tenant" model that could leak clients/credits across locations.
- Shipped Phase 0: additive, DORMANT schema — new Organization model + Tenant.organizationId + Tenant.locationLabel + org.policies.sync flags (all default false). Zero behaviour change: all 7 existing studios have organizationId NULL and run exactly as before. Location switcher + opt-in syncs (clients, class catalog, then money-sensitive shared credits) are the phased follow-ups pending owner sign-off on defaults.

## 2026-07-17 — Multi-location Phase 1: create locations + switcher
- Owners can now add locations and hop between them. New /locations page (owner-only) lists every location in the account with a "Switch here" button and an "Add a location" form. Adding a location promotes the studio into an Organization (first time) and spins up a brand-new, fully-isolated sibling tenant — its own booking subdomain, clients, schedule and payments — with the same owner login cloned in. A location switcher appears at the top of the sidebar when an account has 2+ locations.
- APIs: /api/location/create (owner; creates org on first use + sibling tenant + cloned owner user, copies currency/timezone/brand/plan), /api/location/switch (owner; re-issues session to a sibling tenant, same-org + same-owner-email guarded). /locations gated to OWNER in access.ts.
- Verified live on the demo account: created "Westside" location → org formed, new location isolated (0 clients vs 41), owner cloned, switcher flips the active location both ways, and the new booking site resolves 200 at dev-studio-westside.nexis.revsports.ca. Isolation is total; sharing/sync remains the opt-in Phase 2/3 follow-up.

## 2026-07-17 — Multi-location Phase 2: billing, sharing, catalog & client directory
- Locations are now billed as separate subscriptions: /billing and /locations show each location's plan + a combined monthly total across the account; "Add a location" states it's billed as its own subscription. HQ MRR already sums per-tenant so franchise revenue rolls up automatically.
- Org-level sharing settings (owner, on /locations): Shared client directory, Shared class catalog, Memberships-anywhere, Credits-anywhere — all default OFF, stored on Organization.policies.sync, audited on change.
- Shared class catalog: "Copy catalog to other locations" clones missing class types to every sibling (never overwrites/deletes). Verified: pushed 6 types dev-studio → Westside.
- Shared client directory: /clients gains a "This location / All locations" toggle for owners when sync.clients is on — a read-only cross-location directory with a Location column (other-location clients aren't linkable since detail pages are tenant-scoped).
- Credits/memberships sharing: flags persist and power cross-location VISIBILITY now; automatic redemption is staged for the agent (money-sensitive, needs shared client identity + audit). See LOCATIONS-SPEC.md Phase 3.

## 2026-07-17 — App Store: real brand logos + Pipedrive-style marketplace
- Replaced emoji app icons with self-contained inline-SVG brand logos (Zapier, Slack, Google Calendar, Meta, Stripe, Twilio, and our own Live Chat) in components/apps/app-logos.tsx — CSP-safe, no external requests.
- Reworked /apps to flow like Pipedrive: a "＋ Browse the marketplace" popup (components/apps/store-browser.tsx) with live search over the catalog, logos, one-click Add, and a "Request an app" form. "Your apps" now shows each added app in a clean logo + name/category panel.
- Request an app → lands in the HQ Feature Requests queue (/api/apps/request appends "App request: <name>" to policies.featureRequests). Verified live: logos render with brand colours, marketplace search/add works, and an app request reached HQ.

## 2026-07-17 — App Store: split bundled apps into individual apps with logos
- Broke the grouped "Slack · Discord · Telegram" alerts app into individual Slack, Discord and Telegram apps, and the grouped "Ad pixels" app into individual Google Analytics, Meta Pixel and TikTok Pixel apps — each its own catalog entry, own inline-SVG brand logo, own add/config/remove panel. Added Discord (blurple), Telegram (paper plane), Google Analytics (amber bars) and TikTok (offset note) logos.
- Fixed the pixels save handler to MERGE (each pixel is now independent, so saving GA4 no longer wipes Meta/TikTok); per-app uninstall clears only that app's field. Verified live: GA4+Meta save independently and uninstalling GA4 leaves Meta intact.

## 2026-07-17 — Overnight loop: cross-location credit/membership visibility (Phase 3 groundwork)
- Closed a gap where the org-sync UI promised "Credits usable at any location → makes them visible so staff can honour them" but nothing surfaced them. The client profile now shows a read-only "Credits at other locations" card: this same person's active packages at the account's OTHER locations (matched by phone/email within the org), each tagged with the location + expiry + credits. Gated by sync.sharedCredits/memberships; view-only (no money moves) — the safe first half of LOCATIONS-SPEC.md Phase 3. Verified live: card shows a Westside 10-Pack on a Main client with the flag on, and disappears with it off.

## 2026-07-17 — Overnight loop: new locations inherit parent branding
- Gap: a newly created location had an empty website ({}), so a franchise's second location launched on the default template with neutral placeholder copy instead of matching the parent's brand. Fixed /api/location/create to carry the parent's BRAND-level website fields (template, tagline, about, philosophy, why, testimonials, faqs) to the new location, while leaving location-specific fields (address, phone, hours, hero/gallery photos, maps, socials, custom page) blank for the owner. Verified live: a new location inherited the "serene" template + tagline but no address.

## 2026-07-17 — Overnight loop: App Store marketplace grouped by category
- Now that apps are split into many individual entries, the "Browse the marketplace" popup groups results by category (Automation, Team alerts, Calendar, Marketing, Support, Payments, Messaging) with headers, preserving catalog order — matching the Pipedrive-style flow. Search still filters across all, then regroups. Also verified during this pass that uninstalling the Automation app correctly clears saved webhooks. Build clean, /apps 200.

## 2026-07-17 — Overnight loop: fixed off-brand/broken reminder booking link
- Bug (customer-facing): the 24h booking-reminder email linked "Manage your booking" to https://new.nexis.revsports.ca/book/<slug>/me — an internal admin host that returns a 307, not the studio's site. Fixed to publicSiteUrl(tenant, "/book/me") so it points at <slug>.nexis.revsports.ca/book/me (or the studio's custom domain). Verified the canonical path returns 200 and no other outbound message code contains new.nexis/legacy /s/ links.

## 2026-07-18 — Overnight loop: chat upload respects disabled chat
- Consistency/hardening bug: when a studio turned Live chat off, the visitor chat POST correctly returned 403 but /api/chat/upload still accepted image uploads (200) into the studio's uploads folder. Fixed the visitor path to check appsOf(tenant.policies).chatDisabled and return 403, matching the message endpoint. Verified live: upload → 403 when disabled, 200 when re-enabled.

## 2026-07-18 — Overnight loop: verified location-switch isolation + HQ franchise tags
- Security check: confirmed the location switcher rejects cross-organization jumps — an owner attempting to switch to a tenant outside their own org stays put (session unchanged), while same-org switches work. No vulnerability.
- Improvement: the HQ Studios list now tags franchise locations with a "🏢 <locationLabel>" badge (any tenant with an organizationId), so super-admin can tell at a glance which studios are part of a multi-location account. Verified live (both dev-studio locations tagged).

## 2026-07-18 — Overnight loop: clearer empty-schedule state on booking site
- UX bug: a studio/location with ZERO upcoming classes showed "No classes match this day — try another" on every day, misleadingly implying other days had classes (hit especially on brand-new franchise locations whose sessions aren't materialised yet). Now when there are no upcoming public sessions at all, the booking page shows "No classes scheduled yet — check back soon! ✨"; the per-day message stays for studios that do have classes. Verified live: Westside (0 sessions) shows the new copy, Main (has sessions) does not.

## 2026-07-18 — Overnight loop: franchise role-enforcement verified + location audit trail
- Security check (no vuln): a STAFF user is fully blocked from franchise controls — GET /locations 307→/dashboard, POST /api/location/create makes no tenant, /api/location/switch and org-sync settings both rejected (303→login). Owner-only guards hold.
- Improvement: location create and switch now write AuditLog entries (location-created / location-switched with from→to detail) — a trail for the owner/HQ and a prerequisite for the Phase 3 audited credit redemption. Verified live: switches recorded as "Westside → Main" etc.

## 2026-07-18 — Overnight loop: current-location pill in the top bar
- For multi-location owners it wasn't obvious which location's data you were editing after switching. Added a persistent "📍 <location>" pill to the top bar (only shown when the tenant belongs to an Organization) that links to /locations. Updates as you switch. Verified live: shows "Main", flips to "Westside" after a switch, hidden for standalone studios. Also re-confirmed org isolation during this pass — Dev Studio and Recharged are two separate franchises with no cross-contamination.

## 2026-07-18 — Overnight loop: HQ health pass + canonical client-identity helper
- HQ portal crawl: all 16 sections return 200, no user-visible errors (the "undefined" tokens were Next.js RSC flight-payload markers, not shown to users), and all ACTIVE studios have valid plans so MRR is correct ($0 rows are trials). No bug.
- Phase 3 groundwork: extracted the cross-tenant client-identity match (phone/email within an org) into one reusable helper lib/org.ts:linkedClientOr() and refactored the client profile's "Credits at other locations" card to use it — single source of truth for cross-location lookups, reducing inconsistency risk when redemption is built. Verified live: card still shows a sibling location's package.

## 2026-07-18 — Overnight loop: booking confirmation email uses canonical URL
- Same off-brand/broken link as the reminder bug lived in the booking CONFIRMATION email ("Manage your bookings: https://new.nexis.revsports.ca/book/<slug>/me"). Fixed to publicSiteUrl(tenant, "/book/me") — <slug>.nexis.revsports.ca (or custom domain). Full-repo sweep confirms zero new.nexis.revsports.ca links remain in outbound code. Build clean.

## 2026-07-18 — Overnight loop: HQ distinguishes App Store requests; verified shared directory
- Verified the shared client directory: "All locations" toggle + Location column render, and search preserves the scope (hidden scope=all input persists). No bug.
- Improvement: App Store "Request an app" submissions now show a "🧩 App Store" tag in the HQ Feature Requests board with the "App request:" prefix stripped to a clean app name, so super-admin can tell them apart from feature requests. Verified live (Mailchimp request tagged).

## 2026-07-18 — Overnight loop: membership renewals skip suspended studios
- Correctness bug: renewMemberships() renewed monthly/yearly memberships and generated renewal orders for ANY tenant, including SUSPENDED (churned/offline) studios whose public sites are already down. Added a `tenant: { status: { not: "SUSPENDED" } }` filter so suspended studios no longer auto-renew or accrue phantom orders. Verified: cron runs 200 ({"ok":true,"renewed":0}); DB confirms 0 suspended tenants currently have due memberships (so no bad renewals had fired yet).

## 2026-07-18 — Overnight loop: POS checkout verified + clearer out-of-stock message
- Audited the POS/checkout money path: prices always come from the DB (never the client), vouchers check active/expiry/maxUses and increment usedCount atomically, product stock is checked and decremented in one transaction, and package purchases are correctly blocked without a client. Guards verified live (empty cart → "empty cart", package w/o client → "packages need a client"). No bug.
- Improvement: the out-of-stock error now tells the front desk how many remain ("Yoga Mat — only 8 left in stock") instead of a generic "not enough stock". Verified live by over-buying.

## 2026-07-18 — Overnight loop: analytics verified; page-view retention moved off the public beacon
- Verified analytics: all queries are tenant-scoped (per-location for franchises), live-viewers/uniques/sources use proper groupBy. No bug.
- Improvement: the ~6-month page-view retention sweep was running as a table-wide deleteMany from the public /api/public/track beacon on a 1% roll — a public request should never trigger a maintenance delete. Moved it to the daily materialise cron (returns a `pruned` count). Verified: beacon still 200 with no delete in the hot path; cron returns {"ok":true,"created":0,"pruned":0}.

## 2026-07-18 — Overnight loop: Phase 3 per-package opt-out (shareable flag)
- Added the per-package opt-out the Phase 3 spec requires: Package.shareable (default true, additive migration — existing packs unchanged). Franchises get a "Honour at other locations" checkbox on the add-package form (shown only when in an org); the cross-location credit-visibility card now filters to package.shareable=true so studios can keep specific packs local. Verified live: a non-shareable pack is hidden from another location's view, flips to visible when marked shareable; toggle renders on /products for franchises. Safe (config + visibility only, no money movement).

## 2026-07-18 — Overnight loop: "Manage your bookings" emails point to the actual bookings page
- The confirmation & reminder emails said "Manage your bookings" but linked to /book/me → the account/profile page (stats, password), which doesn't list upcoming bookings to cancel. Repointed both to publicSiteUrl(tenant, "/bookings") — the real bookings-management page (confirmed classes + cancel-window logic). Verified: /bookings resolves 200 on the subdomain; both email bodies now use the canonical /bookings link.

## 2026-07-18 — Overnight loop: customer booking-cancel gives feedback (no more silent failure)
- Bug: a customer cancelling a booking inside the cancellation window silently failed — the transaction returned with no change and dumped them on the account page with zero feedback. Also, successful cancels gave no confirmation. Reworked the cancel handler to return an outcome (cancelled/toolate/notfound) and redirect back to /bookings with a message: "Booking cancelled — any class credit has been returned", "It's too close to class time to cancel online — please contact the studio", or a not-found notice. Credit-refund + waitlist-promotion logic unchanged. Verified live: both banners render for a logged-in customer.

## 2026-07-18 — App Store: 6 new integrations (tested to perfection)
- Added 6 easy, high-value apps that slot into the existing pixel-injection and webhook-alert pipelines:
  - Marketing/Insights (script injection on public pages): Google Tag Manager, Microsoft Clarity (free heatmaps), Pinterest Tag, Snapchat Pixel.
  - Team alerts (booking/sale/chat alerts via webhook): Google Chat, Microsoft Teams.
- Each has its own inline-SVG brand logo, catalog entry, config panel, install/uninstall (clears its config), and appConfigured detection. Pixel saves merge (adding one never wipes another).
- Verified live end-to-end: all 4 scripts render on the public booking site with the studio's ID (GTM gtm.js?id=, Clarity clarity.ms/tag, Pinterest s.pinimg.com/ct/core.js, Snapchat sc-static.net/scevent); both webhooks delivered a real chat.message alert to a local echo server ({"text":"💬 Live chat from Visitor: …"}) on /gchat and /teams. All test data cleaned up.

## 2026-07-18 — App Store: split Make/Zapier + add Zalo (tested to perfection)
- Split the combined "Make.com & Zapier" app into separate **Zapier** and **Make** apps, each with its own logo and webhook manager. Webhooks are now tagged with a `source` ("zapier"/"make"; legacy untagged ones belong to Zapier); each panel lists/adds/removes only its own, and install state + uninstall are independent. Event dispatch is unchanged (fires to every hook). Verified: a Zapier hook and a Make hook coexist under their own tiles; uninstalling Zapier leaves the Make hook intact.
- Added **Zalo** (big for the VN market): stores apps.zaloId; a "Chat on Zalo" floating button (bottom-left, clear of the chat bubble) links to zalo.me/<id> on the booking site and studio site. Verified live: button + zalo.me/84901234567 render on both public surfaces when set, and are absent for studios without it.
- App Store now offers 16 integrations.

## 2026-07-18 — Quick-add popup in the top bar (client / class / block)
- The top-bar "+" used to navigate to /schedule/new. It's now a quick-add popover (components/shell/quick-add.tsx): click "+" → a menu (Add a client · Add a class · Block a time) → a modal opens ON THE CURRENT PAGE. Each form posts to its existing endpoint (/api/clients, /api/sessions, /api/timeblocks) with a `back` param, so you land right back where you were. Added `back`/return support to /api/clients. Hidden for instructors. Verified live: menu renders, old /schedule/new link gone, all three create records and redirect back to the originating page.

## 2026-07-18 — Login verification (2FA) framework + editable email templates
- Two-step login for studio admins/staff: after the password, a 6-digit code is sent by email (SMTP) or SMS (Twilio); a "Save my info on this device for 30 days" option sets a signed trusted-device cookie that skips the code. New: /login/verify page + /api/login/verify, lib/login-verify.ts, auth.ts cookie helpers (pending-2FA JWT + 30-day trust JWT), lib/email-templates.ts (defaults, {{studio}}/{{name}}/{{code}}/{{minutes}} placeholders), Settings → Security tab (mode: any/email/sms/off + editable verification-code email template; owner/manager only).
- SAFE BY DESIGN (per owner decision — built dormant): verification only engages when the studio has it on AND a delivery channel is actually configured for that user. With no SMTP/Twilio connected today it stays password-only, so nobody is locked out; it switches on automatically once a channel is added. Verified live: (a) dormant — owner logs straight in, Security tab shows "Standby"; (b) verify endpoint — wrong code → error, correct code + trust → session + 30-day trust cookie set, dashboard loads; (c) settings save mode + custom template persist; (d) staff blocked from Security settings.
- TO GO LIVE: connect an email channel (set SMTP_HOST/PORT/USER/PASS/FROM — or a transactional provider) and/or Twilio creds; then it enforces automatically.

## 2026-07-18 — Overnight loop: quick-add success toasts
- Polished the new top-bar quick-add: adding a client/class/block dropped you back on the page with no confirmation. The create endpoints (/api/clients, /api/sessions, /api/timeblocks) now append ?added=client|class|block on success, and a universal QuickToast (mounted in the admin layout) shows a brief "✓ Client added / Class added to the calendar / Time blocked" toast client-side, then strips the param from the URL. Verified: all three endpoints return the added param; toast component builds & mounts. Test data cleaned up.

## 2026-07-18 — Overnight loop: 2FA/App Store audit + logout cleanup
- Audited recently-shipped surfaces: login-verify guards correct (no pending cookie → /login on both page & API); all 19 App Store catalog apps have a matching brand logo (no gray-default fallback); logout preserves the 30-day trusted-device cookie (feature intact); /developers#automation anchor still valid.
- Fix: logout now also clears any half-finished login-verification (nx_2fa) cookie defensively, while keeping the trusted-device cookie so "save my info for 30 days" survives sign-out. Verified logout still redirects to /login.

## 2026-07-18 — Overnight loop: money-logic audit + P&L profit margin
- Audited the money-critical earnings/payroll logic: all four commission modes (percent, percent_tiered, fixed_per_class, per_head) are correct; retroactive tiered pay re-prices the whole month at the final tier while non-tiered modes use frozen per-class earnings; tierPct/perHeadAmount take the correct highest applicable threshold; per-class revenue = drop-in + (pricePaid/credits)×seats. Also confirmed the Expenses P&L revenue correctly filters status=PAID (no pending/unpaid orders inflating it). No bugs.
- Improvement: the P&L "Profit" tile now shows the profit margin % (profit ÷ revenue). Verified live.

## 2026-07-18 — Overnight loop: fix membership-renewal double-grant (money bug)
- Real money bug: membership renewals create a PENDING order, but the renewals cron already grants the credits (it resets the client's existing ClientPackage). The invoices "mark paid" route then iterated the order's package items and created a BRAND-NEW ClientPackage — so marking a renewal invoice paid at the desk double-granted the membership (client got a second pack for free). Fixed /api/orders/[id]: renewal orders (method="membership") now just record the collection (flip to PAID, keep method) and skip credit-granting; only genuine reserved-online orders still grant. Verified live: marked a real PENDING renewal paid → order PAID|membership, client's package count unchanged (no duplicate). Non-renewal grant path untouched.

## 2026-07-18 — Overnight loop: money-path audit + booking-cancel alert names
- Audited more money logic: staff booking cancel refunds by qty and is idempotent (wasActive gate); promoteWaitlist consumes one credit per promotion and every waitlist entry is single-seat (public forces qty=1, staff uses Booking.qty default 1) — no overbooking / credit under-charge. All correct.
- Fix: staff-side booking cancel fired the booking.cancelled webhook/chat alert with EMPTY client & class names ("❌ Cancelled: → "). Now includes both (fetched via booking.client + session.classType). Verified live with an echo server: alert reads "❌ Cancelled: <client> → <class>".

## 2026-07-18 — Overnight loop: team/voucher audit + App Store count
- Audited staff/team management (OWNER-only, role can't escalate to OWNER/SUPERADMIN, password ≥8, bcrypt, duplicate-email caught → clear /team error messages) and vouchers (value/percent-cap/maxUses validated on create; checkout caps discount at total & increments usedCount atomically). Both solid — no bugs.
- Improvement: App Store header now shows the live integration count ("19 integrations and counting") from APP_CATALOG. Verified live.

## 2026-07-18 — App Store: official brand logos (simple-icons)
- Replaced hand-drawn logo approximations with OFFICIAL brand marks for 14 apps, sourced from the simple-icons library (the standard curated set of official brand SVGs, used descriptively to indicate integration support): Zapier, Make, Discord, Telegram, Google Chat, Google Calendar, Google Analytics, Google Tag Manager, Meta, TikTok, Pinterest, Snapchat, Zalo, Stripe — each rendered in its official brand colour on a clean tile, self-contained (no external requests, CSP-safe). Slack, Microsoft Teams, Twilio and Microsoft Clarity opted out of simple-icons, so they keep tidy geometric marks; Live Chat uses our own. Verified live: official glyphs + brand hex render in the App Store panels.
- Also confirmed public multi-seat booking consumes the correct number of credits (creditsLeft >= qty, decrement qty) — no under-charge.
