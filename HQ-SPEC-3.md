# HQ overhaul spec (from Pilates_CRM_Super_Admin_Portal_Complete_Guide.pdf, 2026-07-17)

Build plan — HQ v2 at hq.nexis.revsports.ca with sidebar nav per the PDF's
"Recommended Navigation". Mapping of the 25 sections:

BUILD NOW (Wave 16):
1  Studio Management → search/filter directory, health score, profile page:
   internal notes, VIP/churn-risk tags, onboarding progress, staff list w/
   password reset, audit-logged IMPERSONATION ("log in as owner"), archive.
2  Support Center → SupportTicket model, studio-side /support (new ticket +
   threaded replies, auto-context), HQ ticket queue (status Open/Pending/
   Waiting/Resolved, priority Low→Critical, assignee, reply). Chat = fast
   threaded messages (no websockets v1).
3  Bug Reports → ticket kind=bug w/ auto-captured URL/browser/screen/user;
   severity, GitHub issue link field, fix version, internal notes.
4  Feature Requests → board view (existing per-tenant requests) w/ statuses
   + votes (HQ can up-vote on behalf of studios) + revenue-impact note.
5  Platform Analytics → studios, active, MRR/ARR, churn, trial conversion,
   ARPA, LTV, signups/day chart, DAU/WAU/MAU (from staff lastLoginAt),
   bookings/day, packages sold, group vs private ratio, revenue leaderboard.
6  Health Score → 0–100 from staff-login recency, booking trend, payment
   status, open tickets; badges in directory + profile.
7  Billing → per-studio plan/MRR/lifetime GMV/SMS spend/custom features;
   complimentary flag. (Coupons/refunds = Stripe-gated, noted.)
8+9 Broadcasts & in-app announcements → Announcement model (audience:
   all/trial/plan/specific; kind info/maintenance/security/release;
   window); banner in studio admin w/ dismiss.
10 Activity Logs → AuditLog model; write from all HQ actions (plan change,
   suspend, impersonate, grants, broadcasts) + studio logins; HQ viewer.
11 System Status → live checks: DB, disk, latest backup age, cron
   freshness, SMTP/Twilio/Stripe config, app uptime.
12 Global Settings → GlobalSetting KV (maintenance mode banner, defaults).
13 Releases → Release model, HQ publish, "What's new" page in studio admin.
14 API & Webhooks → per-studio API key + webhook overview page in HQ.
15 Email & SMS Logs → cross-tenant viewer w/ status + email resend.
16 Internal Team → additional HQ users w/ role label (Support/Developer/
   Finance/Sales), add/deactivate. (Granular perms later.)
17 Product Usage → folded into Platform Analytics.
24 Feature Flags → global beta flags w/ tenant allowlists (GlobalSetting).
25 Knowledge Base → KbArticle CRUD + search in HQ.
Bonus: CRM-wide search (studios/clients/tickets), revenue leaderboard.

DEFERRED (needs infra/creds): live-chat websockets+push, screenshots/screen
recordings, email opens/clicks, AI ticket assistant, fraud detection,
multi-region, GDPR suite, Stripe refunds/coupons (keys), status-page SaaS.
