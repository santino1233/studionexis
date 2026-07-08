import { cn } from "@/lib/cn";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Tone = "o" | "p" | "g" | "b";

const toneMap: Record<Tone, string> = {
  o: "bg-brand-wash text-brand",
  p: "bg-purple-wash text-purple",
  g: "bg-green-wash text-green",
  b: "bg-blue-wash text-blue",
};

export function Kpi({
  icon: Icon,
  tone = "o",
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  label: string;
  value: string;
  delta?: { value: string; up?: boolean };
}) {
  return (
    <div className="rounded-2xl border border-line-2 bg-surface p-[18px] shadow-[var(--shadow-card)]">
      <div className="mb-3.5 flex items-center justify-between">
        <div className={cn("grid size-[42px] place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="size-5" />
        </div>
        {delta && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", delta.up === false ? "text-rose" : "text-green")}>
            {delta.up === false ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
            {delta.value}
          </span>
        )}
      </div>
      <div className="mb-0.5 text-[12.5px] font-medium text-muted">{label}</div>
      <div className="font-display text-[27px] font-extrabold tracking-tight text-ink">{value}</div>
    </div>
  );
}
