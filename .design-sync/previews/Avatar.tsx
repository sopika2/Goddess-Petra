import type { ReactNode } from "react";
import { Avatar } from "@gp/design-system";

const PORTRAIT =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<defs><radialGradient id="g" cx="0.35" cy="0.3" r="0.9">' +
      '<stop offset="0" stop-color="#f06595"/><stop offset="0.55" stop-color="#d6336c"/>' +
      '<stop offset="1" stop-color="#1f1b2b"/></radialGradient></defs>' +
      '<rect width="200" height="200" fill="url(#g)"/></svg>',
  );

function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#0a0a0f",
        padding: 32,
        display: "flex",
        gap: 24,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}

export function WithPhoto() {
  return (
    <Stage>
      <Avatar src={PORTRAIT} alt="Goddess Petra" />
    </Stage>
  );
}

export function InitialFallback() {
  return (
    <Stage>
      <Avatar alt="Petra" />
    </Stage>
  );
}

export function Sizes() {
  return (
    <Stage>
      <Avatar src={PORTRAIT} alt="Petra" size={48} />
      <Avatar src={PORTRAIT} alt="Petra" size={72} />
      <Avatar src={PORTRAIT} alt="Petra" size={120} />
    </Stage>
  );
}
