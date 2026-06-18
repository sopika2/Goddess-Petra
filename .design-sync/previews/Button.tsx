import type { ReactNode } from "react";
import { Button } from "@gp/design-system";

/** Dark brand surface — these components are designed for the site's ink background. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#0a0a0f",
        padding: 32,
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

export function Primary() {
  return (
    <Stage>
      <Button variant="primary">Enter the site</Button>
    </Stage>
  );
}

export function Ghost() {
  return (
    <Stage>
      <Button variant="ghost">View gallery</Button>
    </Stage>
  );
}

export function PrimaryAndGhost() {
  return (
    <Stage>
      <Button variant="primary">Subscribe</Button>
      <Button variant="ghost">Maybe later</Button>
    </Stage>
  );
}

export function AsLink() {
  return (
    <Stage>
      <Button href="#" variant="primary">
        Book a session
      </Button>
    </Stage>
  );
}

export function Disabled() {
  return (
    <Stage>
      <Button disabled>Processing…</Button>
    </Stage>
  );
}
