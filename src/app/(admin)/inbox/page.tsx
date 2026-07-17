"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Live chat inbox for studio staff (Tidio-style, 3s polling).
type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string };
type Convo = { id: string; name: string; contact: string | null; status: string; unread: number; last: string; lastAt: string };
type Thread = { id: string; name: string | null; contact: string | null; clientId: string | null; status: string; messages: Msg[] };

export default function InboxPage() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const selRef = useRef(sel);
  selRef.current = sel;
  const allRef = useRef(showAll);
  allRef.current = showAll;

  const pull = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat${allRef.current ? "?all=1" : ""}`);
      const d = await res.json();
      if (d.conversations) setConvos(d.conversations);
      if (selRef.current) {
        const t = await (await fetch(`/api/chat?c=${selRef.current}`)).json();
        if (t.messages) setThread(t);
      }
    } catch {}
  }, []);

  useEffect(() => {
    pull();
    const t = setInterval(pull, 3000);
    return () => clearInterval(t);
  }, [pull]);
  useEffect(() => { bottom.current?.scrollIntoView(); }, [thread?.messages.length]);
  useEffect(() => { if (sel) pull(); }, [sel, pull]);

  const send = async () => {
    const t = text.trim();
    if (!t || !sel) return;
    setText("");
    setThread((th) => th ? { ...th, messages: [...th.messages, { from: "studio", name: "You", text: t, at: new Date().toISOString() }] } : th);
    await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sel, text: t }) }).catch(() => {});
    pull();
  };
  const setStatus = async (close: boolean) => {
    if (!sel) return;
    await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sel, close }) }).catch(() => {});
    pull();
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">Inbox</h1>
          <p className="mt-1 text-sm text-muted">Live chat with visitors and clients from your website — updates every few seconds.</p>
        </div>
        <button onClick={() => { setShowAll(!showAll); setTimeout(pull, 0); }} className="rounded-lg bg-line-2 px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:text-ink">
          {showAll ? "Open only" : "Show closed too"}
        </button>
      </div>

      <div className="mt-6 grid h-[560px] grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        <div className="overflow-y-auto rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
          {convos.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)}
              className={`block w-full border-b border-line-2 px-4 py-3 text-left last:border-0 hover:bg-raised ${sel === c.id ? "bg-brand-wash/50" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-[13.5px] font-bold text-ink">{c.name}{c.status === "CLOSED" ? " · closed" : ""}</span>
                <span className="flex items-center gap-1.5">
                  {c.unread > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[10.5px] font-bold text-white">{c.unread}</span>}
                  <span className="text-[10.5px] text-muted">{new Date(c.lastAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                </span>
              </div>
              <div className="mt-0.5 truncate text-[12px] text-muted">{c.last}</div>
            </button>
          ))}
          {convos.length === 0 && <div className="p-8 text-center text-sm text-muted">No conversations yet. The chat bubble is live on your website and booking pages.</div>}
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-[var(--shadow-card)]">
          {thread ? (
            <>
              <div className="flex items-center justify-between border-b border-line-2 px-5 py-3">
                <div>
                  <div className="text-[14.5px] font-bold text-ink">{thread.name ?? "Visitor"}</div>
                  <div className="text-[11.5px] text-muted">{thread.contact ?? "no contact left"}{thread.clientId && <a href={`/clients/${thread.clientId}`} className="ml-2 font-bold text-brand hover:underline">Open client →</a>}</div>
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
                  placeholder="Type your reply…" className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand" />
                <button onClick={send} className="rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-ink">Send</button>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted">Pick a conversation on the left.</div>
          )}
        </div>
      </div>
    </div>
  );
}
