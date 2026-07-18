import { appsOf } from "@/lib/webhooks";

// "Chat on Zalo" floating button for a studio's public pages (bottom-left, so
// it never collides with the chat bubble at bottom-right). Renders only when
// the studio has added the Zalo app with an id.
export function ZaloButton({ policies }: { policies: unknown }) {
  const id = appsOf(policies).zaloId;
  if (!id) return null;
  return (
    <a
      href={`https://zalo.me/${encodeURIComponent(id)}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 left-5 z-[55] flex items-center gap-2 rounded-full bg-[#0068FF] px-4 py-3 text-[13px] font-bold text-white shadow-xl transition-transform hover:scale-105"
      aria-label="Chat on Zalo"
      style={{ fontFamily: "inherit" }}
    >
      <span className="grid size-5 place-items-center rounded-full bg-white text-[9px] font-extrabold text-[#0068FF]">Z</span>
      Chat on Zalo
    </a>
  );
}
