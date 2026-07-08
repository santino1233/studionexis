"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("nx2-theme", next);
    } catch {}
    setDark(!dark);
  }

  return (
    <button onClick={toggle} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium text-ink-2 hover:bg-line-2 hover:text-ink">
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
