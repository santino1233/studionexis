import { Card, CardHeader } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";
import { getCurrentTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "SGD", "THB", "VND", "IDR", "PHP", "MYR", "JPY", "KRW", "AED", "INR"];
const TIMEZONES = ["Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles"];

const field = "h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1.5 block text-[12.5px] font-semibold text-ink-2";
const step = "grid size-7 shrink-0 place-items-center rounded-full bg-brand-wash font-display text-[13px] font-extrabold text-brand";

export default async function WelcomePage() {
  const tenant = await getCurrentTenant();
  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Welcome to Studio Nexis <PartyPopper className="mx-auto size-12 text-brand" /></h1>
      <p className="mt-1 text-sm text-muted">Three quick things and your studio is ready to take bookings. You can change all of it later in Settings.</p>

      <Card className="mt-6">
        <form method="post" action="/api/welcome" className="space-y-6 p-6">
          <div>
            <div className="mb-3 flex items-center gap-2.5"><span className={step}>1</span><span className="font-display text-[15px] font-extrabold text-ink">Your studio</span></div>
            <div className="space-y-3.5 pl-9">
              <input name="studioName" defaultValue={tenant.name} placeholder="Studio name" className={field} />
              <div className="grid grid-cols-2 gap-3">
                <select name="currency" defaultValue={tenant.currency} className={field}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                <select name="timezone" defaultValue={tenant.timezone} className={field}>{TIMEZONES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2.5"><span className={step}>2</span><span className="font-display text-[15px] font-extrabold text-ink">Your first class</span></div>
            <div className="space-y-3.5 pl-9">
              <input name="className" placeholder="e.g. Reformer Flow" className={field} />
              <div className="grid grid-cols-3 gap-3">
                <div><label className={label}>Minutes</label><input name="classDuration" type="number" defaultValue={60} className={field} /></div>
                <div><label className={label}>Spots</label><input name="classCapacity" type="number" defaultValue={10} className={field} /></div>
                <div><label className={label}>Drop-in price</label><input name="classPrice" type="number" step="0.01" defaultValue={20} className={field} /></div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2.5"><span className={step}>3</span><span className="font-display text-[15px] font-extrabold text-ink">Your first package</span></div>
            <div className="space-y-3.5 pl-9">
              <input name="pkgName" placeholder="e.g. 10-Class Pack" className={field} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Credits</label><input name="pkgCredits" type="number" defaultValue={10} className={field} /></div>
                <div><label className={label}>Price</label><input name="pkgPrice" type="number" step="0.01" defaultValue={180} className={field} /></div>
              </div>
            </div>
          </div>

          <button className="w-full rounded-[10px] bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-ink">Set up my studio</button>
          <p className="text-center text-[12px] text-muted">Leave a section blank to skip it.</p>
        </form>
      </Card>
    </div>
  );
}
