import Link from "next/link";
import type { Profile } from "@/lib/types";
import { isVideoUrl } from "@/lib/format";

export default function ProfileBar({ profile }: { profile: Profile }) {
  return (
    <Link href={`/exposed/${profile.slug}`} className="case-row group">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
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
              <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-[9px] text-white backdrop-blur">
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
