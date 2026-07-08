import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-[640px]">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to clients
      </Link>
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Add client</h1>
      <p className="mt-1 text-sm text-muted">A name is all you need to start — everything else can come later.</p>

      <Card className="mt-6">
        <form method="post" action="/api/clients" className="space-y-4 p-6">
          {error && (
            <div className="rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">
              Please give the client a name.
            </div>
          )}
          <div>
            <label className={label}>Full name *</label>
            <input name="name" required className={field} placeholder="e.g. Ava Chen" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Phone</label>
              <input name="phone" className={field} placeholder="555-0100" />
            </div>
            <div>
              <label className={label}>Email</label>
              <input name="email" type="email" className={field} placeholder="ava@example.com" />
            </div>
          </div>
          <div>
            <label className={label}>How did they find you?</label>
            <select name="channel" className={field} defaultValue="">
              <option value="">Not sure</option>
              <option value="walk-in">Walked in</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="zalo">Zalo</option>
              <option value="referral">Friend referral</option>
              <option value="website">Website</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Tags (comma-separated)</label>
              <input name="tags" placeholder="VIP, prenatal, morning" className={field} />
            </div>
            <div>
              <label className={label}>Birthday</label>
              <input name="birthday" type="date" className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea name="notes" rows={3} className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder="Anything worth remembering" />
          </div>
          <div>
            <label className={label}>Health notes (private)</label>
            <textarea name="medicalNotes" rows={2} className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder="Injuries, conditions, pregnancy…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/clients" className="rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-raised">Cancel</Link>
            <button className="rounded-[10px] bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Save client</button>
          </div>
        </form>
      </Card>
    </div>
  );
}
