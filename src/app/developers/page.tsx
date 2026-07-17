import type { Metadata } from "next";
import { ApiKeyBox, TryIt, type TryParam } from "@/components/dev/try-it";

export const metadata: Metadata = {
  title: "StudioNexis API — Developer Documentation",
  description: "REST API for StudioNexis studios: clients, classes, bookings, packages and sales. Works with Make.com, Zapier and your own tools.",
};

// ── Endpoint catalogue (drives the whole page) ────────────────────────
type Field = { name: string; type: string; req?: boolean; desc: string };
type Endpoint = {
  method: "GET" | "POST";
  path: string;
  title: string;
  desc: string;
  params?: Field[]; // query/path
  body?: Field[];
  tryParams?: TryParam[];
  tryBody?: string;
  response: string;
};
type Section = { id: string; title: string; intro?: string; endpoints: Endpoint[] };

const SECTIONS: Section[] = [
  {
    id: "studio", title: "Studio",
    endpoints: [{
      method: "GET", path: "/api/v1/me", title: "Get your studio",
      desc: "Returns the studio the API key belongs to — useful as a connectivity test.",
      response: `{
  "id": "cl…", "name": "Dev Studio", "slug": "dev-studio",
  "currency": "USD", "timezone": "Asia/Bangkok",
  "plan": "starter", "bookingUrl": "https://dev-studio.nexis.revsports.ca/book"
}`,
    }],
  },
  {
    id: "clients", title: "Clients",
    intro: "Your studio's client list — the same people you see under Clients in the dashboard.",
    endpoints: [
      {
        method: "GET", path: "/api/v1/clients", title: "List clients",
        desc: "Paginated list, newest studios often sync this into a CRM or sheet.",
        params: [
          { name: "q", type: "string", desc: "Search name, phone or email" },
          { name: "limit", type: "number", desc: "Page size, max 100 (default 25)" },
          { name: "offset", type: "number", desc: "Skip N results" },
        ],
        tryParams: [{ name: "q", in: "query", placeholder: "ava" }, { name: "limit", in: "query", example: "5" }],
        response: `{
  "total": 36, "limit": 5, "offset": 0,
  "data": [{
    "id": "cl…", "name": "Ava Nguyen", "phone": "555-2100",
    "email": "ava.nguyen@example.com", "channel": "instagram",
    "tags": ["vip"], "memberSince": "2026-01-04T…", "lastVisitAt": "2026-07-08T…"
  }]
}`,
      },
      {
        method: "POST", path: "/api/v1/clients", title: "Create a client",
        desc: "Adds a client (channel is recorded as \"api\"). Plan limits apply.",
        body: [
          { name: "name", type: "string", req: true, desc: "Full name" },
          { name: "phone", type: "string", desc: "Phone number" },
          { name: "email", type: "string", desc: "Email address" },
          { name: "tags", type: "string[]", desc: "Up to 10 tags" },
          { name: "notes", type: "string", desc: "Free-form notes" },
        ],
        tryBody: `{
  "name": "API Test Client",
  "phone": "555-0199",
  "tags": ["api-demo"]
}`,
        response: `{ "id": "cl…", "name": "API Test Client", "phone": "555-0199", … }   // HTTP 201`,
      },
      {
        method: "GET", path: "/api/v1/clients/{id}", title: "Get one client",
        desc: "Full profile including active packages and booking count.",
        params: [{ name: "id", type: "string", req: true, desc: "Client id (path)" }],
        tryParams: [{ name: "id", in: "path", placeholder: "cl…" }],
        response: `{
  "id": "cl…", "name": "Ava Nguyen", …,
  "totalBookings": 14,
  "activePackages": [{ "id": "cp…", "name": "10-Class Pack", "creditsLeft": 6, "expiresAt": "…", "renews": false }]
}`,
      },
    ],
  },
  {
    id: "classes", title: "Classes & schedule",
    intro: "Upcoming public classes with live availability — the same data your booking page shows.",
    endpoints: [
      {
        method: "GET", path: "/api/v1/classes", title: "List upcoming classes",
        desc: "Defaults to the next 14 days.",
        params: [
          { name: "from", type: "ISO date", desc: "Window start (default now)" },
          { name: "to", type: "ISO date", desc: "Window end (default +14 days)" },
          { name: "limit", type: "number", desc: "Page size, max 100" },
          { name: "offset", type: "number", desc: "Skip N results" },
        ],
        tryParams: [{ name: "limit", in: "query", example: "5" }],
        response: `{
  "total": 43, "limit": 5, "offset": 0,
  "data": [{
    "id": "cs…", "name": "Reformer Flow", "startsAt": "2026-07-20T00:30:00.000Z",
    "endsAt": "…", "instructor": "Mia Instructor", "location": null,
    "capacity": 6, "spotsLeft": 2, "price": 18.5,
    "difficulty": "Athletic", "format": "Reformer"
  }]
}`,
      },
      {
        method: "GET", path: "/api/v1/classes/{id}", title: "Get one class",
        desc: "Everything on the class detail page: description, benefits, equipment, availability.",
        params: [{ name: "id", type: "string", req: true, desc: "Class id (path)" }],
        tryParams: [{ name: "id", in: "path", placeholder: "cs…" }],
        response: `{ "id": "cs…", "name": "Reformer Flow", "description": "…", "spotsLeft": 2, "benefits": ["Core strength"], … }`,
      },
    ],
  },
  {
    id: "bookings", title: "Bookings",
    intro: "Create and cancel bookings exactly like the booking page does — credits are auto-spent when the client has them, waitlist applies when the class is full, cancellations refund credits and promote the waitlist.",
    endpoints: [
      {
        method: "GET", path: "/api/v1/bookings", title: "List bookings",
        desc: "Newest first. Filter by client.",
        params: [
          { name: "clientId", type: "string", desc: "Only this client's bookings" },
          { name: "limit", type: "number", desc: "Page size, max 100" },
        ],
        tryParams: [{ name: "limit", in: "query", example: "5" }],
        response: `{
  "total": 210, "limit": 5, "offset": 0,
  "data": [{
    "id": "bk…", "status": "BOOKED", "seats": 1, "paymentMethod": "package_credit",
    "client": { "id": "cl…", "name": "Ava Nguyen" },
    "class": { "id": "cs…", "name": "Mat Pilates", "startsAt": "…" },
    "createdAt": "…"
  }]
}`,
      },
      {
        method: "POST", path: "/api/v1/bookings", title: "Create a booking",
        desc: "Book by clientId, or send name + phone/email and the client is found-or-created. Full classes become WAITLIST.",
        body: [
          { name: "classId", type: "string", req: true, desc: "The class (session) id" },
          { name: "clientId", type: "string", desc: "Existing client id" },
          { name: "name", type: "string", desc: "If no clientId: client name" },
          { name: "phone / email", type: "string", desc: "If no clientId: at least one contact" },
          { name: "seats", type: "number", desc: "1–5 people (default 1)" },
        ],
        tryBody: `{
  "classId": "cs…",
  "name": "API Test Client",
  "phone": "555-0199",
  "seats": 1
}`,
        response: `{
  "id": "bk…", "status": "BOOKED", "seats": 1,
  "paymentMethod": "at_studio",
  "client": { "id": "cl…", "name": "API Test Client" }
}   // HTTP 201 · 409 already_booked / not_enough_spots`,
      },
      {
        method: "POST", path: "/api/v1/bookings/{id}/cancel", title: "Cancel a booking",
        desc: "Refunds all package credits for the seats and promotes waitlisted clients into the freed spots.",
        params: [{ name: "id", type: "string", req: true, desc: "Booking id (path)" }],
        tryParams: [{ name: "id", in: "path", placeholder: "bk…" }],
        tryBody: `{}`,
        response: `{ "id": "bk…", "status": "CANCELLED", "creditsRefunded": 1 }`,
      },
    ],
  },
  {
    id: "packages", title: "Packages",
    endpoints: [{
      method: "GET", path: "/api/v1/packages", title: "List packages & memberships",
      desc: "The studio's active credit packs and auto-renewing memberships.",
      response: `{
  "data": [{
    "id": "pk…", "name": "10-Class Pack", "credits": 10, "price": 220,
    "kind": "GROUP", "billing": "one_time", "validityDays": 90
  }, {
    "id": "pk…", "name": "Unlimited-ish Monthly", "credits": 12, "price": 99,
    "kind": "GROUP", "billing": "monthly", "validityDays": 30
  }]
}`,
    }],
  },
  {
    id: "orders", title: "Orders & sales",
    endpoints: [{
      method: "GET", path: "/api/v1/orders", title: "List orders",
      desc: "Every sale — drop-ins, packages, merch, membership renewals. Great for accounting exports.",
      params: [
        { name: "status", type: "string", desc: "PAID · PENDING · REFUNDED · VOID" },
        { name: "limit", type: "number", desc: "Page size, max 100" },
      ],
      tryParams: [{ name: "status", in: "query", example: "PAID" }, { name: "limit", in: "query", example: "5" }],
      response: `{
  "total": 141, "limit": 5, "offset": 0,
  "data": [{
    "id": "or…", "number": 141, "total": 45, "discount": 0,
    "method": "cash", "status": "PAID",
    "client": { "id": "cl…", "name": "Ruby Ngo" },
    "items": [{ "label": "Intro — 3 Classes", "kind": "package", "qty": 1, "unitPrice": 45 }],
    "createdAt": "…"
  }]
}`,
    }],
  },
];

