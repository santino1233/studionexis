import { Search, Plus, Bell } from "lucide-react";

export function Topbar() {
  const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line-2 bg-canvas/80 px-6 backdrop-blur-md">
      <div className="relative ml-auto hidden w-[280px] md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          placeholder="Find a client…"
          className="h-9 w-full rounded-xl border border-line-2 bg-surface pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </div>
      <span className="hidden text-[13px] font-medium text-muted sm:block">{date}</span>
      <button className="grid size-9 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-ink" aria-label="New">
        <Plus className="size-[18px]" />
      </button>
      <button className="relative grid size-9 place-items-center rounded-full text-ink-2 hover:bg-line-2" aria-label="Notifications">
        <Bell className="size-[18px]" />
      </button>
      <div className="grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-white">A</div>
    </header>
  );
}
