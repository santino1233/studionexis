import Link from "next/link";
import { MapPin } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { QuickAdd } from "@/components/shell/quick-add";
import { ShellSearch } from "@/components/shell/shell-search";

export async function Topbar() {
  const session = await getSession();
  const tenant = await getCurrentTenant().catch(() => null);
  const canQuickAdd = !!session && session.role !== "INSTRUCTOR";
  const [classTypes, instructors] = tenant && canQuickAdd
    ? await Promise.all([
        db.classType.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, durationMin: true } }),
        db.user.findMany({ where: { tenantId: tenant.id, active: true, role: { in: ["INSTRUCTOR", "MANAGER", "OWNER"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      ])
    : [[], []];
  const today = tenant ? new Date().toLocaleDateString("en-CA", { timeZone: tenant.timezone }) : "";
  const date = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const initial = (session?.name ?? "A").charAt(0).toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line-2 bg-canvas/80 px-6 backdrop-blur-md">
      {tenant?.organizationId && (
        <Link href="/locations" className="hidden items-center gap-1.5 rounded-full border border-brand/25 bg-brand-wash px-3 py-1.5 text-[12px] font-bold text-brand hover:bg-brand-wash/70 sm:inline-flex" title="You're viewing this location — switch or manage locations">
          <MapPin className="size-3.5" /> {tenant.locationLabel || tenant.name}
        </Link>
      )}
      <ShellSearch />
      <span className="hidden text-[13px] font-medium text-muted sm:block">{date}</span>
      {canQuickAdd && <QuickAdd classTypes={classTypes} instructors={instructors} today={today} />}
      <div className="grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-white" title={session?.name ?? ""}>{initial}</div>
    </header>
  );
}
