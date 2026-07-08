import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="text-center">
        <div className="font-display text-[64px] font-extrabold leading-none tracking-tight text-line">404</div>
        <h1 className="mt-3 font-display text-[22px] font-extrabold text-ink">That page doesn&apos;t exist</h1>
        <p className="mx-auto mt-2 max-w-[340px] text-[13.5px] text-muted">
          The link may be old, or the studio it belonged to has moved.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">
          Take me home
        </Link>
        <div className="mt-10 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          STUDIO<span className="text-brand">NEXIS</span>
        </div>
      </div>
    </div>
  );
}
