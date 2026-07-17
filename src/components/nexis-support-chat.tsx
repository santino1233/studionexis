"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Live chat panel with Studio Nexis support (studio -> HQ), shown on /support.
type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string; image?: string };

export function NexisSupportChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const pull = useCallback(async () => {
    try {
      const d = await (await fetch(`/api/support/chat${openRef.current ? "?read=1" : ""}`)).json();
      if (d.messages) setMessages(d.messages);
    } catch {}
  }, []);

  useEffect(() => {
    pull();
    const t = setInterval(pull, 4000);
    return () => clearInterval(t);
  }, [pull]);
  useEffect(() => { if (open) bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages.length, open]);

  const post = async (t: string, image?: string) => {
    setMessages((m) => [...m, { from: "visitor", name: "You", text: t, at: new Date().toISOString(), ...(image ? { image } : {}) }]);
    await fetch("/api/support/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t, ...(image ? { image } : {}) }) }).catch(() => {});
    pull();
  };
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    post(t);
  };
  const attach = async (file: File) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok && d.url) { await post(text.trim(), d.url); setText(""); }
      else alert(d.message || "Couldn't send that image.");
    } catch { alert("Couldn't send that image."); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div>
          <div className="text-[14.5px] font-bold text-ink">💬 Live chat with Nexis Support</div>
          <div className="text-[12px] text-muted">Talk to the Studio Nexis team directly — we reply as fast as we can.</div>
        </div>
        <span className="text-[12px] font-bold text-brand">{open ? "Hide" : messages.length ? `Open (${messages.length})` : "Start chatting"}</span>
      </button>
      {open && (
        <div className="border-t border-line-2">
          <div className="max-h-[320px] space-y-2 overflow-y-auto bg-raised/50 p-4">
            {messages.length === 0 && <div className="py-6 text-center text-[13px] text-muted">No messages yet — say hi! 👋</div>}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] shadow-sm ${m.from === "visitor" ? "ml-auto rounded-br-sm bg-brand text-white" : "rounded-tl-sm bg-surface text-ink"}`}>
                <div className={`text-[10px] font-bold ${m.from === "visitor" ? "text-white/70" : "text-muted"}`}>{m.name} · {new Date(m.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                {m.image && <a href={m.image} target="_blank" rel="noreferrer"><img src={m.image} alt="attachment" className="mt-1 max-h-52 rounded-lg object-cover" /></a>}
                {m.text && <div className="mt-0.5 whitespace-pre-wrap">{m.text}</div>}
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <div className="flex gap-2 border-t border-line-2 p-3">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} title="Attach a photo" className="grid size-11 shrink-0 place-items-center rounded-xl bg-line-2 text-[17px] text-ink-2 hover:text-ink disabled:opacity-50">{busy ? "…" : "📎"}</button>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message to the Nexis team…" className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand" />
            <button onClick={send} className="rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-ink">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
