import type { ReactNode } from "react";
import { Gallery } from "@gp/design-system";

/** Distinct gradient tiles so the grid reads as a set of photos offline. */
function tile(a: string, b: string) {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>` +
        `</linearGradient></defs><rect width="300" height="300" fill="url(#g)"/></svg>`,
    )
  );
}

const PHOTOS = [
  tile("#f06595", "#1f1b2b"),
  tile("#d6336c", "#0a0a0f"),
  tile("#a39bb5", "#15131c"),
  tile("#f06595", "#2a2536"),
  tile("#1f1b2b", "#d6336c"),
  tile("#15131c", "#f06595"),
];

function Stage({ children }: { children: ReactNode }) {
  return <div style={{ background: "#0a0a0f", padding: 24, maxWidth: 560 }}>{children}</div>;
}

export function Grid() {
  return (
    <Stage>
      <Gallery images={PHOTOS} name="Goddess Petra" />
    </Stage>
  );
}

export function FewPhotos() {
  return (
    <Stage>
      <Gallery images={PHOTOS.slice(0, 3)} name="Goddess Petra" />
    </Stage>
  );
}
