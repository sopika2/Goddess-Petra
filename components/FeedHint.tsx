"use client";

import { useEffect, useState } from "react";

/**
 * A one-shot callout that fades in on page load, points an arrow up at the
 * FEED ME button, and fades out after ~5 seconds. Desktop only (it's rendered
 * inside the desktop header). Purely decorative / a nudge — pointer-events off.
 */
export default function FeedHint({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const fadeIn = setTimeout(() => setVisible(true), 350);
    const fadeOut = setTimeout(() => setVisible(false), 5350);
    const remove = setTimeout(() => setGone(true), 6000);
    return () => {
      clearTimeout(fadeIn);
      clearTimeout(fadeOut);
      clearTimeout(remove);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute right-0 top-full z-30 mt-3 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative whitespace-nowrap rounded-lg border-2 border-ink bg-accent px-4 py-2 font-typewriter text-xs font-bold uppercase tracking-wide text-ink shadow-stamp">
        <span className="absolute -top-1.5 right-7 h-3 w-3 rotate-45 border-l-2 border-t-2 border-ink bg-accent" />
        ↑ {label}
      </div>
    </div>
  );
}
