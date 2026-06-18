import type { ReactNode } from "react";
import { LinkCard } from "@gp/design-system";

function Stage({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#0a0a0f", padding: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

export function LinkHub() {
  return (
    <Stage>
      <LinkCard label="OnlyFans" hint="Subscribe" href="#" external />
      <LinkCard label="X / Twitter" hint="@goddesspetra" href="#" external />
      <LinkCard label="Book a session" hint="Calendar" href="#" />
      <LinkCard label="Photo gallery" hint="Free preview" href="#" />
    </Stage>
  );
}

export function Single() {
  return (
    <Stage>
      <LinkCard label="Join the VIP list" hint="Members only" href="#" />
    </Stage>
  );
}
