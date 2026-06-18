import type { ReactNode } from "react";
import { ProfileBar } from "@gp/design-system";

const THUMB = (a: string, b: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">` +
      `<defs><radialGradient id="g" cx="0.4" cy="0.3" r="0.9">` +
      `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>` +
      `</radialGradient></defs><rect width="120" height="120" fill="url(#g)"/></svg>`,
  );

function Stage({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#0a0a0f", padding: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

export function DirectoryWall() {
  return (
    <Stage>
      <ProfileBar
        name="Goddess Petra"
        tagline="Dominatrix · Lifestyle Creator"
        twitter="goddesspetra"
        thumbnail={THUMB("#f06595", "#1f1b2b")}
        href="#"
      />
      <ProfileBar
        name="Mistress Vex"
        tagline="Findom · Berlin"
        twitter="mistressvex"
        thumbnail={THUMB("#d6336c", "#0a0a0f")}
        href="#"
      />
      <ProfileBar name="Lady Ash" tagline="New this week" href="#" />
    </Stage>
  );
}

export function SingleRow() {
  return (
    <Stage>
      <ProfileBar
        name="Goddess Petra"
        tagline="Dominatrix · Lifestyle Creator"
        twitter="goddesspetra"
        thumbnail={THUMB("#f06595", "#1f1b2b")}
        href="#"
      />
    </Stage>
  );
}
