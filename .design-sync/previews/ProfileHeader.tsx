import type { ReactNode } from "react";
import { ProfileHeader } from "@gp/design-system";

/** Brand portrait placeholder — a pink-to-surface gradient so the avatar reads offline. */
const PORTRAIT =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
      '<defs><radialGradient id="g" cx="0.35" cy="0.3" r="0.9">' +
      '<stop offset="0" stop-color="#f06595"/><stop offset="0.55" stop-color="#d6336c"/>' +
      '<stop offset="1" stop-color="#1f1b2b"/></radialGradient></defs>' +
      '<rect width="256" height="256" fill="url(#g)"/></svg>',
  );

function Stage({ children }: { children: ReactNode }) {
  return <div style={{ background: "#0a0a0f", padding: 32 }}>{children}</div>;
}

export function WithPhotoAndSocial() {
  return (
    <Stage>
      <ProfileHeader
        name="Goddess Petra"
        tagline="Dominatrix · Lifestyle Creator"
        twitter="goddesspetra"
        thumbnail={PORTRAIT}
      />
    </Stage>
  );
}

export function NoSocial() {
  return (
    <Stage>
      <ProfileHeader name="Mistress Vex" tagline="Findom · Berlin" thumbnail={PORTRAIT} />
    </Stage>
  );
}

export function InitialFallback() {
  return (
    <Stage>
      <ProfileHeader name="Anonymous" tagline="Profile photo coming soon" twitter="anon" />
    </Stage>
  );
}
