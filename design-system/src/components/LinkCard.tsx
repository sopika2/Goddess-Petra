import React from "react";

export interface LinkCardProps {
  /** Main label, e.g. a platform name. */
  label: string;
  /** Secondary hint shown on the right. */
  hint?: string;
  /** Link target. */
  href?: string;
  /** Open in a new tab (for external links). */
  external?: boolean;
}

/**
 * A labeled link row for hub / landing pages (Linktree-style). Shows a bold
 * label on the left and a muted hint on the right.
 */
export function LinkCard({ label, hint, href = "#", external }: LinkCardProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="card flex items-center justify-between px-5 py-4 transition hover:border-accent-soft"
    >
      <span className="font-semibold">{label}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </a>
  );
}
