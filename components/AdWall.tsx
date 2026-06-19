"use client";

import { useEffect, useRef } from "react";

/**
 * Renders all banner ad blocks together in ONE container. This matters for
 * ExoClick: its async tag wants a single ad-provider.js + a single serve call
 * for every <ins> zone on the page. Pasting self-contained blocks into separate
 * slots loads the provider many times and only one zone serves. So we:
 *   1. inject every block's markup into one container (all <ins> present), then
 *   2. execute scripts, loading each external src (e.g. ad-provider.js) ONCE,
 *      and running the inline serve push(es) — which the provider queues and
 *      applies to all <ins> at once.
 * Banners then render at their natural size and wrap side by side.
 *
 * Content is the admin's own pasted ad code (first-party trusted).
 */
export default function AdWall({ blocks }: { blocks: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const real = blocks.filter((b) => b && b.trim());
  const key = real.join("");

  useEffect(() => {
    if (!real.length) return;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = real.join("\n");
    const loaded = new Set<string>();
    el.querySelectorAll("script").forEach((old) => {
      const src = old.getAttribute("src");
      // Load each external script only once (e.g. ExoClick's ad-provider.js).
      if (src) {
        if (loaded.has(src)) {
          old.remove();
          return;
        }
        loaded.add(src);
      }
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) {
        s.setAttribute(attr.name, attr.value);
      }
      s.text = old.textContent || "";
      old.replaceWith(s);
    });
    return () => {
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!real.length) {
    return (
      <div className="flex flex-wrap items-start justify-center gap-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="ad-slot flex min-h-[220px] w-[300px] max-w-full flex-col items-center justify-center gap-2 text-center"
          >
            <span className="hud text-muted">ad slot #{i + 1}</span>
            <span className="font-hand text-xl text-accent-soft">
              your money goes here ♡
            </span>
            <span className="font-typewriter text-[10px] text-muted">
              paste an ad embed in admin → settings
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex flex-wrap items-start justify-center gap-6 [&_ins]:!m-0"
    />
  );
}
