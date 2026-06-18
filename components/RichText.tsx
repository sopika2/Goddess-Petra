import React from "react";

/**
 * Renders text with [[double-bracket]] segments turned into redaction bars
 * (real text underneath, revealed on hover/focus). Safe in server components.
 *
 * NOTE: this is a VISUAL effect only — the real text is still present in the
 * page HTML (view-source, DOM inspector, scrapers, screen readers all see it).
 * Never use it to conceal genuinely private information.
 */
export function renderWithRedactions(text: string): React.ReactNode {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[\[([^\]]+)\]\]$/);
    if (m) {
      return (
        <span key={i} tabIndex={0} className="redact">
          {m[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
