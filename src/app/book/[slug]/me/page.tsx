import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { timeInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const input = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:ring-4";

const statusTone: Record<string, string> = {
  BOOKED: "bg-blue-wash text-blue",
  CHECKED_IN: "bg-green-wash text-green",
  WAITLIST: "bg-brand-wash text-brand",
  CANCELLED: "bg-line-2 text-muted",
  LATE_CANCEL: "bg-rose/10 text-rose",
  NO_SHOW: "bg-rose/10 text-rose",
};
const statusLabel: Record<string, string> = {
  BOOKED: "booked", CHECKED_IN: "attended", WAITLIST: "waitlist",
  CANCELLED: "cancelled", LATE_CANCEL: "late cancel", NO_SHOW: "no show",
};

export default async function CustomerPortal({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { slug } = await params;
  const { error, ok } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const session = await getCustomerSession();
  const authed = session && session.slug === slug;

  const pol = (tenant.policies ?? {}) as { cancelWindowGroupHours?: number; cancelWindowPrivateHours?: number };

  const client = authed
    ? await db.client.findFirst({
        where: { id: session.clientId, tenantId: tenant.id },
        include: {
          packages: { include: { package: true }, orderBy: { createdAt: "desc" } },
          bookings: {
            include: { session: { include: { classType: true, instructor: true } } },
            orderBy: { session: { startsAt: "desc" } },
            take: 80,
          },
        },
      })
    : null;

  const now = new Date();
  const activePkgs = client?.packages.filter((p) => p.creditsLeft > 0 && p.expiresAt > now) ?? [];
  const upcoming = (client?.bookings ?? [])
    .filter((b) => b.session.startsAt > now && (b.status === "BOOKED" || b.status === "WAITLIST" || b.status === "CHECKED_IN"))
    .sort((a, b) => a.session.startsAt.getTime() - b.session.startsAt.getTime());
  const history = (client?.bookings ?? []).filter((b) => b.session.startsAt <= now).slice(0, 30);
  const attended = history.filter((b) => b.status === "CHECKED_IN").length;

  const card = "rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]";
  const cardTitle = "font-display text-[15px] font-extrabold text-ink";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-5 py-5">
          <div>
            <div className="font-display text-[22px] font-extrabold tracking-tight text-ink">{tenant.name}</div>
            <div className="text-[12px] text-muted">My account</div>
          </div>
          <Link href={`/book/${slug}`} className="rounded-xl px-4 py-2 text-[13px] font-bold text-white" style={{ background: brand }}>Book a class</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-5 py-8">
        {ok === "pw" && <div className="mb-5 rounded-2xl border border-green/20 bg-green-wash px-4 py-3 text-[13px] font-bold text-green">Password updated.</div>}
        {error && (
          <div className="mb-5 rounded-2xl border border-rose/20 bg-rose/5 px-4 py-3 text-[13px] font-medium text-rose">
            {error === "bad" ? "Wrong contact or password." : error === "haspw" ? "You already have an account — sign in instead." : error === "badpw" ? "Current password didn't match." : "Fill everything in (password 6+ characters)."}
          </div>
        )}

        {!client ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className={`${card} p-6`}>
              <h2 className="font-display text-[17px] font-extrabold text-ink">Sign in</h2>
              <form method="post" action="/api/public/customer" className="mt-4 space-y-3">
                <input type="hidden" name="mode" value="login" />
                <input type="hidden" name="slug" value={slug} />
                <input name="contact" required placeholder="Email or phone" className={input} />
                <input name="password" type="password" required placeholder="Password" className={input} />
                <button className="h-11 w-full rounded-[10px] text-sm font-bold text-white" style={{ background: brand }}>Sign in</button>
              </form>
            </div>
            <div className={`${card} p-6`}>
              <h2 className="font-display text-[17px] font-extrabold text-ink">First time here?</h2>
              <p className="mt-1 text-[12.5px] text-muted">Use the email or phone you book with — your history links up automatically.</p>
              <form method="post" action="/api/public/customer" className="mt-4 space-y-3">
                <input type="hidden" name="mode" value="register" />
                <input type="hidden" name="slug" value={slug} />
                <input name="name" placeholder="Your name" className={input} />
                <input name="contact" required placeholder="Email or phone" className={input} />
                <input name="password" type="password" required minLength={6} placeholder="Choose a password (6+)" className={input} />
                <button className="h-11 w-full rounded-[10px] border text-sm font-bold" style={{ borderColor: brand, color: brand }}>Create account</button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Greeting + stat strip */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-display text-[24px] font-extrabold tracking-tight text-ink">Hi, {client.name.split(" ")[0]} 👋</h1>
              <form method="post" action="/api/public/customer">
                <input type="hidden" name="mode" value="logout" />
                <input type="hidden" name="slug" value={slug} />
                <button className="text-[12.5px] font-bold text-muted hover:text-ink">Sign out</button>
              </form>
            </div>
            <div className="mb-6 grid grid-cols-3 gap-3">
              {([
                ["Credits left", String(activePkgs.reduce((s, p) => s + p.creditsLeft, 0))],
                ["Classes attended", String(attended)],
                ["Member since", client.memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })],
              ] as const).map(([l, v]) => (
                <div key={l} className={`${card} px-4 py-3.5 text-center`}>
                  <div className="font-display text-[20px] font-extrabold" style={{ color: brand }}>{v}</div>
                  <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wider text-muted">{l}</div>
                </div>
              ))}
            </div>

            {/* My packages — with usage bars like the original */}
            <div className={`${card} mb-5 p-5`}>
              <div className={`mb-3 ${cardTitle}`}>My packages</div>
              {client.packages.length === 0 ? (
                <p className="text-[13px] text-muted">No packages yet — ask at the studio about class packs.</p>
              ) : (
                <ul className="space-y-3">
                  {client.packages.slice(0, 6).map((p) => {
                    const total = p.package.credits;
                    const used = Math.max(0, total - p.creditsLeft);
                    const expired = p.expiresAt <= now;
                    const dead = expired || p.creditsLeft === 0;
                    return (
                      <li key={p.id} className={`rounded-xl bg-raised px-4 py-3 ${dead ? "opacity-55" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-[13.5px] font-semibold text-ink">
                            {p.package.name}
                            {p.frozen && <span className="ml-2 rounded-full bg-blue-wash px-2 py-0.5 text-[10px] font-bold text-blue">frozen</span>}
                            {expired && <span className="ml-2 rounded-full bg-line-2 px-2 py-0.5 text-[10px] font-bold text-muted">expired</span>}
                          </div>
                          <div className="text-[13px] font-bold text-ink">{p.creditsLeft}<span className="text-muted">/{total}</span></div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-2">
                          <div className="h-full rounded-full" style={{ width: `${total ? (p.creditsLeft / total) * 100 : 0}%`, background: brand }} />
                        </div>
                        <div className="mt-1.5 text-[11px] text-muted">
                          {used} used · {expired ? "expired" : `valid until ${p.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Upcoming */}
            <div className={`${card} mb-5 p-5`}>
              <div className={`mb-3 ${cardTitle}`}>Upcoming</div>
              {upcoming.length === 0 ? (
                <p className="text-[13px] text-muted">Nothing booked — <Link href={`/book/${slug}`} className="font-bold" style={{ color: brand }}>browse classes</Link>.</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((b) => {
                    const windowH = b.session.classType.kind === "PRIVATE" ? pol.cancelWindowPrivateHours ?? 3 : pol.cancelWindowGroupHours ?? 3;
                    const cancellable = (b.status === "BOOKED" || b.status === "WAITLIST") && (b.session.startsAt.getTime() - Date.now()) / 3600_000 >= windowH;
                    return (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-raised px-4 py-3">
                        <div>
                          <div className="text-[13.5px] font-semibold text-ink">
                            {b.session.classType.name}
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
                          </div>
                          <div className="text-[11.5px] text-muted">
                            {b.session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric" })} · {timeInTz(b.session.startsAt, tenant.timezone)}
                            {b.session.instructor ? ` · ${b.session.instructor.name.split(" ")[0]}` : ""}
                          </div>
                        </div>
                        {cancellable ? (
                          <form method="post" action="/api/public/customer">
                            <input type="hidden" name="mode" value="cancel" />
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button className="rounded-lg bg-line-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">Cancel</button>
                          </form>
                        ) : (b.status === "BOOKED" || b.status === "WAITLIST") ? (
                          <span className="text-[11px] font-semibold text-muted">Within {windowH}h — call the studio</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Session history */}
            <div className={`${card} mb-5 p-5`}>
              <div className={`mb-3 ${cardTitle}`}>Session history</div>
              {history.length === 0 ? (
                <p className="text-[13px] text-muted">Your past classes will show up here.</p>
              ) : (
                <ul className="divide-y divide-line-2">
                  {history.map((b) => (
                    <li key={b.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <span className="text-[13px] font-semibold text-ink">{b.session.classType.name}</span>
                        <span className="ml-2 text-[11.5px] text-muted">
                          {b.session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Account */}
            <div className={`${card} p-5`}>
              <div className={`mb-3 ${cardTitle}`}>Account</div>
              <div className="mb-4 grid grid-cols-1 gap-2 text-[13px] text-ink-2 sm:grid-cols-2">
                <div><span className="font-semibold text-ink">Name:</span> {client.name}</div>
                {client.phone && <div><span className="font-semibold text-ink">Phone:</span> {client.phone}</div>}
                {client.email && <div><span className="font-semibold text-ink">Email:</span> {client.email}</div>}
              </div>
              <details>
                <summary className="cursor-pointer text-[13px] font-bold" style={{ color: brand }}>Change password</summary>
                <form method="post" action="/api/public/customer" className="mt-3 grid max-w-[420px] gap-2.5">
                  <input type="hidden" name="mode" value="password" />
                  <input type="hidden" name="slug" value={slug} />
                  <input name="currentPassword" type="password" required placeholder="Current password" className={input} />
                  <input name="newPassword" type="password" required minLength={6} placeholder="New password (6+)" className={input} />
                  <button className="h-10 rounded-[10px] text-[13px] font-bold text-white" style={{ background: brand }}>Update password</button>
                </form>
              </details>
            </div>
          </>
        )}

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
