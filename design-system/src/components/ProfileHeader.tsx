import React from "react";
import { Avatar } from "./Avatar";

export interface ProfileHeaderProps {
  /** Display name. */
  name: string;
  /** Tagline shown under the name in the accent color. */
  tagline?: string;
  /** X / Twitter handle without the leading @ — renders a link to x.com. */
  twitter?: string;
  /** Avatar image URL. */
  thumbnail?: string;
}

/**
 * Profile page header: large avatar beside the name, tagline, and an optional
 * link to the person's X profile. Use at the top of a detail page.
 */
export function ProfileHeader({
  name,
  tagline,
  twitter,
  thumbnail,
}: ProfileHeaderProps) {
  return (
    <section className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
      <Avatar src={thumbnail} alt={name} size={128} className="rounded-2xl" />
      <div>
        <h1 className="font-display text-4xl font-bold">{name}</h1>
        {tagline ? <p className="mt-2 text-accent-soft">{tagline}</p> : null}
        {twitter ? (
          <a
            href={`https://x.com/${twitter}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-muted hover:text-accent-soft"
          >
            @{twitter} on X ↗
          </a>
        ) : null}
      </div>
    </section>
  );
}
