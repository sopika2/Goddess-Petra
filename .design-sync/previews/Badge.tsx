import type { ReactNode } from "react";
import { Badge } from "@gp/design-system";

function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#0a0a0f",
        padding: 32,
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}

export function Outline() {
  return (
    <Stage>
      <Badge>Official Site</Badge>
    </Stage>
  );
}

export function Solid() {
  return (
    <Stage>
      <Badge variant="solid">New</Badge>
    </Stage>
  );
}

export function BothVariants() {
  return (
    <Stage>
      <Badge>Verified</Badge>
      <Badge variant="solid">Premium</Badge>
      <Badge>18+</Badge>
    </Stage>
  );
}
