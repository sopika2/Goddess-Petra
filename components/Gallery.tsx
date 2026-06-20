"use client";

import { useState } from "react";
import { isVideoUrl } from "@/lib/format";

function PlayBadge() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/60 text-lg text-white backdrop-blur">
        ▶
      </span>
    </span>
  );
}

export default function Gallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  if (images.length === 0) {
    return <p className="text-sm text-muted">No media in this gallery yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((src, i) => (
          <button
            key={src + i}
            onClick={() => setActive(src)}
            className="relative aspect-square overflow-hidden rounded-xl bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
          >
            {isVideoUrl(src) ? (
              <>
                <video
                  src={src}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover transition hover:scale-105"
                />
                <PlayBadge />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={`${name} — media ${i + 1}`}
                className="h-full w-full object-cover transition hover:scale-105"
              />
            )}
          </button>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur"
        >
          {isVideoUrl(active) ? (
            <video
              src={active}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-full rounded-lg shadow-glow"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active}
              alt={name}
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-glow"
            />
          )}
          <button
            onClick={() => setActive(null)}
            aria-label="Close"
            className="absolute right-5 top-5 text-3xl text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
