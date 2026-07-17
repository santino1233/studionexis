"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// HQ inbox for live chats with studios (channel "hq"), 3s polling.
type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string };
type Convo = { id: string; studio: string; slug: string; status: string; unread: number; last: string; lastAt: string };
type Thread = { id: string; studio: string; slug: string; plan: string; contact: string | null; status: string; messages: Msg[] };

export function HqChatInbox() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const selRef = useRef(sel);
  selRef.current = sel;

  const pull = useCallback(async () => {
    try {
      const d = await (await fetch("/api/hq/chat")).json();
      if (d.conversations) setConvos(d.conversations);
      if (selRef.current) {
        const t = await (await fetch(`/api/hq/chat?c=${selRef.current}`)).json();
        if (t.messages) setThread(t);
      }
    } catch {}
  }, []);

  useEffect(() => {
    pull();
    const t = setInterval(pull, 3000);
    return () => clearInterval(t);
  }, [pull]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [thread?.messages.length]);
  useEffect(() => { if (sel) pull(); }, [sel, pull]);

  const send = async () => {
    const t = text.trim();
    if (!t || !sel) return;
    setText("");
    setThread((th) => th ? { ...th, messages: [...th.messages, { from: "studio", name: "Nexis Support", text: t, at: new Date().toISOString() }] } : th);
    await fetch("/api/hq/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sel, text: t }) }).catch(() => {});
    pull();
  };
  const setStatus = async (close: boolean) => {
    if (!sel) return;
    await fetch("/api/hq/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sel, close }) }).catch(() => {});
    pull();
  };

  return (
    <div className="grid h-[600px] grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <div className="overflow-y-auto rounded-2xl border border-line-2 bg-surface">
        {convos.map((c) => (
          <button key={c.id} onClick={() => setSel(c.id)}
            className={`block w-full border-b border-line-2 px-4 py-3 text-left last:border-0 hover:bg-raised ${sel === c.id ? "bg-brand-wash/50" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-bold text-ink">{c.studio}{c.status === "CLOSED" ? " · closed" : ""}</span>
              <span className="flex items-center gap-1.5">
                {c.unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[10.5px] font-bold text-white">{c.unread}</span>}
                <span className="text-[10.5px] text-muted">{new Date(c.lastAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12px] text-muted">{c.last}</div>
          </button>
        ))}
        {convos.length === 0 && <div className="p-8 text-center text-sm text-muted">No studio chats yet. Studios reach you from Help &amp; Support → Live chat.</div>}
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-line-2 bg-surface">
        {thread ? (
          <>
            <div className="flex items-center justify-between border-b border-line-2 px-5 py-3">
              <div>
                <div className="text-[14.5px] font-bold text-ink">{thread.studio} <span className="ml-1 rounded-full bg-line-2 px-2 py-0.5 text-[10px] font-bold text-muted">{thread.plan}</span></div>
                <div className="text-[11.5px] text-muted">{thread.contact ?? thread.slug}</div>
              </div>
              <button onClick={() => setStatus(thread.status !== "CLOSED")} className={`rounded-lg px-3 py-1.5 text-[11.5px] font-bold ${thread.status === "CLOSED" ? "bg-green-wash text-green" : "bg-line-2 text-ink-2 hover:text-ink"}`}>
                {thread.status === "CLOSED" ? "Reopen" : "Close chat"}
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-raised/50 p-4">
              {thread.messages.map((m, i) => (
                <div key={i} className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] shadow-sm ${m.from === "studio" ? "ml-auto rounded-br-sm bg-brand text-white" : "rounded-tl-sm bg-surface text-ink"}`}>
                  <div className={`text-[10px] font-bold ${m.from === "studio" ? "text-white/70" : "text-muted"}`}>{m.name} · {new Date(m.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  <div className="mt-0.5 whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            <div className="flex gap-2 border-t border-line-2 p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Reply as Nexis Support…" className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand" />
              <button onClick={send} className="rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-ink">Send</button>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-muted">Pick a studio chat on the left.</div>
        )}
      </div>
    </div>
  );
}
