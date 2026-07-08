import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-2 px-5 py-4">
      <div>
        {eyebrow && <div className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-brand">{eyebrow}</div>}
        <div className="font-display text-[16.5px] font-extrabold tracking-tight text-ink">{title}</div>
        {sub && <div className="mt-0.5 text-[13px] text-muted">{sub}</div>}
      </div>
      {action}
    </div>
  );
}
