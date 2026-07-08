export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="font-display text-[26px] font-extrabold tracking-tight">
            <span className="text-ink">STUDIO</span>
            <span className="text-brand">NEXIS</span>
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Studio Management</div>
        </div>

        <div className="rounded-2xl border border-line-2 bg-surface p-7 shadow-[var(--shadow-card)]">
          <h1 className="font-display text-xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-1 text-[13px] text-muted">Sign in to your studio dashboard.</p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
              That email or password didn&apos;t match. Try again.
            </div>
          )}

          <form method="post" action="/api/login" className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Email</label>
              <input
                name="email" type="email" required autoComplete="email"
                className="h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
                placeholder="you@yourstudio.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Password</label>
              <input
                name="password" type="password" required autoComplete="current-password"
                className="h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                placeholder="••••••••"
              />
            </div>
            <button className="h-11 w-full rounded-[10px] bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-ink">
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-muted">Studio Nexis — the operating system for boutique studios.</p>
      </div>
    </div>
  );
}
