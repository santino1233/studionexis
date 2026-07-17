import Link from "next/link";
import { assertHq } from "@/lib/hq";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// HQ v2 shell (Wave 16 B1) — sidebar per the CRM spec's navigation.
const NAV: [string, string, string][] = [
  ["/", "Dashboard", "◧"],
  ["/studios", "Studios", "🏢"],
  ["/support", "Support", "🎫"],
  ["/chats", "Live Chat", "💬"],
  ["/requests", "Feature Requests", "🗳"],
  ["/billing", "Billing", "💳"],
  ["/analytics", "Analytics", "📈"],
  ["/broadcasts", "Broadcasts", "📣"],
  ["/status", "System Status", "🩺"],
  ["/logs", "Activity Logs", "📜"],
  ["/comms", "Email & SMS", "✉️"],
  ["/flags", "Feature Flags", "🚩"],
  ["/releases", "Releases", "🚀"],
  ["/team", "Team", "👥"],
  ["/kb", "Knowledge Base", "📚"],
  ["/hq-settings", "Settings", "⚙️"],
];

export default async function HqLayout({ children, params }: { children: React.ReactNode; params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const openTickets = await db.supportTicket.count({ where: { status: { in: ["OPEN", "WAITING"] } } });
  const unreadChats = await db.chatConversation
    .aggregate({ where: { channel: "hq", status: "OPEN" }, _sum: { unreadStudio: true } })
    .then((r) => r._sum.unreadStudio ?? 0);

  return (
    <div className="nx-admin flex min-h-screen bg-canvas text-ink">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 pb-3 pt-5">
          <div className="font-display text-[19px] font-extrabold leading-none tracking-tight">
            <span className="text-ink">NEXIS</span> <span className="text-brand">HQ</span>
          </div>
          <div className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-muted">Mission Control</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map(([href, label, icon]) => (
            <Link key={href} href={href} className="mt-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-2 hover:bg-raised hover:text-ink">
              <span className="w-4 text-center text-[13px]">{icon}</span> {label}
              {href === "/support" && openTickets > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{openTickets}</span>}
              {href === "/chats" && unreadChats > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadChats}</span>}
            </Link>
          ))}
        </nav>
        <form method="get" action="/studios" className="border-t border-line-2 p-3">
          <input name="q" placeholder="Search everything…" className="h-9 w-full rounded-lg border border-line bg-canvas px-3 text-[12.5px] outline-none focus:border-brand" />
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
