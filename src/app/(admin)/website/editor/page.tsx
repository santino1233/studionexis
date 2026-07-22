"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "grapesjs";
import { APP_ORIGIN } from "@/lib/config";
import "grapesjs/dist/css/grapes.min.css";

// Advanced website editor (GrapesJS — open-source drag-and-drop builder).
// Output is saved to website.custom and, when enabled, replaces the template
// on the public site. Scripts are stripped server-side on save.

const STARTER = `
<section style="padding:90px 24px;text-align:center;background:#faf7f2;">
  <h1 style="font-size:44px;margin:0;color:#1a1a1a;">Your studio, your page</h1>
  <p style="font-size:17px;color:#666;max-width:520px;margin:14px auto 0;">Drag blocks in from the right, click any text to edit it, and hit Save &amp; publish when you love it.</p>
  <a href="/book" style="display:inline-block;margin-top:22px;background:#F97316;color:#fff;padding:14px 30px;border-radius:12px;font-weight:700;text-decoration:none;">Book a class</a>
</section>`;

export default function AdvancedEditorPage() {
  const holder = useRef<HTMLDivElement>(null);
  const ed = useRef<Editor | null>(null);
  const [status, setStatus] = useState("Loading editor…");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let editor: Editor | undefined;
    (async () => {
      const grapesjs = (await import("grapesjs")).default;
      const d = await (await fetch("/api/website/custom")).json();
      if (!holder.current) return;
      editor = grapesjs.init({
        container: holder.current,
        height: "100%",
        storageManager: false,
        components: d.html || STARTER,
        style: d.css || "",
      });
      const bm = editor.BlockManager;
      const blk = (id: string, label: string, content: string) => bm.add(id, { id, label, content, category: "Sections" });
      blk("nx-hero", "Hero", `<section style="padding:80px 24px;text-align:center;background:#f5f1ea;"><h1 style="font-size:40px;margin:0;">Big headline here</h1><p style="color:#666;margin-top:12px;">A short supporting line.</p><a href="/book" style="display:inline-block;margin-top:20px;background:#F97316;color:#fff;padding:13px 28px;border-radius:12px;font-weight:700;text-decoration:none;">Book a class</a></section>`);
      blk("nx-text", "Text", `<section style="padding:48px 24px;max-width:720px;margin:0 auto;"><h2>Section title</h2><p style="color:#555;line-height:1.7;">Tell your story here.</p></section>`);
      blk("nx-2col", "Two columns", `<section style="display:flex;gap:24px;padding:48px 24px;flex-wrap:wrap;max-width:960px;margin:0 auto;"><div style="flex:1;min-width:260px;"><h3>Left</h3><p style="color:#555;">Column text.</p></div><div style="flex:1;min-width:260px;"><h3>Right</h3><p style="color:#555;">Column text.</p></div></section>`);
      blk("nx-image", "Image", `<img src="${APP_ORIGIN}/window.svg" style="max-width:100%;display:block;margin:0 auto;" alt=""/>`);
      blk("nx-cta", "Book button", `<div style="text-align:center;padding:32px;"><a href="/book" style="display:inline-block;background:#F97316;color:#fff;padding:14px 30px;border-radius:12px;font-weight:700;text-decoration:none;">Book a class</a></div>`);
      blk("nx-footer", "Footer", `<footer style="padding:40px 24px;text-align:center;color:#888;border-top:1px solid #eee;">© Your Studio · <a href="/book" style="color:#F97316;">Book</a></footer>`);
      ed.current = editor;
      setEnabled(!!d.enabled);
      setReady(true);
      setStatus("");
    })();
    return () => editor?.destroy();
  }, []);

  const save = async (publish?: boolean) => {
    if (!ed.current) return;
    setStatus("Saving…");
    const res = await fetch("/api/website/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: ed.current.getHtml(), css: ed.current.getCss(), ...(publish !== undefined ? { enabled: publish } : {}) }),
    }).catch(() => null);
    if (res?.ok) {
      if (publish !== undefined) setEnabled(publish);
      setStatus(publish ? "Published — your custom page is live!" : publish === false ? "Saved. Back on your template." : "Saved.");
    } else setStatus("Save failed — try again.");
    setTimeout(() => setStatus(""), 3500);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[560px] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-ink">Advanced editor <span className="rounded-full bg-brand-wash px-2 py-0.5 align-middle text-[10.5px] font-bold text-brand">BETA</span></h1>
          <p className="text-[12px] text-muted">Full drag-and-drop control (powered by GrapesJS). {enabled ? "Your custom page is LIVE instead of the template." : "Your template stays live until you publish."}</p>
        </div>
        <div className="flex items-center gap-2">
          {status && <span className="text-[12px] font-bold text-brand">{status}</span>}
          <a href="/website" className="rounded-lg border border-line-2 px-3 py-2 text-[12px] font-bold text-ink-2 hover:text-ink">← Builder</a>
          <button onClick={() => save()} disabled={!ready} className="rounded-lg bg-line-2 px-3.5 py-2 text-[12px] font-bold text-ink-2 hover:text-ink disabled:opacity-50">Save draft</button>
          {enabled ? (
            <button onClick={() => save(false)} disabled={!ready} className="rounded-lg border border-line-2 px-3.5 py-2 text-[12px] font-bold text-ink-2 hover:text-ink disabled:opacity-50">Switch back to template</button>
          ) : null}
          <button onClick={() => save(true)} disabled={!ready} className="rounded-lg bg-brand px-4 py-2 text-[12px] font-bold text-white hover:bg-brand-ink disabled:opacity-50">Save &amp; publish</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-line-2 bg-white">
        <div ref={holder} className="h-full" />
      </div>
    </div>
  );
}
