import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";

// Multi-location management (Phase 1). Owner creates locations and hops between
// them. Each location is fully isolated; sync is a later, opt-in feature.
export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const { created, error } = await searchParams;
  const auth = await getSession();
  const tenant = await getCurrentTenant();
  if (!auth || auth.role !== "OWNER") {
    return <div className="mx-auto max-w-[560px] rounded-2xl border border-line-2 bg-surface p-8 text-center text-sm text-muted">Only the account owner can manage locations.</div>;
  }

  const locations = tenant.organizationId
    ? await db.tenant.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, slug: true, locationLabel: true, status: true, customDomain: true } })
    : [{ id: tenant.id, name: tenant.name, slug: tenant.slug, locationLabel: tenant.locationLabel, status: tenant.status, customDomain: tenant.customDomain }];

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Locations</h1>
      <p className="mt-1 text-sm text-muted">
        {tenant.organizationId
          ? "Hop between your locations. Each one keeps its own clients, schedule and payments."
          : "Run a franchise or a second studio? Add a location to manage them all from one login."}
      </p>
      {created && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Location created — it&apos;s live and fully separate from your other locations.</div>}
      {error && <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">{error === "missing" ? "Give the location a name first." : "Something went wrong — please try again."}</div>}

      <div className="mt-6 space-y-3">
        {locations.map((l) => {
          const isCurrent = l.id === tenant.id;
          return (
            <div key={l.id} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${isCurrent ? "border-brand/40 bg-brand-wash/40" : "border-line-2 bg-surface"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-bold text-ink">{l.locationLabel || l.name}</span>
                  {isCurrent && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">You&apos;re here</span>}
                  {l.status !== "ACTIVE" && <span className="rounded-full bg-line-2 px-2 py-0.5 text-[10px] font-bold text-muted">{l.status}</span>}
                </div>
                <a href={publicSiteUrl(l)} target="_blank" className="text-[12px] font-medium text-muted hover:text-brand">{(l.customDomain || `${l.slug}.nexis.revsports.ca`)} ↗</a>
              </div>
              {!isCurrent && (
                <form method="post" action="/api/location/switch">
                  <input type="hidden" name="to" value={l.id} />
                  <button className="shrink-0 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-bold text-canvas hover:opacity-90">Switch here →</button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-line-2 bg-surface p-5">
        <h2 className="text-[15px] font-extrabold text-ink">➕ Add a location</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
          Creates a brand-new studio under your account — its own booking site, clients and schedule, using your same login.
          It starts completely separate. (Sharing clients or credits between locations is coming soon, and will always be your choice.)
        </p>
        <form method="post" action="/api/location/create" className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input name="label" required placeholder="Location name — e.g. Downtown" className={field} />
          <button name="switch" value="1" className="shrink-0 rounded-[10px] bg-brand px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-ink">Create &amp; open</button>
        </form>
      </div>
    </div>
  );
}
