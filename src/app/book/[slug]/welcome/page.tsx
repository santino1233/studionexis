import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tenantBySlugOrDomain } from "@/lib/public-tenant";
import { getCustomerSession } from "@/lib/customer-auth";
import { Cake, Hand, Sparkles, Stethoscope } from "lucide-react";

export const dynamic = "force-dynamic";

// Post-signup client onboarding (Wave 14 V5) — old-system flow:
// welcome → date of birth → medical notes → how did you hear → book.
const STEPS = ["welcome", "dob", "medical", "heard"] as const;
const SOURCES = ["Instagram", "Facebook", "Google", "TikTok", "Friend", "Walked past", "Other"];

export default async function WelcomePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { slug } = await params;
  const { step: stepRaw } = await searchParams;
  const tenant = await tenantBySlugOrDomain(slug);
  if (!tenant || tenant.status === "SUSPENDED") notFound();
  const cs = await getCustomerSession();
  if (!cs || cs.tenantId !== tenant.id) redirect(`/book/${slug}/account`);
  const client = await db.client.findFirst({ where: { id: cs.clientId, tenantId: tenant.id } });
  if (!client) redirect(`/book/${slug}/account`);

  const brand = tenant.brandColor || "#F97316";
  const step = (STEPS as readonly string[]).includes(stepRaw ?? "") ? (stepRaw as (typeof STEPS)[number]) : "welcome";
  const idx = STEPS.indexOf(step);
  const nextHref = idx < STEPS.length - 1 ? `/book/${slug}/welcome?step=${STEPS[idx + 1]}` : `/book/${slug}`;
  const input = "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:ring-4";
  const firstName = client.name.split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-[720px] items-center justify-between px-6 py-5">
        <div className="font-display text-[16px] font-extrabold tracking-tight text-ink">{tenant.name}</div>
        <Link href={`/book/${slug}`} className="text-[12.5px] font-bold text-muted hover:text-ink">Skip for now</Link>
      </header>
      <div className="mx-auto w-full max-w-[720px] px-6">
        <div className="h-1 overflow-hidden rounded-full bg-line-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${((idx + 1) / STEPS.length) * 100}%`, background: brand }} />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-6 py-10 text-center">
        {step === "welcome" && (
          <>
            <div className="text-brand"><Hand className="mx-auto size-9" /></div>
            <h1 className="mt-3 font-display text-[30px] font-extrabold tracking-tight text-ink">Welcome to {tenant.name}, {firstName}!</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">Your account is ready. A few quick questions help us take better care of you — every one is optional.</p>
            <Link href={nextHref} className="mx-auto mt-8 rounded-xl px-10 py-3.5 text-[14.5px] font-bold text-white" style={{ background: brand }}>Let&apos;s go →</Link>
          </>
        )}

        {step === "dob" && (
          <>
            <div className="text-brand"><Cake className="mx-auto size-9" /></div>
            <h1 className="mt-3 font-display text-[26px] font-extrabold tracking-tight text-ink">When&apos;s your birthday?</h1>
            <p className="mt-2 text-[14px] text-muted">So the studio can celebrate with you.</p>
            <form method="post" action="/api/public/customer" className="mx-auto mt-7 w-full max-w-[320px] space-y-3">
              <input type="hidden" name="mode" value="onboard" />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="step" value="dob" />
              <input type="hidden" name="next" value={nextHref} />
              <input name="dob" type="date" className={input} defaultValue={client.birthday ? client.birthday.toISOString().slice(0, 10) : ""} />
              <button className="w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: brand }}>Continue →</button>
            </form>
            <Link href={nextHref} className="mt-3 text-[12.5px] font-bold text-muted hover:text-ink">Skip this</Link>
          </>
        )}

        {step === "medical" && (
          <>
            <div className="text-brand"><Stethoscope className="mx-auto size-9" /></div>
            <h1 className="mt-3 font-display text-[26px] font-extrabold tracking-tight text-ink">Anything we should know?</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">Injuries, pregnancy, conditions — shared only with your instructors so classes can be adapted for you.</p>
            <form method="post" action="/api/public/customer" className="mx-auto mt-7 w-full max-w-[380px] space-y-3">
              <input type="hidden" name="mode" value="onboard" />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="step" value="medical" />
              <input type="hidden" name="next" value={nextHref} />
              <textarea name="medical" rows={3} placeholder="e.g. Recovering from a knee injury — avoiding deep lunges" className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-4" defaultValue={client.medicalNotes ?? ""} />
              <button className="w-full rounded-xl py-3 text-[14px] font-bold text-white" style={{ background: brand }}>Continue →</button>
            </form>
            <Link href={nextHref} className="mt-3 text-[12.5px] font-bold text-muted hover:text-ink">Skip this</Link>
          </>
        )}

        {step === "heard" && (
          <>
            <div className="text-brand"><Sparkles className="mx-auto size-9" /></div>
            <h1 className="mt-3 font-display text-[26px] font-extrabold tracking-tight text-ink">How did you hear about us?</h1>
            <form method="post" action="/api/public/customer" className="mx-auto mt-7 w-full max-w-[420px]">
              <input type="hidden" name="mode" value="onboard" />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="step" value="heard" />
              <input type="hidden" name="next" value={`/book/${slug}`} />
              <div className="flex flex-wrap justify-center gap-2">
                {SOURCES.map((src) => (
                  <button key={src} name="heard" value={src} className="rounded-full border border-line-2 bg-surface px-4 py-2.5 text-[13px] font-bold text-ink-2 transition-colors hover:border-transparent hover:text-white">
                    {src}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[12px] text-muted">Tap one to finish setup — then let&apos;s book your first class.</p>
            </form>
            <Link href={`/book/${slug}`} className="mt-3 text-[12.5px] font-bold text-muted hover:text-ink">Skip this</Link>
          </>
        )}
      </main>
    </div>
  );
}
