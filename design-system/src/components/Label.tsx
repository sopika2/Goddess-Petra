import React from "react";
import { cn } from "../lib/cn";

export interface LabelProps {
  /** Label text. */
  children?: React.ReactNode;
  /** id of the form control this labels. */
  htmlFor?: string;
  /** Extra class names. */
  className?: string;
}

/** Form field label in the muted brand color. Pair with `Input`/`Textarea`. */
export function Label({ children, htmlFor, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn("label", className)}>
      {children}
    </label>
  );
}
