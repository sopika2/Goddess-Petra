import React from "react";

export interface ProfileBarProps {
  /** Display name. */
  name: string;
  /** Short tagline shown under the name. */
  tagline?: string;
  /** X / Twitter handle without the leading @. */
  twitter?: string;
  /** Thumbnail image URL. Falls back to the name's initial. */
  thumbnail?: string;
  /** Where clicking the bar navigates. */
  href?: string;
}

/**
 * A clickable list row — thumbnail + name + tagline + optional @handle — for
 * wall / directory views. The whole row is a link.
 */
export function ProfileBar({
  name,
  tagline,
  twitter,
  thumbnail,
  href = "#",
}: ProfileBarProps) {
  return (
    <a
      href={href}
      className="card group flex items-center gap-4 p-3 transition hover:border-accent-soft hover:shadow-glow"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-muted">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{name}</p>
        {tagline ? (
          <p className="truncate text-sm text-muted">{tagline}</p>
        ) : null}
        {twitter ? (
          <p className="truncate text-xs text-accent-soft">@{twitter}</p>
        ) : null}
      </div>
      <span className="pr-2 text-accent-soft opacity-0 transition group-hover:opacity-100">
        →
      </span>
    </a>
  );
}
