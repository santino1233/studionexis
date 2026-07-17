import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/site-url";
import { getPlan } from "@/lib/plans";
import { mrrOf } from "@/lib/hq";
import { orgSync, combinedMrr } from "@/lib/org";

export const dynamic = "force-dynamic";

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";

function Toggle({ name, on, label, note, danger }: { name: string; on: boolean; label: string; note: string; danger?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-2 p-3">
      <input type="checkbox" name={name} defaultChecked={on} className={`mt-0.5 size-4 ${danger ? "accent-rose-500" : "accent-[#F97316]"}`} />
      <span>
        <span className="block text-[13px] font-bold text-ink">{label}{danger && <span className="ml-1.5 rounded-full bg-rose/10 px-1.5 py-0.5 text-[9.5px] font-bold text-rose">money</span>}</span>
        <span className="block text-[11.5px] leading-snug text-muted">{note}</span>
      </span>
    </label>
  );
}

// Multi-location management. Owner creates locations, hops between them, and
// (opt-in) shares data across them. Each location is its own subscription.
export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string; saved?: string; copied?: string }> }) {
  const { created, error, saved, copied } = await searchParams;
  const auth = await getSession();
  const tenant = await getCurrentTenant();
  if (!auth || auth.role !== "OWNER") {
    return <div className="mx-auto max-w-[560px] rounded-2xl border border-line-2 bg-surface p-8 text-center text-sm text-muted">Only the account owner can manage locations.</div>;
  }

  const locations = tenant.organizationId
    ? await db.tenant.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "asc" } })
    : [tenant];
  const org = tenant.organizationId ? await db.organization.findUnique({ where: { id: tenant.organizationId } }) : null;
  const sync = orgSync(org?.policies);
  const total = combinedMrr(locations);
  const multi = locations.length > 1;

  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Locations</h1>
      <p className="mt-1 text-sm text-muted">
        {multi ? "Hop between your locations. Each one keeps its own clients, schedule and payments." : "Run a franchise or a second studio? Add a location to manage them all from one login."}
      </p>
      {created && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Location created — it&apos;s live and fully separate from your other locations.</div>}
      {saved && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Sharing settings saved.</div>}
      {copied !== undefined && <div className="mt-4 rounded-xl border border-green/20 bg-green-wash px-3.5 py-2.5 text-[13px] font-medium text-green">Copied {copied} class type{copied === "1" ? "" : "s"} to your other locations.</div>}
      {error && <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">{error === "missing" ? "Give the location a name first." : "Something went wrong — please try again."}</div>}

      {/* Locations list */}
      <div className="mt-6 space-y-3">
        {locations.map((l) => {
          const isCurrent = l.id === tenant.id;
          const plan = getPlan(l.plan);
          return (
            <div key={l.id} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${isCurrent ? "border-brand/40 bg-brand-wash/40" : "border-line-2 bg-surface"}`}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-bold text-ink">{l.locationLabel || l.name}</span>
                  {isCurrent && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">You&apos;re here</span>}
                  {l.status !== "ACTIVE" && <span className="rounded-full bg-line-2 px-2 py-0.5 text-[10px] font-bold text-muted">{l.status}</span>}
                </div>
                <a href={publicSiteUrl(l)} target="_blank" className="text-[12px] font-medium text-muted hover:text-brand">{(l.customDomain || `${l.slug}.nexis.revsports.ca`)} ↗</a>
                <div className="mt-0.5 text-[11.5px] text-muted">{plan.name} plan · ${mrrOf(l)}/mo</div>
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

      {/* Billing summary */}
      {multi && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line-2 bg-raised/50 px-4 py-3">
          <div className="text-[13px] font-bold text-ink">Combined subscription</div>
          <div className="text-[15px] font-extrabold text-ink">${total}<span className="text-[11px] font-bold text-muted">/mo · {locations.length} locations</span></div>
        </div>
      )}

      {/* Add a location */}
      <div className="mt-6 rounded-2xl border border-line-2 bg-surface p-5">
        <h2 className="text-[15px] font-extrabold text-ink">➕ Add a location</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
          Creates a brand-new studio under your account — its own booking site, clients and schedule, using your same login.
          It starts completely separate. <b className="text-ink">Each location is billed as its own subscription</b> (from ${getPlan(tenant.plan).monthly}/mo on your current plan).
        </p>
        <form method="post" action="/api/location/create" className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input name="label" required placeholder="Location name — e.g. Downtown" className={field} />
          <button name="switch" value="1" className="shrink-0 rounded-[10px] bg-brand px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-ink">Create &amp; open</button>
        </form>
      </div>

      {/* Sharing / sync settings — only relevant with 2+ locations */}
      {multi && (
        <div className="mt-6 rounded-2xl border border-line-2 bg-surface p-5">
          <h2 className="text-[15px] font-extrabold text-ink">🔗 Share between locations</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">Off by default — every location is independent. Turn on only what your franchise wants to share.</p>
          <form method="post" action="/api/settings" className="mt-3 space-y-2.5">
            <input type="hidden" name="section" value="org-sync" />
            <Toggle name="clients" on={!!sync.clients} label="Shared client directory" note="See and search clients across all locations (view-only for now)." />
            <Toggle name="classTypes" on={!!sync.classTypes} label="Shared class catalog" note="Keep the same class types available at every location." />
            <Toggle name="memberships" on={!!sync.memberships} label="Memberships valid anywhere" note="Show a client's memberships from other locations to your front desk." danger />
            <Toggle name="sharedCredits" on={!!sync.sharedCredits} label="Credits usable at any location" note="Front desk can see a client's package credits at other locations. Automatic cross-location redemption is being rolled out carefully — for now this makes them visible so staff can honour them." danger />
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-ink">Save sharing settings</button>
          </form>
          <div className="mt-4 border-t border-line-2 pt-4">
            <div className="text-[13px] font-bold text-ink">Copy class catalog now</div>
            <p className="mt-0.5 text-[11.5px] text-muted">Push this location&apos;s class types to your other locations (adds any that are missing — never overwrites).</p>
            <form method="post" action="/api/location/sync-catalog" className="mt-2">
              <button className="rounded-[10px] border border-line-2 px-4 py-2 text-[12.5px] font-bold text-ink-2 hover:text-ink">Copy catalog to other locations</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
