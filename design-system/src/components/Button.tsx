import React from "react";
import { cn } from "../lib/cn";

export interface ButtonProps {
  /** Visual style: the main call-to-action (`primary`) or a secondary action (`ghost`). */
  variant?: "primary" | "ghost";
  /** Render as an anchor to this URL instead of a `<button>`. */
  href?: string;
  /** Disable the button (button mode only). */
  disabled?: boolean;
  /** Button label / content. */
  children?: React.ReactNode;
  /** Click handler (button mode). */
  onClick?: () => void;
  /** Native button type when not a link. */
  type?: "button" | "submit";
  /** Extra class names for layout glue. */
  className?: string;
}

/**
 * The primary call-to-action control. Use `variant="primary"` for the main
 * action on a screen and `variant="ghost"` for secondary actions. Pass `href`
 * to render a styled link instead of a button.
 */
export function Button({
  variant = "primary",
  href,
  disabled,
  children,
  onClick,
  type = "button",
  className,
}: ButtonProps) {
  const cls = cn(variant === "primary" ? "btn-primary" : "btn-ghost", className);
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
