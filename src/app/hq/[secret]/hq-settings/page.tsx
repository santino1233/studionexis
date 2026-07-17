import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import { assertHq } from "@/lib/hq";

export const dynamic = "force-dynamic";

export default async function HqSettings({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  await assertHq(secret);
  const row = await db.globalSetting.findUnique({ where: { key: "platform" } });
  const v = (row?.value ?? {}) as { maintenanceBanner?: string };
  return (
    <div className="max-w-[760px]">
      <h1 className="font-display text-[28px] font-extrabold tracking-tight">Global Settings</h1>
      <Card className="mt-5">
        <CardHeader title="Maintenance banner" sub="Shown at the top of every studio dashboard while set — leave empty to clear" />
        <form method="post" action="/api/hq/ops" className="space-y-3 p-5 pt-0">
          <input type="hidden" name="op" value="gset" />
          <input type="hidden" name="back" value="/hq-settings" />
          <input name="maintenanceBanner" defaultValue={v.maintenanceBanner ?? ""} placeholder="e.g. Scheduled maintenance tonight 02:00–02:30 UTC — booking may pause briefly." className="w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand" />
          <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white">Save</button>
        </form>
      </Card>
    </div>
  );
}
