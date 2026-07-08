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
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
