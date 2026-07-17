import { notFound } from "next/navigation";
import { CalendarDays, Hexagon, CheckCircle2, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { CustomerNav } from "@/components/customer/nav";

export const dynamic = "force-dynamic";

const input = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:ring-4";
const microLabel = "mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted";

export default async function AccountPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { slug } = await params;
  const { error, ok } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const brand = tenant.brandColor || "#F97316";
  const cs = await getCustomerSession();
  const authed = cs && cs.tenantId === tenant.id;

  const client = authed
    ? await db.client.findFirst({
        where: { id: cs!.clientId, tenantId: tenant.id },
        include: {
          _count: { select: { bookings: true } },
          packages: { where: { creditsLeft: { gt: 0 }, frozen: false, expiresAt: { gt: new Date() } } },
          bookings: { where: { status: "CHECKED_IN" }, select: { id: true } },
        },
      })
    : null;

  return (
    <div className="min-h-screen bg-canvas">
      <CustomerNav slug={slug} active="account" brand={brand} />
      <main className="mx-auto max-w-[760px] px-4 py-8 sm:px-6">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink">My Account</h1>
        <p className="mt-1 text-sm text-muted">Manage your profile and preferences.</p>

        {ok === "pw" && <div className="mt-5 rounded-2xl border border-green/20 bg-green-wash px-4 py-3 text-[13px] font-bold text-green">Password updated.</div>}
        {ok === "profile" && <div className="mt-5 rounded-2xl border border-green/20 bg-green-wash px-4 py-3 text-[13px] font-bold text-green">Profile saved.</div>}
        {error && (
          <div className="mt-5 rounded-2xl border border-rose/20 bg-rose/5 px-4 py-3 text-[13px] font-medium text-rose">
            {error === "bad" ? "Wrong contact or password." : error === "haspw" ? "You already have an account — sign in instead." : error === "badpw" ? "Current password didn't match." : "Fill everything in (password 6+ characters)."}
          </div>
        )}

        {!client ? (
          <div className="mt-6 overflow-hidden rounded-3xl border border-line-2 shadow-[var(--shadow-card)] lg:grid lg:min-h-[540px] lg:grid-cols-[1.05fr_1fr]">
            {/* Brand panel — the old-system split look */}
            <div className="relative hidden flex-col justify-center p-12 text-white lg:flex" style={{ background: "linear-gradient(150deg, #221c15, #16130f 55%, #2a2118)" }}>
              {(() => {
                const w = (tenant.website ?? {}) as { heroImage?: string; tagline?: string };
                return (
                  <>
                    {w.heroImage && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={w.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
                        <div className="absolute inset-0 bg-black/45" />
                      </>
                    )}
                    <div className="relative">
                      <div className="grid size-12 place-items-center rounded-full text-[18px] font-extrabold" style={{ background: brand }}>{tenant.name[0]}</div>
                      <h2 className="mt-8 font-serif text-[44px] font-medium leading-[1.12]">Move better.<br />Feel stronger.<br />Live brighter.</h2>
                      <p className="mt-5 max-w-[300px] text-[14px] leading-relaxed text-white/70">{w.tagline || `Welcome back. Your next session at ${tenant.name} awaits.`}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            {/* Forms */}
            <div className="bg-surface p-8 sm:p-10">
              <h2 className="font-display text-[24px] font-extrabold tracking-tight text-ink">Welcome back</h2>
              <p className="mt-1 text-[13px] text-muted">Log in to continue your practice.</p>
              <form method="post" action="/api/public/customer" className="mt-5 space-y-3">
                <input type="hidden" name="mode" value="login" />
                <input type="hidden" name="slug" value={slug} />
                <div><label className={microLabel}>Email or phone</label><input name="contact" required placeholder="you@example.com" className={input} /></div>
                <div><label className={microLabel}>Password</label><input name="password" type="password" required placeholder="••••••••" className={input} /></div>
                <button className="h-12 w-full rounded-xl text-[14.5px] font-bold text-white" style={{ background: "#17181C" }}>Log In</button>
              </form>
              <div className="my-7 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-line-2" /> New here? <span className="h-px flex-1 bg-line-2" /></div>
              <form method="post" action="/api/public/customer" className="space-y-3">
                <input type="hidden" name="mode" value="register" />
                <input type="hidden" name="slug" value={slug} />
                <input name="name" required placeholder="Your name" className={input} />
                <input name="contact" required placeholder="Email or phone" className={input} />
                <input name="password" type="password" required minLength={6} placeholder="Choose a password (6+)" className={input} />
                <button className="h-12 w-full rounded-xl text-[14.5px] font-bold text-white" style={{ background: brand }}>Sign Up</button>
                <p className="text-center text-[11.5px] text-muted">We&apos;ll link your booking history automatically.</p>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div className="mt-6 flex items-center gap-5 rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
              <div className="grid size-[72px] shrink-0 place-items-center rounded-full text-[24px] font-extrabold text-white" style={{ background: brand }}>
                {client.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <div className="font-display text-[24px] font-extrabold tracking-tight text-ink">{client.name}</div>
                <div className="text-[13px] text-muted">{client.email ?? client.phone}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-line-2 px-3 py-1 text-[11.5px] font-bold text-ink-2">
                    <Clock className="size-3.5" /> Member since {client.memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-wash px-3 py-1 text-[11.5px] font-bold text-green">
                    <CheckCircle2 className="size-3.5" /> Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {([
                [CalendarDays, String(client._count.bookings), "Total Bookings"],
                [Hexagon, String(client.packages.reduce((s, p) => s + p.creditsLeft, 0)), "Credits Available"],
                [CheckCircle2, String(client.bookings.length), "Classes Attended"],
              ] as const).map(([Icon, v, l]) => (
                <div key={l} className="flex items-center gap-3 rounded-2xl border border-line-2 bg-surface p-4 shadow-[var(--shadow-card)]">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `${brand}1a`, color: brand }}>
                    <Icon className="size-4.5" />
                  </div>
                  <div>
                    <div className="font-display text-[20px] font-extrabold leading-tight text-ink">{v}</div>
                    <div className="text-[11px] text-muted">{l}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Personal information */}
            <div className="mt-4 rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-[17px] font-extrabold text-ink">Personal Information</h2>
              <form method="post" action="/api/public/customer" className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input type="hidden" name="mode" value="profile" />
                <input type="hidden" name="slug" value={slug} />
                <div>
                  <label className={microLabel}>Full name</label>
                  <input name="name" required defaultValue={client.name} className={input} />
                </div>
                <div>
                  <label className={microLabel}>Phone</label>
                  <input name="phone" defaultValue={client.phone ?? ""} className={input} />
                </div>
                <div className="sm:col-span-2">
                  <label className={microLabel}>Email</label>
                  <input defaultValue={client.email ?? ""} disabled className={`${input} bg-raised text-muted`} />
                  <p className="mt-1 text-[11.5px] text-muted">Email can&apos;t be changed here — ask the studio to update it.</p>
                </div>
                <div>
                  <button className="rounded-[10px] px-6 py-2.5 text-sm font-bold text-white" style={{ background: "#17181C" }}>Save</button>
                </div>
              </form>
            </div>

            {/* Security */}
            <div className="mt-4 rounded-2xl border border-line-2 bg-surface p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-[17px] font-extrabold text-ink">Security</h2>
              <form method="post" action="/api/public/customer" className="mt-4 grid max-w-[440px] gap-2.5">
                <input type="hidden" name="mode" value="password" />
                <input type="hidden" name="slug" value={slug} />
                <input name="currentPassword" type="password" required placeholder="Current password" className={input} />
                <input name="newPassword" type="password" required minLength={6} placeholder="New password (6+)" className={input} />
                <button className="h-10 w-fit rounded-[10px] px-5 text-[13px] font-bold text-white" style={{ background: brand }}>Update password</button>
              </form>
            </div>

            <form method="post" action="/api/public/customer" className="mt-8 text-center">
              <input type="hidden" name="mode" value="logout" />
              <input type="hidden" name="slug" value={slug} />
              <button className="text-[13.5px] font-bold text-rose hover:underline">[→ Log Out</button>
            </form>
          </>
        )}

        <footer className="mt-10 text-center text-[11.5px] text-muted">
          Powered by <span className="font-bold">STUDIO<span style={{ color: brand }}>NEXIS</span></span>
        </footer>
      </main>
    </div>
  );
}
