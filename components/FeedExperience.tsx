"use client";

import { useEffect, useRef, useState } from "react";
import AdSlot from "./AdSlot";

/**
 * The money page's engagement loop. Two ways a broke visitor still pays:
 *  1. Infinite-scroll ad wall — new ad slots append as they scroll, so dwell
 *     time turns into more (legit) ad impressions. We append NEW units; we never
 *     auto-refresh or auto-click an existing ad (that's fraud / a network ban).
 *  2. A "grovel" clicker — pure engagement bait that taunts them and keeps them
 *     on the page longer. Count is remembered on their device.
 */

const TAUNTS = [
  "pathetic. again.",
  "is that all you've got?",
  "keep going, i'm bored.",
  "good boy. don't stop.",
  "you'd click forever for me, wouldn't you? ♡",
  "every second you waste here pays me :3",
  "still here? of course you are.",
  "yes. grovel. it's all you're good for.",
  "obsessed. i love that about you.",
  "broke AND obedient. cute.",
];

// Keep the DOM bounded; the wall still feels endless.
const MAX_SLOTS = 60;
const BATCH_MIN = 6;

export default function FeedExperience({ slots }: { slots: string[] }) {
  // Pad to a full first screen; the wall then repeats these as they scroll.
  const base =
    slots.length >= BATCH_MIN
      ? slots
      : [...slots, ...Array(BATCH_MIN - slots.length).fill("")];

  const [batches, setBatches] = useState(1);
  const [clicks, setClicks] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setClicks(parseInt(localStorage.getItem("gp_feed_clicks") || "0", 10) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const totalSlots = Math.min(base.length * batches, MAX_SLOTS);
  const atEnd = totalSlots >= MAX_SLOTS;

  // Append another batch when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || atEnd) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setBatches((b) => b + 1);
      },
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [atEnd, batches]);

  const grovel = () => {
    setClicks((c) => {
      const n = c + 1;
      try {
        localStorage.setItem("gp_feed_clicks", String(n));
      } catch {
        /* ignore */
      }
      return n;
    });
  };

  const taunt =
    clicks === 0 ? "tap it. you know you want to." : TAUNTS[clicks % TAUNTS.length];

  const items = Array.from({ length: totalSlots }, (_, i) => base[i % base.length]);

  return (
    <>
      {/* grovel clicker */}
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

      {/* endless ad wall */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((html, i) => (
          <AdSlot key={i} html={html} index={i} />
        ))}
      </div>

      <div ref={sentinel} className="h-10" />
      <p className="mt-6 text-center font-hand text-2xl text-accent-soft">
        {atEnd
          ? "that's enough for now. come back tomorrow, loser ♡"
          : "keep scrolling ▾ the wall doesn't end"}
      </p>
    </>
  );
}
