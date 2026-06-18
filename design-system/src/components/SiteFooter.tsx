import React from "react";

export interface SiteFooterProps {
  /** Brand / site name shown in the copyright line. */
  siteName?: string;
  /** Year to display; defaults to the current year. */
  year?: number;
}

/**
 * Page footer with the brand name, year, and an 18+ / consent notice. Place at
 * the bottom of every page.
 */
export function SiteFooter({ siteName = "Goddess Petra", year }: SiteFooterProps) {
  const displayYear = year ?? new Date().getFullYear();
  return (
    <footer className="border-t border-line/60 px-6 py-10 text-center text-xs text-muted">
      <p>
        © {displayYear} {siteName}. All rights reserved. 18+ only.
      </p>
      <p className="mt-2">
        All individuals featured on this site are 18 or older and have consented
        to appear.
      </p>
    </footer>
  );
}
