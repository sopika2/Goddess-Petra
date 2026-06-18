import React from "react";
import { cn } from "../lib/cn";

export interface BadgeProps {
  /** Badge text. */
  children?: React.ReactNode;
  /** `outline` (subtle, accent text) or `solid` (filled accent). */
  variant?: "outline" | "solid";
  /** Extra class names. */
  className?: string;
}

/**
 * Small uppercase pill — e.g. an "Official Site" tag, a section eyebrow, or a
 * status marker. Letter-spaced and rounded to match the brand.
 */
export function Badge({ children, variant = "outline", className }: BadgeProps) {
  const base =
    "inline-block rounded-full px-4 py-1 text-xs uppercase tracking-[0.2em]";
  const tone =
    variant === "solid"
      ? "bg-accent text-white"
      : "border border-line bg-surface/60 text-accent-soft";
  return <span className={cn(base, tone, className)}>{children}</span>;
}
