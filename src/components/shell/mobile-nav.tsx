"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/shell/sidebar";

export function MobileNav({ slug = "", role = "OWNER" }: { slug?: string; role?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever navigation happens.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 grid size-10 place-items-center rounded-xl border border-line-2 bg-surface text-ink-2 shadow-[var(--shadow-card)] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] shadow-2xl">
            <Sidebar mobile slug={slug} role={role} />
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 grid size-9 place-items-center rounded-xl text-ink-2 hover:bg-line-2"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
