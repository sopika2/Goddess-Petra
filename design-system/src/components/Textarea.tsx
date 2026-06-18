import React from "react";
import { cn } from "../lib/cn";

export interface TextareaProps {
  /** Placeholder text. */
  placeholder?: string;
  /** Controlled value. */
  value?: string;
  /** id for label association. */
  id?: string;
  /** Number of visible rows. */
  rows?: number;
  /** Change handler — receives the new value. */
  onChange?: (value: string) => void;
  /** Extra class names. */
  className?: string;
}

/** Multi-line text field, styled to match `Input`. Use for longer-form copy. */
export function Textarea({
  placeholder,
  value,
  id,
  rows = 4,
  onChange,
  className,
}: TextareaProps) {
  return (
    <textarea
      id={id}
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn("input resize-y", className)}
    />
  );
}
