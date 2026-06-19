"use client";

import { useEffect, useState } from "react";
import AdSlot from "./AdSlot";

/**
 * The money page's engagement loop. The "grovel" clicker is the real earner for
 * broke visitors: every click is a document click, which is what arms the
 * popunder (see the feed-page ad script). We render each configured banner ONCE
 * — ad networks (Adsterra) collide / flag duplicate placements of the same zone,
 * so we never repeat a real ad. With no ads configured we show placeholders.
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

export default function FeedExperience({ slots }: { slots: string[] }) {
  // Real ads (each shown once), or a row of placeholders when none are set yet.
  const items = slots.length > 0 ? slots : ["", "", ""];
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    try {
      setClicks(parseInt(localStorage.getItem("gp_feed_clicks") || "0", 10) || 0);
    } catch {
      /* ignore */
    }
  }, []);

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

  return (
    <>
      {/* grovel clicker — each click can trigger the popunder */}
      <div className="mx-auto mb-12 max-w-md text-center">
        <button
          type="button"
          onClick={grovel}
          aria-label="Grovel"
          className="btn-grovel"
        >
          grovel ♡
        </button>
        <p className="mt-5 font-hand text-2xl text-accent-soft">
          you&apos;ve grovelled{" "}
          <span className="text-accent">{clicks.toLocaleString()}</span> times for me
        </p>
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
