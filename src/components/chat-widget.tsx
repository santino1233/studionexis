"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "visitor" | "studio"; name: string; text: string; at: string };

// Floating Tidio-style chat bubble for studio public pages.
export function ChatWidget({ slug, brand, studio }: { slug: string; brand: string; studio: string }) {
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const pull = async (markRead: boolean) => {
    try {
      const res = await fetch(`/api/public/chat?slug=${encodeURIComponent(slug)}${markRead ? "&read=1" : ""}`);
      const d = await res.json();
      if (d.disabled) { setDisabled(true); return; }
      setMessages(d.messages ?? []);
      setUnread(markRead ? 0 : d.unread ?? 0);
    } catch {}
  };

  useEffect(() => {
    pull(false);
    const t = setInterval(() => pull(openRef.current), openRef.current ? 3000 : 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);
  useEffect(() => { if (open) pull(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  if (disabled) return null;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setMessages((m) => [...m, { from: "visitor", name: name || "You", text: t, at: new Date().toISOString() }]);
    await fetch("/api/public/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, text: t, name }),
    }).catch(() => {});
    pull(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60]" style={{ fontFamily: "inherit" }}>
      {open && (
        <div className="mb-3 flex h-[440px] w-[330px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ background: brand }}>
            <div>
              <div className="text-[14px] font-bold">{studio}</div>
              <div className="text-[11px] opacity-85">We usually reply within a few hours</div>
            </div>
            <button onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-full bg-white/20 text-[13px]">✕</button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto bg-[#f7f6f4] p-3">
            {messages.length === 0 && (
              <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px] text-[#333] shadow-sm">
                👋 Hi! Ask us anything about classes, packages or bookings.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] shadow-sm ${m.from === "visitor" ? "ml-auto rounded-br-sm text-white" : "rounded-tl-sm bg-white text-[#333]"}`}
                style={m.from === "visitor" ? { background: brand } : undefined}>
                {m.from === "studio" && <div className="text-[10px] font-bold opacity-60">{m.name}</div>}
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          {messages.length === 0 && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)"
              className="border-t border-black/5 px-4 py-2 text-[12.5px] outline-none placeholder:text-[#999]" />
          )}
          <div className="flex items-center gap-2 border-t border-black/10 p-2.5">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…" className="h-10 flex-1 rounded-xl bg-[#f1f0ee] px-3.5 text-[13px] outline-none placeholder:text-[#999]" />
            <button onClick={send} className="grid size-10 place-items-center rounded-xl text-white" style={{ background: brand }}>➤</button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="relative grid size-14 place-items-center rounded-full text-[22px] text-white shadow-xl transition-transform hover:scale-105" style={{ background: brand }}>
        {open ? "✕" : "💬"}
        {!open && unread > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-[11px] font-bold">{unread}</span>}
      </button>
    </div>
  );
}
