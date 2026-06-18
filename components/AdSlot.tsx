"use client";

import { useEffect, useRef } from "react";

/**
 * Renders a single ad embed. Ad-network tags are usually <script> blocks, and
 * React's dangerouslySetInnerHTML does NOT execute injected scripts — so we set
 * the markup and then re-create each <script> node so the browser runs it.
 *
 * The HTML comes from the admin's own settings (the operator pastes their ad
 * network code), so this is first-party trusted content by design.
 */
export default function AdSlot({ html, index }: { html: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !html) return;
    el.innerHTML = html;
    el.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      for (const attr of Array.from(old.attributes)) {
        s.setAttribute(attr.name, attr.value);
      }
      s.text = old.textContent || "";
      old.replaceWith(s);
    });
    // Tear the markup down if the html changes or the slot unmounts, so editing
    // ads in the admin doesn't stack duplicate embeds in the same session.
    return () => {
      el.innerHTML = "";
    };
  }, [html]);

  if (!html) {
    return (
      <div className="ad-slot flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
        <span className="hud text-muted">ad slot #{index + 1}</span>
        <span className="font-hand text-xl text-accent-soft">
          your money goes here ♡
        </span>
        <span className="font-typewriter text-[10px] text-muted">
          paste an ad embed in admin → settings
        </span>
      </div>
    );
  }

  return <div ref={ref} className="ad-slot overflow-hidden" />;
}
