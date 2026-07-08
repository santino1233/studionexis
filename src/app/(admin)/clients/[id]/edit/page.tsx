import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";

export default async function EditClientPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const tenant = await getCurrentTenant();
  const client = await db.client.findFirst({ where: { id, tenantId: tenant.id } });
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-[640px]">
      <Link href={`/clients/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to profile
      </Link>
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Edit {client.name}</h1>

      <Card className="mt-6">
        <form method="post" action={`/api/clients/${id}`} className="space-y-4 p-6">
          {error === "name" && (
            <div className="rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">The client needs a name.</div>
          )}
          <div>
            <label className={label}>Full name *</label>
            <input name="name" required defaultValue={client.name} className={field} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className={label}>Phone</label><input name="phone" defaultValue={client.phone ?? ""} className={field} /></div>
            <div><label className={label}>Email</label><input name="email" type="email" defaultValue={client.email ?? ""} className={field} /></div>
          </div>
          <div>
            <label className={label}>How they found you</label>
            <select name="channel" defaultValue={client.channel ?? ""} className={field}>
              <option value="">Not sure</option>
              {["walk-in", "instagram", "facebook", "zalo", "referral", "website"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea name="notes" rows={3} defaultValue={client.notes ?? ""} className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
          </div>
          <div>
            <label className={label}>Health notes (private)</label>
            <textarea name="medicalNotes" rows={2} defaultValue={client.medicalNotes ?? ""} className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link href={`/clients/${id}`} className="rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">Cancel</Link>
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save changes</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
