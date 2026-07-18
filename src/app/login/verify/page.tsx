import { redirect } from "next/navigation";
import { getPending2FA } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Second login step — enter the code we sent. No pending session ⇒ back to login.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const pending = await getPending2FA();
  if (!pending) redirect("/login");
  const masked = pending.channel === "email"
    ? pending.contact.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}•••${b}`)
    : pending.contact.replace(/.(?=.{2})/g, "•");

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="font-display text-[26px] font-extrabold tracking-tight">
            <span className="text-ink">STUDIO</span><span className="text-brand">NEXIS</span>
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Studio Management</div>
        </div>
        <div className="rounded-2xl border border-line-2 bg-surface p-7 shadow-[var(--shadow-card)]">
          <h1 className="font-display text-xl font-extrabold text-ink">Check your {pending.channel === "email" ? "email" : "phone"}</h1>
          <p className="mt-1 text-[13px] text-muted">We sent a 6-digit code to <b className="text-ink-2">{masked}</b>. Enter it to finish signing in.</p>
          {error && <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">{error === "code" ? "That code isn't right or has expired." : "Please try again."}</div>}
          <form method="post" action="/api/login/verify" className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Verification code</label>
              <input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={6} placeholder="123456"
                className="h-12 w-full rounded-[10px] border border-line bg-surface px-3.5 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
            </div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <input type="checkbox" name="trust" value="1" className="size-4 accent-[#F97316]" /> Save my info on this device for 30 days
            </label>
            <button className="h-11 w-full rounded-[10px] bg-brand text-sm font-bold text-white hover:bg-brand-ink">Verify &amp; sign in</button>
          </form>
          <form method="post" action="/api/login/verify" className="mt-3 text-center">
            <input type="hidden" name="resend" value="1" />
            <button className="text-[12.5px] font-bold text-muted hover:text-brand">Didn&apos;t get it? Resend code</button>
          </form>
        </div>
        <p className="mt-4 text-center text-[12px] text-muted"><a href="/login" className="font-bold hover:text-ink">← Back to login</a></p>
      </div>
    </div>
  );
}
