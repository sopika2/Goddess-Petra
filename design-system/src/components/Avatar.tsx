import React from "react";
import { cn } from "../lib/cn";

export interface AvatarProps {
  /** Image URL. When absent, shows the first letter of `alt`. */
  src?: string;
  /** Alt text / name (also used for the fallback initial). */
  alt?: string;
  /** Width and height in pixels. */
  size?: number;
  /** Extra class names. */
  className?: string;
}

/**
 * Circular avatar image with the brand glow ring. Falls back to the initial of
 * `alt` when no `src` is given. Use for profile photos and list thumbnails.
 */
export function Avatar({ src, alt = "", size = 96, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-full border-2 border-accent-soft/40 bg-surface-2 shadow-glow",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl text-muted">
          {(alt || "?").charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
