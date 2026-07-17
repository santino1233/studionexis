"use client";

import { useEffect, useState } from "react";

// Interactive API console for /developers (Wave 15 A1). The key is kept in
// localStorage only — never sent anywhere except the API call itself.

export function ApiKeyBox() {
  const [key, setKey] = useState("");
  useEffect(() => { setKey(localStorage.getItem("nx_dev_key") ?? ""); }, []);
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="text-[12px] font-bold uppercase tracking-wider text-amber-600">Your API key for testing</div>
      <input
        value={key}
        onChange={(e) => { setKey(e.target.value); localStorage.setItem("nx_dev_key", e.target.value); }}
        placeholder="nx_live_…  (Settings → API → Generate)"
        className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3.5 font-mono text-[13px] outline-none focus:border-brand"
      />
      <p className="mt-2 text-[12px] text-muted">Stored only in this browser. Every &ldquo;Try it&rdquo; console below uses it automatically.</p>
    </div>
  );
}

export type TryParam = { name: string; in: "query" | "path" | "body"; placeholder?: string; example?: string };

export function TryIt({ method, path, params = [], defaultBody }: {
  method: "GET" | "POST";
  path: string; // e.g. /api/v1/clients/{id}
  params?: TryParam[];
  defaultBody?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState(defaultBody ?? "");
  const [out, setOut] = useState<{ status?: number; ms?: number; text?: string; err?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const key = localStorage.getItem("nx_dev_key") ?? "";
    if (!key) { setOut({ err: "Add your API key in the yellow box at the top first." }); return; }
    let url = path;
    const qs = new URLSearchParams();
    for (const p of params) {
      const v = (values[p.name] ?? "").trim();
      if (p.in === "path") {
        if (!v) { setOut({ err: `Fill in the ${p.name} field.` }); return; }
        url = url.replace(`{${p.name}}`, encodeURIComponent(v));
      } else if (p.in === "query" && v) {
        qs.set(p.name, v);
      }
    }
    if ([...qs].length) url += `?${qs}`;
    setBusy(true);
    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${key}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
        ...(method === "POST" ? { body: body || "{}" } : {}),
      });
      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {}
      setOut({ status: res.status, ms: Math.round(performance.now() - t0), text: pretty });
    } catch (e) {
      setOut({ err: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-line-2 bg-raised p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Try it</div>
      {params.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {params.map((p) => (
            <label key={p.name} className="block">
              <span className="mb-1 block font-mono text-[11.5px] font-bold text-ink-2">{p.name}{p.in === "path" ? " *" : ""}</span>
              <input
                value={values[p.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
                placeholder={p.placeholder ?? p.example ?? ""}
                className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 font-mono text-[12.5px] outline-none focus:border-brand"
              />
            </label>
          ))}
        </div>
      )}
      {method === "POST" && (
        <label className="mt-2 block">
          <span className="mb-1 block font-mono text-[11.5px] font-bold text-ink-2">JSON body</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(8, (body.match(/\n/g)?.length ?? 0) + 2)}
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 font-mono text-[12.5px] outline-none focus:border-brand" />
        </label>
      )}
      <button onClick={run} disabled={busy}
        className="mt-2.5 rounded-lg bg-ink px-4 py-2 text-[12.5px] font-bold text-canvas hover:opacity-90 disabled:opacity-50">
        {busy ? "Sending…" : `Send ${method}`}
      </button>
      {out && (
        <div className="mt-3">
          {out.err ? (
            <p className="text-[12.5px] font-medium text-rose">{out.err}</p>
          ) : (
            <>
              <div className="mb-1.5 flex items-center gap-2 text-[11.5px] font-bold">
                <span className={`rounded-full px-2 py-0.5 ${out.status && out.status < 300 ? "bg-green-wash text-green" : "bg-rose/10 text-rose"}`}>HTTP {out.status}</span>
                <span className="text-muted">{out.ms} ms</span>
              </div>
              <pre className="max-h-[340px] overflow-auto rounded-lg bg-[#16181d] p-3.5 font-mono text-[12px] leading-relaxed text-[#c9d4e3]">{out.text}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
