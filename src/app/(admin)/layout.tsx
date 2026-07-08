import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { getCurrentTenant } from "@/lib/tenant";

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
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar slug={tenant.slug} />
      <MobileNav slug={tenant.slug} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PlanBanner status={tenant.status} trialEndsAt={tenant.trialEndsAt} />
        <Topbar />
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
