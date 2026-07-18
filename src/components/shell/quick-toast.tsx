"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

// Brief success toast after a quick-add. Reads ?added= from the URL client-side
// (no Suspense needed), shows a confirmation, then strips the param.
const MSG: Record<string, string> = {
  client: "Client added",
  class: "Class added to the calendar",
  block: "Time blocked",
};

export function QuickToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const a = p.get("added");
    if (a && MSG[a]) {
      setMsg(MSG[a]);
      p.delete("added");
      const url = window.location.pathname + (p.toString() ? `?${p}` : "");
      window.history.replaceState(null, "", url);
      const t = setTimeout(() => setMsg(null), 3200);
      return () => clearTimeout(t);
    }
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-canvas shadow-xl">
      <Check className="size-4" /> {msg}
    </div>
  );
}
