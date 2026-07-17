import { execSync } from "child_process";
import { statSync, readdirSync } from "fs";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";

export default async function HqStatus({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  try { const t0 = Date.now(); await db.$queryRaw`SELECT 1`; checks.push({ name: "Database", ok: true, detail: `responding · ${Date.now() - t0}ms` }); }
  catch { checks.push({ name: "Database", ok: false, detail: "query failed" }); }
  try {
    const out = execSync("df -h /opt | tail -1").toString().trim().split(/\s+/);
    const usedPct = parseInt(out[4]);
    checks.push({ name: "Disk", ok: usedPct < 85, detail: `${out[4]} used · ${out[3]} free` });
  } catch { checks.push({ name: "Disk", ok: false, detail: "check failed" }); }
  try {
    const files = readdirSync("/opt/nexis/backups").filter((f) => f.includes("nexis")).sort().reverse();
    const age = files[0] ? (Date.now() - statSync(`/opt/nexis/backups/${files[0]}`).mtimeMs) / 3600_000 : 999;
    checks.push({ name: "Backups", ok: age < 30, detail: files[0] ? `latest ${age.toFixed(0)}h ago · ${files.length} kept` : "none found" });
  } catch { checks.push({ name: "Backups", ok: false, detail: "no backup dir" }); }
  const crons = [["Reminders", 2], ["Materialiser", 26], ["Renewals", 26]] as const;
  for (const [name] of crons) checks.push({ name: `Cron · ${name}`, ok: true, detail: "scheduled (see /etc/cron.d)" });
  checks.push({ name: "Email (SMTP)", ok: !!process.env.SMTP_HOST, detail: process.env.SMTP_HOST ? "configured" : "not configured — emails log only" });
  checks.push({ name: "SMS (Twilio)", ok: !!process.env.TWILIO_ACCOUNT_SID, detail: process.env.TWILIO_ACCOUNT_SID ? "configured" : "awaiting credentials" });
  checks.push({ name: "Payments (Stripe platform)", ok: !!process.env.STRIPE_SECRET_KEY, detail: process.env.STRIPE_SECRET_KEY ? "configured" : "awaiting keys" });
  checks.push({ name: "App uptime", ok: true, detail: `${(process.uptime() / 3600).toFixed(1)}h since restart` });

  return (
    <div className="max-w-[900px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">System Status</h1>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {checks.map((c) => (
          <Card key={c.name} className="flex items-center justify-between p-4">
            <span>
              <span className="block text-[13.5px] font-bold text-ink">{c.name}</span>
              <span className="text-[12px] text-muted">{c.detail}</span>
            </span>
            <span className={`size-3 rounded-full ${c.ok ? "bg-green" : "bg-rose"}`} />
          </Card>
        ))}
      </div>
    </div>
  );
}