const methodTone: Record<string, string> = { GET: "bg-green-wash text-green", POST: "bg-blue-wash text-blue" };

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl bg-[#16181d] p-4 font-mono text-[12.5px] leading-relaxed text-[#c9d4e3]">{children}</pre>;
}

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line-2 bg-surface">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="font-display text-[19px] font-extrabold tracking-tight">
            STUDIO<span className="text-brand">NEXIS</span> <span className="ml-2 rounded-full bg-line-2 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-ink-2">API v1</span>
          </div>
          <a href="/login" className="text-[13px] font-bold text-brand hover:underline">Studio login →</a>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] gap-10 px-6 py-10">
        {/* Sidebar */}
        <nav className="sticky top-8 hidden h-fit w-[210px] shrink-0 lg:block">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Getting started</div>
          <ul className="mb-5 mt-2 space-y-1 border-l border-line-2">
            {[["intro", "Introduction"], ["auth", "Authentication"], ["errors", "Errors & limits"], ["automation", "Make.com & Zapier"]].map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="block border-l-2 border-transparent py-1 pl-3.5 text-[13px] font-semibold text-ink-2 hover:border-brand hover:text-ink">{label}</a></li>
            ))}
          </ul>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Endpoints</div>
          <ul className="mt-2 space-y-1 border-l border-line-2">
            {SECTIONS.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="block border-l-2 border-transparent py-1 pl-3.5 text-[13px] font-semibold text-ink-2 hover:border-brand hover:text-ink">{s.title}</a></li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 space-y-12">
          <section id="intro">
            <h1 className="font-display text-[34px] font-extrabold tracking-tight">StudioNexis API</h1>
            <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-ink-2">
              A simple REST API for your studio&apos;s data — clients, classes, bookings, packages and sales.
              Use it from your own tools, spreadsheets, or no-code platforms like <b>Make.com</b> and <b>Zapier</b>.
              All requests use JSON over HTTPS.
            </p>
            <Code>{`Base URL:  https://app.nexis.revsports.ca/api/v1`}</Code>
            <div className="mt-5"><ApiKeyBox /></div>
          </section>

          <section id="auth">
            <h2 className="font-display text-[24px] font-extrabold tracking-tight">Authentication</h2>
            <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-2">
              Generate a key in your dashboard under <b>Settings → API</b>. Send it with every request in the
              <code className="mx-1 rounded bg-line-2 px-1.5 py-0.5 font-mono text-[12px]">Authorization</code> header.
              The key grants full access to that one studio — treat it like a password and regenerate it if it leaks.
            </p>
            <Code>{`curl https://app.nexis.revsports.ca/api/v1/me \\
  -H "Authorization: Bearer nx_live_your_key_here"`}</Code>
          </section>

          <section id="errors">
            <h2 className="font-display text-[24px] font-extrabold tracking-tight">Errors & rate limits</h2>
            <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-2">
              Errors always return this shape, with conventional HTTP status codes. The limit is <b>120 requests per minute</b> per key (HTTP 429 beyond that).
            </p>
            <Code>{`{ "error": { "code": "not_enough_spots", "message": "Not enough spots left for that seat count." } }

401 unauthorized · 403 plan_limit / suspended · 404 not_found
409 already_booked / not_enough_spots · 422 validation · 429 rate_limited`}</Code>
          </section>

          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="font-display text-[24px] font-extrabold tracking-tight">{s.title}</h2>
              {s.intro && <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-2">{s.intro}</p>}
              <div className="mt-5 space-y-8">
                {s.endpoints.map((e) => (
                  <div key={e.method + e.path} className="rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`rounded-lg px-2.5 py-1 font-mono text-[12px] font-bold ${methodTone[e.method]}`}>{e.method}</span>
                      <code className="font-mono text-[14px] font-bold text-ink">{e.path}</code>
                    </div>
                    <h3 className="mt-2.5 text-[16px] font-bold">{e.title}</h3>
                    <p className="mt-1 max-w-[600px] text-[13.5px] leading-relaxed text-ink-2">{e.desc}</p>
                    {(e.params?.length || e.body?.length) ? (
                      <table className="mt-4 w-full text-left">
                        <thead><tr className="border-b border-line-2">
                          {["Field", "Type", "Description"].map((h) => <th key={h} className="pb-2 pr-4 text-[10.5px] font-bold uppercase tracking-wider text-muted">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {[...(e.params ?? []), ...(e.body ?? [])].map((f) => (
                            <tr key={f.name} className="border-b border-line-2 last:border-0">
                              <td className="py-2 pr-4 font-mono text-[12.5px] font-bold text-ink">{f.name}{f.req && <span className="text-rose"> *</span>}</td>
                              <td className="py-2 pr-4 font-mono text-[12px] text-muted">{f.type}</td>
                              <td className="py-2 text-[13px] text-ink-2">{f.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    <div className="mt-4">
                      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">Example response</div>
                      <Code>{e.response}</Code>
                    </div>
                    <TryIt method={e.method} path={e.path} params={e.tryParams} defaultBody={e.tryBody} />
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section id="automation">
            <h2 className="font-display text-[24px] font-extrabold tracking-tight">Make.com & Zapier</h2>
            <div className="mt-3 max-w-[680px] space-y-3 text-[14px] leading-relaxed text-ink-2">
              <p>Both platforms can call this API directly — no special app needed:</p>
              <p><b>Make.com</b>: add an <i>HTTP → Make a request</i> module. Set the URL to any endpoint above, method GET/POST, and add a header <code className="rounded bg-line-2 px-1.5 py-0.5 font-mono text-[12px]">Authorization: Bearer nx_live_…</code>. Parse response = yes. From there, map the JSON into Sheets, WhatsApp, email — anything.</p>
              <p><b>Zapier</b>: use <i>Webhooks by Zapier → Custom Request</i> with the same URL + header.</p>
              <p className="rounded-xl border border-line-2 bg-raised px-4 py-3 text-[13px]"><b>Coming soon:</b> outgoing webhooks — we push events (new booking, new client, sale) to your Make/Zapier scenario the moment they happen, so you won&apos;t need to poll.</p>
            </div>
          </section>

          <footer className="border-t border-line-2 pt-6 text-[12px] text-muted">
            StudioNexis API v1 · Questions? Request features from your dashboard → Plan &amp; Billing → Custom features.
          </footer>
        </main>
      </div>
    </div>
  );
}
