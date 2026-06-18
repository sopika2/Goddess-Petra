import type { ReactNode } from "react";
import { Textarea, Label } from "@gp/design-system";

function Stage({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#0a0a0f", padding: 32, maxWidth: 360 }}>{children}</div>
  );
}

export function Placeholder() {
  return (
    <Stage>
      <Textarea placeholder="Write a message to Goddess Petra…" />
    </Stage>
  );
}

export function Filled() {
  return (
    <Stage>
      <Textarea
        rows={5}
        value={"Hi Petra,\n\nI'd love to book a private session next week. Let me know your availability.\n\n— A fan"}
      />
    </Stage>
  );
}

export function WithLabel() {
  return (
    <Stage>
      <Label htmlFor="msg">Your message</Label>
      <Textarea id="msg" placeholder="Say hello…" />
    </Stage>
  );
}
