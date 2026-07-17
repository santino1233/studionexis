# Video spec 2 — "nexis updates v1.mp4" (owner, 2026-07-17, 16.7 min)

Transcribed narration + screens. Old system (staging.soulpilates.com.vn) is the
quality bar; Acuity shown as a secondary reference. Distilled requirements:

## 1. Calendar (admin)
- Grid is too small / too little information. Use more of the space; bigger blocks.
- Blocks should show attendee count and some attendee names (day view already
  does; week view needs more).
- **"Needs completion" pulse** (killer feature from the old system): a highlight +
  pulse effect on any past class that has attendees but isn't fully settled —
  class not marked completed, or attendees not checked in/paid. This is the
  receptionist's TODO signal; instructor commission depends on completion.

## 2. Checkout (mini-POS popup)
- More information & capabilities, matching the old system:
  - Package credit, promo/voucher, merch upsell (exist) — keep.
  - **Sell a package inside checkout**: client with no credits can buy a package
    on the spot, then a credit from that new package pays for this class
    (buy pack → auto-consume 1 credit → CHECKED_IN, one flow).

## 3. Products
- **Variants**: e.g. grip socks with size/colour options, single/3-pack —
  per-variant stock tracking so studios know exactly what they hold.
- Archive button placement feels out of place — polish.

## 4. Public booking page (/book)
- Show studio timezone clearly ("All class times are shown in <city> time (GMT+X)") —
  timezone comes from studio settings.
- Credit balance widget split by kind: Group Classes / Private Sessions tabs,
  each showing that kind's credits.
- **Class details should open as a SIDEBAR on the same page**, not navigate to a
  separate page (old system's View Details slide-over w/ muscle map + booking).
  Keep the standalone page for deep links/SEO.
- BUG: "Book now" for signed-out guests appears to do nothing (details element) —
  make the guest flow obvious.
- Booking confirmation: proper "You're All Set!" screen w/ booking reference
  (e.g. NX-260718-1234), class summary, view-my-bookings CTA.

## 5. Client onboarding + auth design
- Signup should be a short multi-step onboarding (old system): welcome →
  date of birth (skippable) → medical conditions (skippable, shown to staff) →
  "How did you hear about us?" (→ client.channel) → done, start booking.
- Login/signup pages deserve the old system's look (split layout, big serif
  tagline, studio hero) — themed per studio.

## 6. Payments & upsell in booking flow
- Pay deposit / pay in full via card shown as options (Stripe-gated — built).
- **Package upsell during booking**: Settings → Payments lets the studio pick
  which package to upsell for group vs private bookings; hide the upsell when
  the client already has an active package. Guest flow: contact details at the
  final step.

## 7. Website — instructors & content limits
- Enable/disable individual instructors on the site (not all-or-nothing).
- Unlimited testimonials and FAQs (currently capped at 3/6).

## 8. Website templates — revamp
- Don't ship the owner's own studio photos as defaults for other studios —
  neutral defaults.
- Better organization/flow of sections; option to add/remove/REORDER sections.
- **Setup wizard**: "Create my website" button for new studios — runs through
  images, info, template pick.
- Longer-term: embed an open-source drag-and-drop page builder (e.g. GrapesJS)
  with guardrails, as an advanced editing mode on top of the templates.

Owner quotes: "the Soul Pilates system definitely looks a lot cleaner… fonts,
colors, everything" · "people want to stay on the same page" · "I think the
website templates need a complete revamp".
