# Multi-location / franchise — design

## The core decision: a location IS a tenant

Every record in the system (clients, class types, sessions, bookings, packages,
credits, staff) is scoped by `tenantId`. That boundary already gives us perfect
isolation between locations *for free*. So:

- **A location = a Tenant.** An "account" that owns several locations = an
  **Organization** grouping several tenants.
- **Isolation is the default** — exactly what a franchise where each studio is
  run independently expects. Nothing leaks unless the org explicitly turns on a
  sync. This is the safe default the owner asked for.
- **Sync is opt-in and explicit** — we build each sharing behaviour as a
  deliberate, clearly-bounded operation, gated by an org-level policy. We never
  make credits or clients cross a location boundary implicitly.

Rejected alternative: adding a `locationId` column to every table and one shared
tenant. That would force location-scoping logic into every one of the hundreds
of existing `where: { tenantId }` queries, and a single missed filter would leak
one location's data (or credits) into another. Too risky on a live system.

## Data model (additive, dormant until used)

```
Organization
  id, name, ownerEmail, policies(Json), createdAt
Tenant.organizationId  String?   // null = standalone studio (unchanged)
Tenant.locationLabel   String?   // "Downtown", "Westside" — shown in switcher
```

`Organization.policies.sync` (all default **false** = fully isolated):
```
sync: {
  clients:      false,  // shared client directory across locations
  classTypes:   false,  // class/blueprint catalog shared
  sharedCredits:false,  // a client's package credits usable at any location
  memberships:  false,  // membership valid at any location
  staff:        false,  // staff can be rostered at any location
}
```

## Location switching

The org owner (matched by `ownerEmail`) can hop between the org's locations.
Mechanism mirrors HQ impersonation but self-serve and same-org-only:
`/api/location/switch` verifies the signed-in user's email == org.ownerEmail (or
a future OrgMembership), finds the sibling tenant, and re-issues the session
cookie pointing at that tenant's owner user. A location switcher in the sidebar
shows the current location and the others.

## Sync behaviours (phased, each gated by its policy flag)

1. **Shared client directory** (`sync.clients`) — when on, a client's profile is
   findable/creatable across locations by phone/email; booking at a new location
   reuses the same client identity. Implementation: a `clientKey` (org + phone)
   lookup that spans org tenants only when the flag is on.
2. **Shared class catalog** (`sync.classTypes`) — "copy this class type to all
   locations" and keep-in-sync option. Safe: class types carry no money.
3. **Shared credits / memberships** (`sync.sharedCredits`, `sync.memberships`) —
   the sensitive one. A `ClientPackage` becomes redeemable at sibling locations.
   Must be explicit, auditable, and ideally with per-package opt-out. Built last,
   behind its own flag, with clear UI warnings.
4. **Shared staff** (`sync.staff`) — roster an instructor across locations.

## Rollout

- **Phase 0 (this change):** additive schema (Organization + fields), dormant.
  Zero behaviour change for existing studios. Ships now.
- **Phase 1:** HQ can create an org and attach tenants; owner location switcher.
- **Phase 2:** shared client directory + shared class catalog (low-risk syncs).
- **Phase 3:** shared credits/memberships (money-sensitive), per-package opt-out,
  full audit. Only after the owner confirms the exact rules.
