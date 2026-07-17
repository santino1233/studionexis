"use client";

import { useState } from "react";

// Studio signup wizard (owner mockups, 2026-07-17): intro splash → Studio
// Info → Your Details → Studio Setup → account created → /getting-started.

const STEPS = ["Studio Info", "Your Details", "Studio Setup", "You're All Set!"];
const TYPES = ["Reformer Pilates", "Mat Pilates", "Yoga", "Barre", "Mixed / Other"];
const SIZES = ["1 – 2", "3 – 5", "6 – 10", "10+"];
const GOALS = ["Fill more classes", "Save admin time", "Grow revenue", "Look more professional", "Move off spreadsheets"];
const COUNTRIES = ["Vietnam", "Thailand", "Singapore", "Indonesia", "Philippines", "Malaysia", "Australia", "United States", "Canada", "United Kingdom", "Other"];

const field = "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/10";
const label = "mb-1.5 block text-[12px] font-bold text-ink-2";

function Blob({ emoji, tint }: { emoji: string; tint: string }) {
  return (
    <div className="relative hidden min-h-[420px] items-center justify-center overflow-hidden lg:flex">
      <div className="absolute size-[340px] rounded-[45%_55%_60%_40%/50%_45%_55%_50%]" style={{ background: `${tint}22` }} />
      <div className="absolute -bottom-10 -left-10 size-[220px] rounded-full" style={{ background: `${tint}14` }} />
      <div className="absolute right-6 top-10 size-[90px] rounded-full" style={{ background: `${tint}1a` }} />
      <span className="relative text-[120px] drop-shadow-sm">{emoji}</span>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mx-auto mb-8 flex max-w-[560px] items-center">
      {STEPS.map((s, i) => (
        <div key={s} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`grid size-8 place-items-center rounded-full text-[13px] font-bold ${i <= step ? "bg-brand text-white" : "border-2 border-line-2 bg-surface text-muted"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`mt-1.5 whitespace-nowrap text-[10px] font-bold ${i <= step ? "text-ink" : "text-muted"}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`mx-2 mb-5 h-0.5 flex-1 rounded ${i < step ? "bg-brand" : "bg-line-2"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function SignupWizard() {
  const [step, setStep] = useState(-1); // -1 = intro splash
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    studioName: "", studioType: "", country: "", city: "",
    ownerName: "", email: "", password: "", agree: false,
    sizeBand: "", goal: "", describe: "",
  });
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const next = () => {
    setErr("");
    if (step === 0 && !f.studioName.trim()) return setErr("Give your studio a name.");
    if (step === 1) {
      if (!f.ownerName.trim() || !f.email.includes("@")) return setErr("Add your name and a valid email.");
      if (f.password.length < 8) return setErr("Password needs at least 8 characters.");
      if (!f.agree) return setErr("Please agree to the Terms of Service.");
    }
    setStep(step + 1);
  };

  const submit = async () => {
    setBusy(true);
    setErr("");
    const body = new URLSearchParams({
      studioName: f.studioName, ownerName: f.ownerName, email: f.email, password: f.password,
      studioType: f.describe || f.studioType, country: f.country, city: f.city, sizeBand: f.sizeBand, goal: f.goal,
    });
    const res = await fetch("/api/signup", { method: "POST", body, redirect: "follow" });
    if (res.redirected && !res.url.includes("error=")) {
      window.location.href = res.url;
    } else {
      setBusy(false);
      setErr(res.url.includes("exists") ? "That email already has a studio — sign in instead." : "Something went wrong — check your details.");
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex items-center justify-between">
          {step >= 0 ? (
            <button onClick={() => setStep(step - 1)} className="grid size-9 place-items-center rounded-xl border border-line-2 text-ink-2 hover:text-ink">←</button>
          ) : <span />}
          <div className="text-center">
            <div className="font-display text-[22px] font-extrabold tracking-tight">STUDIO<span className="text-brand">NEXIS</span></div>
            <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted">Studio Management</div>
          </div>
          <span className="w-9" />
        </div>

        {/* ── Intro splash ── */}
        {step === -1 && (
          <div className="mt-10 grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h1 className="font-display text-[40px] font-extrabold leading-[1.08] tracking-tight">Let&apos;s build<br />your studio 🎉</h1>
              <p className="mt-3 max-w-[360px] text-[15px] leading-relaxed text-muted">Join the Pilates studios growing with StudioNexis.</p>
              <ul className="mt-7 space-y-4">
                {[["🧩", "All-in-one management", "Classes, clients, payments, and more."],
                  ["⏱", "Save time", "Automate your daily operations."],
                  ["📈", "Grow your studio", "Tools to help you scale and thrive."]].map(([ic, t, d]) => (
                  <li key={t} className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash text-[18px]">{ic}</span>
                    <span><b className="block text-[14.5px] text-ink">{t}</b><span className="text-[13px] text-muted">{d}</span></span>
                  </li>
                ))}
              </ul>
              <button onClick={() => setStep(0)} className="mt-9 rounded-xl bg-brand px-9 py-3.5 text-[14.5px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5">
                Start free — 7 days →
              </button>
              <p className="mt-5 text-[12.5px] text-muted">Already have a studio? <a href="/login" className="font-bold text-brand hover:underline">Sign in</a></p>
            </div>
            <Blob emoji="🧘‍♀️" tint="#F97316" />
          </div>
        )}

        {/* ── Steps ── */}
        {step >= 0 && step <= 2 && (
          <div className="mt-8">
            <Progress step={step} />
            <div className="grid items-center gap-10 lg:grid-cols-2">
              {step === 0 && <Blob emoji="🏛" tint="#B45309" />}
              <div className={`mx-auto w-full max-w-[420px] ${step === 1 ? "lg:order-first" : ""}`}>
                {err && <div className="mb-4 rounded-xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[13px] font-medium text-rose">{err}</div>}

                {step === 0 && (
                  <>
                    <h2 className="font-display text-[26px] font-extrabold tracking-tight">Tell us about<br />your studio</h2>
                    <p className="mt-1 text-[13.5px] text-muted">Let&apos;s get to know your studio.</p>
                    <div className="mt-6 space-y-4">
                      <div><label className={label}>Studio name</label><input value={f.studioName} onChange={(e) => set("studioName", e.target.value)} placeholder="e.g. Lotus Pilates" className={field} /></div>
                      <div><label className={label}>Studio type</label>
                        <select value={f.studioType} onChange={(e) => set("studioType", e.target.value)} className={field}>
                          <option value="">Select studio type</option>
                          {TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={label}>Country</label>
                          <select value={f.country} onChange={(e) => set("country", e.target.value)} className={field}>
                            <option value="">Select country</option>
                            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div><label className={label}>City</label><input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Your city" className={field} /></div>
                      </div>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="font-display text-[26px] font-extrabold tracking-tight">Your details</h2>
                    <p className="mt-1 text-[13.5px] text-muted">Who&apos;s the main contact?</p>
                    <div className="mt-6 space-y-4">
                      <div><label className={label}>Your name</label><input value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="e.g. Ava Chen" className={field} /></div>
                      <div><label className={label}>Email</label><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@yourstudio.com" className={field} /></div>
                      <div>
                        <label className={label}>Password</label>
                        <div className="relative">
                          <input type={showPw ? "text" : "password"} value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••••••" className={field} />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-muted">{showPw ? "🙈" : "👁"}</button>
                        </div>
                        <p className="mt-1 text-[11.5px] text-muted">At least 8 characters</p>
                      </div>
                      <label className="flex items-start gap-2.5 text-[12.5px] text-ink-2">
                        <input type="checkbox" checked={f.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5 size-4 accent-[#F97316]" />
                        <span>I agree to the <a href="/terms" className="font-bold text-brand">Terms of Service</a> and <a href="/privacy" className="font-bold text-brand">Privacy Policy</a></span>
                      </label>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="font-display text-[26px] font-extrabold tracking-tight">Let&apos;s set up<br />your studio</h2>
                    <p className="mt-1 text-[13.5px] text-muted">We&apos;ll customize StudioNexis for your needs.</p>
                    <div className="mt-6 space-y-5">
                      <div>
                        <label className={label}>What best describes your studio?</label>
                        <div className="flex flex-wrap gap-2">
                          {TYPES.map((t) => (
                            <button key={t} type="button" onClick={() => set("describe", t)}
                              className={`rounded-xl border px-3.5 py-2.5 text-[12.5px] font-bold transition-colors ${f.describe === t ? "border-brand bg-brand-wash text-brand" : "border-line-2 bg-surface text-ink-2 hover:text-ink"}`}>
                              {t === "Reformer Pilates" ? "🛷 " : t === "Mat Pilates" ? "🧎 " : t === "Yoga" ? "🧘 " : t === "Barre" ? "🩰 " : "✨ "}{t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={label}>How many instructors do you have?</label>
                        <div className="flex flex-wrap gap-2">
                          {SIZES.map((s) => (
                            <button key={s} type="button" onClick={() => set("sizeBand", s)}
                              className={`rounded-xl border px-4 py-2.5 text-[12.5px] font-bold ${f.sizeBand === s ? "border-brand bg-brand-wash text-brand" : "border-line-2 bg-surface text-ink-2 hover:text-ink"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={label}>What&apos;s your biggest goal right now?</label>
                        <select value={f.goal} onChange={(e) => set("goal", e.target.value)} className={field}>
                          <option value="">Select your goal</option>
                          {GOALS.map((g) => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <button onClick={step === 2 ? submit : next} disabled={busy}
                  className="mt-7 w-full rounded-xl bg-brand py-3.5 text-[14.5px] font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                  {busy ? "Creating your studio…" : step === 2 ? "Create my studio 🎉" : "Continue →"}
                </button>
              </div>
              {step === 1 && <Blob emoji="📱" tint="#0F766E" />}
              {step === 2 && <Blob emoji="🤸" tint="#7C3AED" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
