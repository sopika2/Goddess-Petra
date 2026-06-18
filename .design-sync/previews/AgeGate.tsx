import type { ReactNode } from "react";
import { AgeGate } from "@gp/design-system";

/**
 * AgeGate is a full-screen `fixed inset-0` overlay. The `transform` on this
 * Scene makes it the containing block for the fixed overlay, so the whole modal
 * is captured inside a card-sized box on the brand backdrop instead of escaping
 * to the viewport.
 */
function Scene({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        height: 540,
        transform: "translateZ(0)",
        overflow: "hidden",
        background: "#0a0a0f",
      }}
    >
      {children}
    </div>
  );
}

export function Default() {
  return (
    <Scene>
      <AgeGate />
    </Scene>
  );
}

export function CustomCopy() {
  return (
    <Scene>
      <AgeGate
        title="18+ content"
        description="Goddess Petra is an adults-only site. Confirm you are of legal age in your jurisdiction to continue."
        acceptLabel="Yes, I'm 18 or older"
        declineLabel="No, take me back"
      />
    </Scene>
  );
}
