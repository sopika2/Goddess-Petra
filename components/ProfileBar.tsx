import Link from "next/link";
import type { Profile } from "@/lib/types";

export default function ProfileBar({ profile }: { profile: Profile }) {
  return (
    <Link href={`/exposed/${profile.slug}`} className="case-row group">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
        {profile.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.thumbnail}
            alt={profile.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-2xl text-muted">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{profile.name}</p>
        {profile.tagline ? (
          <p className="truncate font-hand text-lg text-accent-soft">
            {profile.tagline}
          </p>
        ) : null}
        {profile.twitter ? (
          <p className="mt-0.5 truncate font-typewriter text-xs text-accent">
            @{profile.twitter}
          </p>
        ) : null}
      </div>

      <span className="stamp shrink-0 rotate-6 border-blood text-blood">
        Exposed
      </span>
    </Link>
  );
}
