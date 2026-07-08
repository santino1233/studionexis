# Spec from owner's screen recording (soul-scheduleclass.mp4, 2026-07-08)
Transcribed narration + 46 frame captures. "Improvise, make things better.
This stuff needs to be concrete."

## Calendar / Schedule module
- Colors: class-type colors (have) AND status meaning — green=completed,
  blocked=striped+lock, no-show/late-cancel visible. "COLOR BY" toggle
  (Format vs Status). Legend: PRIVATE GROUP Holiday Blocked Waitlist
  Completed No-show Override Freelance.
- Week / Day / Month views (original has all three).
- Block STUDIO TIME (arbitrary ranges, striped block, click to unblock).
- Block a SPECIFIC CLASS: hidden from public booking + not bookable;
  unblock restores.
- Detail rail (have) plus: Edit Session modal (instructor, start time,
  duration, capacity, difficulty, override note, status incl. No Show,
  "Visible on public booking page" checkbox), Details tab showing CLASS
  REVENUE and INSTRUCTOR EARNINGS, attendee quantities, booking ref links,
  "View attendance history".
- CHECK-OUT mini-POS from the rail: payment method choice, promo code,
  add merch to the sale, or "use package credits" → completes payment,
  creates the order, marks attendee CHECKED_IN ("Checked out & checked
  in" toast). "Unpaid" label until checked out.
- MARK CLASS COMPLETED → freezes/computes revenue + instructor commission
  for that session (feeds payroll/analytics).
- Quick-add client popup right from the roster when they don't exist yet.

## Class Blueprints (class types)
- Full editor page w/ tabs General / Pricing / Schedule.
- General: name, type (group/mat/private — TYPES + DIFFICULTIES should be
  studio-configurable in Settings), duration, description, Benefits /
  Good-for / Tags (comma), EQUIPMENT used, MUSCLE FOCUS — clickable
  front/back body map (port MuscleMapJS from old repo), hero image per
  class (shows on booking detail).
- Pricing: drop-in price (deposit amount when Stripe lands).
- Schedule: default instructor, status Active, valid from/to, "Public by
  default" toggle, RECURRING SLOTS (pick day → add times, per-slot
  capacity override, +Add day), EXCEPTION DATES (holidays/instructor
  leave). Sessions materialise automatically for future weeks.

## Public booking
- Class rows already match. Add class DETAIL page: hero image, tags,
  description, muscle-map highlight, equipment, instructor, spots left.
- "Book this class" flow: quantity (bring friends), payment choice —
  package credits / deposit ("guarantee your spot") / pay in full /
  pay at studio. Pay-at-studio must be a STUDIO TOGGLE (owner disables it
  to reduce no-shows). Deposit/full = card page (Stripe when keys arrive;
  fee line supported).
- Packages/My bookings/My packages pages: already matched earlier.

## Notes
- Old system reference lives at /opt/studionexis (MuscleMapJS assets in
  SoulPilates.Astro). Owner will record more videos for other screens.
