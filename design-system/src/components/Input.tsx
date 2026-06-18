import React from "react";
import { cn } from "../lib/cn";

export interface InputProps {
  /** Placeholder text. */
  placeholder?: string;
  /** Controlled value. */
  value?: string;
  /** Input type (text, password, email…). */
  type?: string;
  /** id for label association. */
  id?: string;
  /** Change handler — receives the new value. */
  onChange?: (value: string) => void;
  /** Extra class names. */
  className?: string;
}

/**
 * Single-line text field styled with the brand surface and accent focus ring.
 * Pair with `Label`.
 */
export function Input({
  placeholder,
  value,
  type = "text",
  id,
  onChange,
  className,
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn("input", className)}
    />
  );
}
