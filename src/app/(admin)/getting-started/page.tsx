import Link from "next/link";
import { Check, Circle, PartyPopper, Sparkles } from "lucide-react";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Post-signup celebration + welcome (owner mockups screens 5–6).
export default async function GettingStartedPage() {
  const tenant = await getCurrentTenant();
  const session = await getSession();
  const ob = (((tenant.policies ?? {}) as Record<string, unknown>).onboarding ?? {}) as Record<string, string>;
  const firstName = (session?.name ?? "there").split(" ")[0];

  const rows: [string, string][] = [
    ["Studio name", tenant.name],
    ...(ob.studioType ? [["Studio type", ob.studioType] as [string, string]] : []),
    ...(ob.city || ob.country ? [["Location", [ob.city, ob.country].filter(Boolean).join(", ")] as [string, string]] : []),
    ...(ob.sizeBand ? [["Instructors", ob.sizeBand] as [string, string]] : []),
    ["Booking page", `${tenant.slug}.nexis.revsports.ca`],
  ];

  return (
    <div className="mx-auto max-w-[640px] py-6 text-center">
      <div className="relative mx-auto grid size-24 place-items-center">
        <span className="absolute -left-6 top-0"><Sparkles className="size-4 text-ink-2" /></span>
        <span className="absolute -right-8 top-4 text-brand"><Sparkles className="size-3.5" /></span>
        <span className="absolute -bottom-2 -left-10 text-brand"><Circle className="size-2.5 fill-current" /></span>
        <PartyPopper className="size-16 text-brand" />
      </div>
      <h1 className="mt-4 font-display text-[34px] font-extrabold tracking-tight text-ink">You&apos;re all set, {firstName}!</h1>
      <p className="mt-2 text-[15px] text-muted">Your all-in-one studio management platform is ready.</p>

      <div className="mx-auto mt-7 max-w-[460px] rounded-2xl border border-line-2 bg-surface p-6 text-left shadow-[var(--shadow-card)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Studio summary</div>
        <dl className="mt-3 space-y-2.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 text-[13.5px]">
              <dt className="text-muted">{k}</dt><dd className="font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto mt-6 grid max-w-[460px] grid-cols-2 gap-2 text-left">
        {[["Studio created", true], ["Profile completed", true], ["7-day trial active", true], ["Ready to go!", true]].map(([t]) => (
          <span key={String(t)} className="flex items-center gap-2 rounded-xl bg-green-wash px-3.5 py-2.5 text-[12.5px] font-bold text-green"><Check className="size-3.5 shrink-0" /> {t}</span>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        <Link href="/dashboard" className="rounded-xl bg-brand px-8 py-3.5 text-[14.5px] font-bold text-white shadow-md hover:bg-brand-ink">Go to Dashboard →</Link>
        <Link href="/website/setup" className="rounded-xl border border-line-2 bg-surface px-8 py-3.5 text-[14.5px] font-bold text-ink-2 hover:text-ink"><Sparkles className="inline size-4 -mt-0.5" /> Create my website</Link>
      </div>
      <p className="mt-5 text-[12.5px] text-muted">Next steps: add your <Link href="/class-types" className="font-bold text-brand hover:underline">class types</Link>, set up <Link href="/products" className="font-bold text-brand hover:underline">packages</Link>, and invite your <Link href="/team" className="font-bold text-brand hover:underline">team</Link>.</p>
    </div>
  );
}
