"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="text-center">
        <div className="font-display text-[52px] font-extrabold leading-none tracking-tight text-line">Oops</div>
        <h1 className="mt-3 font-display text-[22px] font-extrabold text-ink">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-[340px] text-[13.5px] text-muted">
          It&apos;s us, not you. Try again — if it keeps happening, we&apos;re probably already on it.
        </p>
        <button onClick={reset} className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
          Try again
        </button>
        <div className="mt-10 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          STUDIO<span className="text-brand">NEXIS</span>
        </div>
      </div>
    </div>
  );
}
