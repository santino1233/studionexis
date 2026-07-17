import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { getCurrentTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/site-url";

function PlanBanner({ status, trialEndsAt }: { status: string; trialEndsAt: Date | null }) {
  if (status === "TRIAL" && trialEndsAt) {
    const days = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400_000));
    return (
      <div className="border-b border-line-2 bg-brand-wash px-6 py-2 text-center text-[12.5px] font-bold text-brand-ink">
        Free trial — {days} day{days === 1 ? "" : "s"} left. Enjoy everything, no card needed.
      </div>
    );
  }
  if (status === "PAST_DUE" || status === "SUSPENDED") {
    return (
      <div className="border-b border-rose/20 bg-rose/5 px-6 py-2 text-center text-[12.5px] font-bold text-rose">
        {status === "SUSPENDED" ? "This studio is suspended — contact support." : "Payment issue — please update billing."}
      </div>
    );
  }
  return null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant();
  const session = await getSession();
  const role = session?.role ?? "OWNER";
  // Platform broadcasts + maintenance banner (Wave 16 B5)
  const [annRows, gset] = await Promise.all([
    db.announcement.findMany({ where: { activeFrom: { lte: new Date() }, OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }] }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.globalSetting.findUnique({ where: { key: "platform" } }),
  ]);
  const anns = annRows.filter((a) => {
    const aud = (a.audience ?? {}) as { all?: boolean; trial?: boolean; plans?: string[]; tenantIds?: string[] };
    return aud.all || (aud.trial && tenant.status === "TRIAL") || aud.plans?.includes(tenant.plan) || aud.tenantIds?.includes(tenant.id);
  }).slice(0, 2);
  const maint = ((gset?.value ?? {}) as { maintenanceBanner?: string }).maintenanceBanner;
  const chatUnread = await db.chatConversation.aggregate({ where: { tenantId: tenant.id, channel: "visitor", status: "OPEN" }, _sum: { unreadStudio: true } }).then((r) => r._sum.unreadStudio ?? 0);
  const supportUnread = await db.chatConversation.aggregate({ where: { tenantId: tenant.id, channel: "hq" }, _sum: { unreadVisitor: true } }).then((r) => r._sum.unreadVisitor ?? 0);
  const locations = role === "OWNER" && tenant.organizationId
    ? (await db.tenant.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, locationLabel: true } }))
        .map((l) => ({ id: l.id, label: l.locationLabel || l.name, current: l.id === tenant.id }))
    : [];
  return (
    <div className="nx-admin flex h-screen overflow-hidden bg-canvas text-ink">
      <Sidebar slug={tenant.slug} role={role} chatUnread={chatUnread} supportUnread={supportUnread} siteUrl={publicSiteUrl(tenant)} locations={locations} />
      <MobileNav slug={tenant.slug} role={role} locations={locations} siteUrl={publicSiteUrl(tenant)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {maint && <div className="border-b border-rose/20 bg-rose/5 px-6 py-2 text-center text-[12.5px] font-bold text-rose">🔧 {maint}</div>}
        {anns.map((a) => (
          <div key={a.id} className={`border-b px-6 py-2 text-center text-[12.5px] font-bold ${a.kind === "security" ? "border-rose/20 bg-rose/5 text-rose" : a.kind === "maintenance" ? "border-brand/20 bg-brand-wash text-brand-ink" : "border-line-2 bg-raised text-ink-2"}`}>
            {a.kind === "security" ? "🛡" : a.kind === "release" ? "🚀" : a.kind === "maintenance" ? "🔧" : "📣"} <b>{a.title}</b> — {a.body}
          </div>
        ))}
        <PlanBanner status={tenant.status} trialEndsAt={tenant.trialEndsAt} />
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
