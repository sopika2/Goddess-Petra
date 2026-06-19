"use client";

import { useEffect, useRef } from "react";

/**
 * Injects an invisible, page-level ad script (popunder / social-bar / smartlink)
 * and executes any <script> tags it contains (React's innerHTML won't run them).
 * Renders nothing visible — these ad formats have no banner of their own; they
 * react to clicks / load their own overlay. Used on the /feed money page only.
 */
export default function AdScript({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!html) return;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = html;
    el.querySelectorAll("script").forEach((old) => {
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
  }, [html]);

  if (!html) return null;
  return <div ref={ref} style={{ display: "none" }} aria-hidden />;
}
