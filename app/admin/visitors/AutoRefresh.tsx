"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Live log refresh: while "live" is on, re-runs the server component on an
 * interval (router.refresh) so new visits/logins appear without a manual reload.
 * It's a soft refresh — the current filter, scroll position and any text typed
 * into the search box are preserved.
 */
export default function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [live, seconds, router]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLive((v) => !v)}
        aria-pressed={live}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-typewriter text-xs uppercase tracking-wide transition ${
          live
            ? "border-accent text-accent"
            : "border-line text-muted hover:border-accent hover:text-accent"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${live ? "rec-dot bg-accent" : "bg-muted"}`}
        />
        {live ? "live" : "paused"}
      </button>
      <button
        type="button"
        onClick={() => router.refresh()}
        title="Refresh now"
        className="rounded-full border border-line px-3 py-1.5 font-typewriter text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent"
      >
        ↻
      </button>
    </div>
  );
}
