"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import {
  LayoutGrid, Calendar, Star, ClipboardList, BookOpen, Users, CreditCard,
  Hexagon, FileText, UserCog, LineChart, Settings, Wallet, LogOut, Globe, Coins,
} from "lucide-react";
import { canAccess } from "@/lib/access";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  { label: "My Portal", items: [{ href: "/dashboard", label: "Home", icon: LayoutGrid }] },
  { label: "Studio", items: [
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/classes", label: "Classes", icon: Star },
    { href: "/bookings", label: "Bookings", icon: ClipboardList },
    { href: "/class-types", label: "Class Types", icon: BookOpen },
  ]},
  { label: "Clients", items: [
    { href: "/inbox", label: "Inbox", icon: FileText },
    { href: "/clients", label: "Clients", icon: Users },
  ]},
  { label: "Sales", items: [
    { href: "/pos", label: "Point of Sale", icon: CreditCard },
    { href: "/products", label: "Products & Packages", icon: Hexagon },
    { href: "/invoices", label: "Invoices", icon: FileText },
  ]},
  { label: "Team & Insights", items: [
    { href: "/team", label: "Team", icon: UserCog },
    { href: "/analytics", label: "Analytics", icon: LineChart },
    { href: "/payroll", label: "Payroll", icon: Wallet },
    { href: "/expenses", label: "Expenses & P&L", icon: Wallet },
  ]},
  { label: "Workspace", items: [
    { href: "/website", label: "Website", icon: Globe },
    { href: "/apps", label: "App Store", icon: Hexagon },
    { href: "/support", label: "Support", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/billing", label: "Plan & Billing", icon: Wallet },
  ]},
];

export function Sidebar({ mobile = false, slug = "", role = "OWNER", chatUnread = 0 }: { mobile?: boolean; slug?: string; role?: string; chatUnread?: number }) {
  const pathname = usePathname();
  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items
        .concat(g.label === "My Portal" && role === "INSTRUCTOR" ? [{ href: "/my-earnings", label: "My Earnings", icon: Coins }] : [])
        .filter((it) => canAccess(role, it.href)),
    }))
    .filter((g) => g.items.length > 0);
  return (
    <aside className={cn("w-[236px] shrink-0 flex-col border-r border-line bg-surface", mobile ? "flex h-full" : "hidden lg:flex")}>
      <Link href="/dashboard" className="flex flex-col gap-0.5 px-[18px] pb-2 pt-5">
        <div className="font-display text-[21px] font-extrabold leading-none tracking-tight">
          <span className="text-ink">STUDIO</span>
          <span className="text-brand">NEXIS</span>
        </div>
        <div className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-muted">Studio Management</div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {visible.map((g) => (
          <div key={g.label}>
            <div className="mt-[18px] mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted">{g.label}</div>
            {g.items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "mx-0 my-px flex items-center gap-3 rounded-[10px] px-3 py-[9px] text-sm font-medium transition-colors",
                    active ? "bg-brand-wash font-semibold text-brand" : "text-ink-2 hover:bg-line-2 hover:text-ink",
                  )}
                >
                  <it.icon className={cn("size-[19px]", active ? "text-brand" : "opacity-85")} />
                  {it.label}
                  {it.href === "/inbox" && chatUnread > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{chatUnread}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-3 py-3">
        <Link href="/support" className="mb-2 block rounded-2xl border border-line-2 bg-raised p-3 transition-transform hover:-translate-y-px">
          <div className="text-[12.5px] font-bold text-ink">🧪 We&apos;re in beta</div>
          <div className="mt-0.5 text-[11px] leading-snug text-muted">Spotted something off? We&apos;d love your feedback — <span className="font-bold text-brand">report a bug →</span></div>
        </Link>
        <a href={`/s/${slug}`} target="_blank" className="mb-2 block rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/[0.07] to-brand/[0.02] p-3 transition-transform hover:-translate-y-px">
          <div className="flex items-center gap-2 text-[13px] font-bold text-ink"><Globe className="size-4 text-brand" /> Your booking page</div>
          <div className="mt-1 text-[11.5px] text-muted">See what your clients see →</div>
        </a>
        <ThemeToggle />
        <form method="post" action="/api/logout">
          <button className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-ink-2 hover:bg-line-2 hover:text-ink">
            <LogOut className="size-[18px]" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
