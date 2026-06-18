import type { ReactNode } from "react";
import { Input, Label } from "@gp/design-system";

function Stage({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#0a0a0f", padding: 32, maxWidth: 360 }}>{children}</div>
  );
}

export function Placeholder() {
  return (
    <Stage>
      <Input placeholder="you@example.com" />
    </Stage>
  );
}

export function Filled() {
  return (
    <Stage>
      <Input value="goddesspetra" />
    </Stage>
  );
}

export function Password() {
  return (
    <Stage>
      <Input type="password" value="supersecret" />
    </Stage>
  );
}

export function WithLabel() {
  return (
    <Stage>
      <Label htmlFor="email">Email address</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </Stage>
  );
}
