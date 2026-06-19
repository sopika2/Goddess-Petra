"use client";

import { useEffect, useState } from "react";
import AdSlot from "./AdSlot";

/**
 * The money page's engagement loop. The "grovel" clicker is the real earner for
 * broke visitors: each click is a document click, which is what arms the
 * popunder (ExoClick zone, triggered on the .btn-grovel class).
 *
 * The popunder is frequency-capped (e.g. 1 / minute). We show a live COOLDOWN
 * timer synced to the real ad: ExoClick dispatches a `creativeDisplayed-<zone>`
 * event and writes a `zone-cap-<zone>` cookie when a pop fires, so we can show
 * exactly when the next one is available — nudging them to come back and click.
 */

const TAUNTS = [
  "pathetic. again.",
  "is that all you've got?",
  "keep going, i'm bored.",
  "good boy. don't stop.",
  "you'd click forever for me, wouldn't you? ♡",
  "every click you waste here pays me :3",
  "still here? of course you are.",
  "yes. grovel. it's all you're good for.",
  "obsessed. i love that about you.",
  "broke AND obedient. cute.",
];

export default function FeedExperience({
  slots,
  popZoneId = "",
  cooldown = 60,
}: {
  slots: string[];
  popZoneId?: string;
  cooldown?: number;
}) {
  // Real ads (each shown once), or a row of placeholders when none are set yet.
  const items = slots.length > 0 ? slots : ["", "", ""];
  const [clicks, setClicks] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    try {
      setClicks(parseInt(localStorage.getItem("gp_feed_clicks") || "0", 10) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  // Sync the cooldown to ExoClick's real popunder state.
  useEffect(() => {
    if (!popZoneId) return;
    const readCookie = () => {
      const m = document.cookie.match(
        new RegExp("(?:^|; )zone-cap-" + popZoneId + "=([^;]*)"),
      );
      if (!m) return 0;
      const ts = parseInt(decodeURIComponent(m[1]).split(";")[1] || "0", 10);
      return ts > 0 ? (ts + cooldown) * 1000 : 0;
    };
    setCooldownUntil(readCookie());
    setNow(Date.now());
    const onFire = () => setCooldownUntil(Date.now() + cooldown * 1000);
    document.addEventListener("creativeDisplayed-" + popZoneId, onFire);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      document.removeEventListener("creativeDisplayed-" + popZoneId, onFire);
      clearInterval(tick);
    };
  }, [popZoneId, cooldown]);

  const grovel = () =>
    setClicks((c) => {
      const n = c + 1;
      try {
        localStorage.setItem("gp_feed_clicks", String(n));
      } catch {
        /* ignore */
      }
      return n;
    });

  const taunt =
    clicks === 0 ? "tap it. you know you want to." : TAUNTS[clicks % TAUNTS.length];

  const remaining =
    popZoneId && now ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const onCooldown = remaining > 0;
  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <>
      {/* grovel clicker — each click (off cooldown) fires the popunder */}
      <div className="mx-auto mb-12 max-w-md text-center">
        <button
          type="button"
          onClick={grovel}
          aria-label="Grovel"
          className={`btn-grovel ${onCooldown ? "opacity-60" : ""}`}
        >
          grovel ♡
        </button>
        <p className="mt-5 font-hand text-2xl text-accent-soft">
          you&apos;ve grovelled{" "}
          <span className="text-accent">{clicks.toLocaleString()}</span> times for me
        </p>
        {popZoneId ? (
          <p className="mt-2 font-typewriter text-xs uppercase tracking-wide">
            {onCooldown ? (
              <span className="text-muted">
                cooldown — feed me again in{" "}
                <span className="text-accent">{mmss}</span>
              </span>
            ) : (
              <span className="text-accent">
                <span className="rec-dot">●</span> ready — feed me ♡
              </span>
            )}
          </p>
        ) : null}
        <p className="mt-1 font-typewriter text-xs text-muted">{taunt}</p>
      </div>

      {/* banners — centered, each shown once */}
      <div className="flex flex-wrap justify-center gap-6">
        {items.map((html, i) => (
          <div key={i} className="w-full max-w-[360px]">
            <AdSlot html={html} index={i} />
          </div>
        ))}
      </div>
    </>
  );
}
