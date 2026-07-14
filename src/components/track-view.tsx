"use client";

import { useEffect } from "react";

// Fire-and-forget page-view beacon for public pages.
export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    const utm = new URLSearchParams(window.location.search).get("utm_source") ?? "";
    fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, path: window.location.pathname, ref: document.referrer, utm }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
