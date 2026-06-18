"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "gp_age_verified";
const EXIT_URL = "https://www.google.com";

/**
 * 18+ gate. To avoid a flash on every load, an inline script in the layout sets
 * `document.documentElement[data-age="ok"]` before paint when already verified;
 * CSS then hides #age-gate instantly and frees scroll. The gate markup renders
 * identically on server and first client render (no hydration mismatch); this
 * effect just unmounts it after mount when already verified.
 */
export default function AgeGate() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (document.documentElement.getAttribute("data-age") === "ok") {
      setDone(true);
    }
  }, []);

  if (done) return null;

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    document.documentElement.setAttribute("data-age", "ok");
    setDone(true);
  };

  const decline = () => {
    window.location.href = EXIT_URL;
  };

  return (
    <div
      id="age-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-6 backdrop-blur-md"
    >
      <div className="card relative w-full max-w-md overflow-hidden p-8 text-center shadow-glow">
        <span className="hud text-accent">restricted file</span>
        <h2
          id="age-gate-title"
          className="mt-2 font-display text-3xl uppercase text-white"
        >
          Adults only
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          This site contains adult content and is intended for adults only. By
          entering you confirm that you are{" "}
          <strong className="text-white">18 years of age or older</strong> and
          that adult content is legal where you live.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={accept} className="btn-primary w-full">
            I am 18 or older — Enter
          </button>
          <button onClick={decline} className="btn-ghost w-full">
            I am under 18 — Leave
          </button>
        </div>
        <p className="mt-6 font-typewriter text-[11px] text-muted">
          your choice is logged on this device
        </p>
      </div>
    </div>
  );
}
