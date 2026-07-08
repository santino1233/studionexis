import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCustomerSession } from "@/lib/customer-auth";
import { timeInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const input = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:ring-4";

export default async function CustomerPortal({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const tenant = await db.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const session = await getCustomerSession();
  const authed = session && session.slug === slug;

  const pol = (tenant.policies ?? {}) as { cancelWindowGroupHours?: number; cancelWindowPrivateHours?: number };

  const client = authed
    ? await db.client.findFirst({
        where: { id: session.clientId, tenantId: tenant.id },
        include: {
          packages: { where: { creditsLeft: { gt: 0 }, expiresAt: { gt: new Date() } }, include: { package: true } },
          bookings: {
            where: { session: { startsAt: { gt: new Date(Date.now() - 86400_000) } } },
            include: { session: { include: { classType: true } } },
            orderBy: { session: { startsAt: "asc" } },
          },
        },
      })
    : null;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[720px] items-center justify-between px-5 py-5">
          <div>
            <div className="font-display text-[22px] font-extrabold tracking-tight text-ink">{tenant.name}</div>
            <div className="text-[12px] text-muted">My account</div>
          </div>
          <Link href={`/book/${slug}`} className="text-[13px] font-bold" style={{ color: brand }}>← Classes</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-5 py-8">
        {!client ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {error && (
              <div className="sm:col-span-2 rounded-2xl border border-rose/20 bg-rose/5 px-4 py-3 text-[13px] font-medium text-rose">
                {error === "bad" ? "Wrong contact or password." : error === "haspw" ? "You already have an account — sign in instead." : "Fill everything in (password 6+ characters)."}
              </div>
            )}
            <div className="rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-[17px] font-extrabold text-ink">Sign in</h2>
              <form method="post" action="/api/public/customer" className="mt-4 space-y-3">
                <input type="hidden" name="mode" value="login" />
                <input type="hidden" name="slug" value={slug} />
                <input name="contact" required placeholder="Email or phone" className={input} />
                <input name="password" type="password" required placeholder="Password" className={input} />
                <button className="h-11 w-full rounded-[10px] text-sm font-bold text-white" style={{ background: brand }}>Sign in</button>
              </form>
            </div>
            <div className="rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
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
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-display text-[24px] font-extrabold tracking-tight text-ink">Hi, {client.name.split(" ")[0]} 👋</h1>
              <form method="post" action="/api/public/customer">
                <input type="hidden" name="mode" value="logout" />
                <input type="hidden" name="slug" value={slug} />
                <button className="text-[12.5px] font-bold text-muted hover:text-ink">Sign out</button>
              </form>
            </div>

            {/* Credits */}
            <div className="mb-6 rounded-2xl border border-line-2 bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 font-display text-[15px] font-extrabold text-ink">My credits</div>
              {client.packages.length === 0 ? (
                <p className="text-[13px] text-muted">No active packages — ask at the studio about class packs.</p>
              ) : (
                <ul className="space-y-2">
                  {client.packages.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-xl bg-raised px-4 py-3">
                      <div>
                        <div className="text-[13.5px] font-semibold text-ink">{p.package.name}{p.frozen ? " (frozen)" : ""}</div>
                        <div className="text-[11.5px] text-muted">Expires {p.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </div>
                      <div className="font-display text-[19px] font-extrabold" style={{ color: brand }}>{p.creditsLeft}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upcoming bookings */}
            <div className="rounded-2xl border border-line-2 bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 font-display text-[15px] font-extrabold text-ink">My bookings</div>
              {client.bookings.length === 0 ? (
                <p className="text-[13px] text-muted">Nothing booked — <Link href={`/book/${slug}`} className="font-bold" style={{ color: brand }}>browse classes</Link>.</p>
              ) : (
                <ul className="space-y-2">
                  {client.bookings.map((b) => {
                    const windowH = b.session.classType.kind === "PRIVATE" ? pol.cancelWindowPrivateHours ?? 3 : pol.cancelWindowGroupHours ?? 3;
                    const hoursOut = (b.session.startsAt.getTime() - Date.now()) / 3600_000;
                    const cancellable = (b.status === "BOOKED" || b.status === "WAITLIST") && hoursOut >= windowH;
                    const past = b.session.startsAt < new Date();
                    return (
                      <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-raised px-4 py-3">
                        <div>
                          <div className="text-[13.5px] font-semibold text-ink">
                            {b.session.classType.name}
                            <span className="ml-2 rounded-full bg-line-2 px-2 py-0.5 text-[10.5px] font-bold capitalize text-ink-2">{b.status.toLowerCase().replace("_", " ")}</span>
                          </div>
                          <div className="text-[11.5px] text-muted">
                            {b.session.startsAt.toLocaleDateString("en-US", { timeZone: tenant.timezone, weekday: "short", month: "short", day: "numeric" })} · {timeInTz(b.session.startsAt, tenant.timezone)}
                          </div>
                        </div>
                        {!past && (b.status === "BOOKED" || b.status === "WAITLIST") && (
                          cancellable ? (
                            <form method="post" action="/api/public/customer">
                              <input type="hidden" name="mode" value="cancel" />
                              <input type="hidden" name="slug" value={slug} />
                              <input type="hidden" name="bookingId" value={b.id} />
                              <button className="rounded-lg bg-line-2 px-3 py-1.5 text-[11.5px] font-bold text-ink-2 hover:bg-rose/10 hover:text-rose">Cancel</button>
                            </form>
                          ) : (
                            <span className="text-[11px] font-semibold text-muted">Within {windowH}h window — call the studio</span>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
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
