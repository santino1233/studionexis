import Link from "next/link";
import { User } from "lucide-react";

const tabs = [
  ["book", "Book a Class"],
  ["packages", "Buy Packages"],
  ["bookings", "My Bookings"],
  ["my-packages", "My Packages"],
] as const;

export function CustomerNav({ slug, active, brand }: { slug: string; active: string; brand: string }) {
  const href = (t: string) => (t === "book" ? `/book/${slug}` : `/book/${slug}/${t}`);
  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1100px] items-center justify-center gap-1 px-4 sm:gap-6">
        {tabs.map(([t, label]) => (
          <Link
            key={t}
            href={href(t)}
            className={`whitespace-nowrap border-b-2 px-2 py-4 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors sm:text-[13px] ${
              active === t ? "text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
            style={active === t ? { borderColor: brand } : undefined}
          >
            {label}
          </Link>
        ))}
        <Link href={`/book/${slug}/account`} aria-label="My account"
          className={`ml-1 grid size-9 place-items-center rounded-full transition-colors ${active === "account" ? "text-white" : "bg-line-2 text-ink-2 hover:text-ink"}`}
          style={active === "account" ? { background: brand } : undefined}>
          <User className="size-4" />
        </Link>
      </div>
    </nav>
  );
}
