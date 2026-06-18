import type { ReactNode } from "react";
import { Label, Input, Textarea } from "@gp/design-system";

/** Label is meant to sit above a form control, so previews show the real pairing. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#0a0a0f", padding: 32, maxWidth: 360 }}>{children}</div>
  );
}

export function WithInput() {
  return (
    <Stage>
      <Label htmlFor="name">Display name</Label>
      <Input id="name" placeholder="Goddess Petra" />
    </Stage>
  );
}

export function WithTextarea() {
  return (
    <Stage>
      <Label htmlFor="bio">Bio</Label>
      <Textarea id="bio" placeholder="Tell visitors about yourself…" />
    </Stage>
  );
}
