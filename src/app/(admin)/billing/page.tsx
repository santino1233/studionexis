import { Card, CardHeader } from "@/components/ui/card";
import { getCurrentTenant } from "@/lib/tenant";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const included = [
  "Unlimited clients, classes and bookings",
  "Your own booking page & studio website",
  "Point of sale, packages and vouchers",
  "Team accounts with roles",
  "Analytics, expenses & P&L",
  "Email confirmations & reminders",
];

export default async function BillingPage() {
  const tenant = await getCurrentTenant();
  const trialDays = tenant.trialEndsAt ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86400_000)) : null;

  const statusLine =
    tenant.status === "TRIAL" ? `Free trial — ${trialDays} day${trialDays === 1 ? "" : "s"} left`
    : tenant.status === "ACTIVE" ? "Active subscription"
    : tenant.status === "PAST_DUE" ? "Payment issue — please contact us"
    : "Suspended";

  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Plan &amp; Billing</h1>
      <p className="mt-1 text-sm text-muted">Your Studio Nexis subscription.</p>

      <Card className="mt-6">
        <CardHeader eyebrow="Current plan" title={tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)} sub={statusLine} />
        <div className="p-6">
          {tenant.status === "TRIAL" && (
            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-line-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, 100 - ((trialDays ?? 0) / 14) * 100)}%` }} />
            </div>
          )}
          <ul className="space-y-2.5">
            {included.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-ink-2">
                <CheckCircle2 className="size-4 shrink-0 text-green" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-line-2 bg-raised px-4 py-3.5 text-[13px] text-ink-2">
            Online card billing is coming soon. Until then your plan is managed for you — questions or upgrades:{" "}
            <a href="mailto:haxkodi@gmail.com" className="font-bold text-brand hover:underline">contact support</a>.
          </div>
        </div>
      </Card>
    </div>
  );
}
