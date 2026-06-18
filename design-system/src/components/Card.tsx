import React from "react";
import { cn } from "../lib/cn";

export interface CardProps {
  /** Card content. */
  children?: React.ReactNode;
  /** Extra class names (padding, width, etc.). */
  className?: string;
}

/**
 * A raised surface panel with the brand border and backdrop blur. Wrap content
 * sections, forms, and dialogs in it. Add padding via `className` (e.g. `p-8`).
 */
export function Card({ children, className }: CardProps) {
  return <div className={cn("card", className)}>{children}</div>;
}
