import Link from "next/link";
import type { Profile } from "@/lib/types";
import { isVideoUrl } from "@/lib/format";

// Desktop "evidence board" card — a mugshot-style tile for the Exposed Wall grid.
export default function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/exposed/${profile.slug}`}
      className="card group relative flex w-60 flex-col overflow-hidden p-3 transition hover:border-accent-soft hover:shadow-glow"
    >
      <span className="stamp absolute right-3 top-3 z-10 rotate-6 border-blood text-blood">
        Exposed
      </span>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-surface-2">
        {profile.thumbnail ? (
          isVideoUrl(profile.thumbnail) ? (
            <>
              <video
                src={profile.thumbnail}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <span className="pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-xs text-white backdrop-blur">
                ▶
              </span>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.thumbnail}
              alt={profile.name}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-5xl text-muted">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <p className="truncate font-bold text-white">{profile.name}</p>
        {profile.tagline ? (
          <p className="truncate font-hand text-lg text-accent-soft">
            {profile.tagline}
          </p>
        ) : null}
        {profile.twitter ? (
          <p className="truncate font-typewriter text-xs text-accent">
            @{profile.twitter}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
