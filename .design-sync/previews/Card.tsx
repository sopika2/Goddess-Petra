import type { ReactNode } from "react";
import { Card, Button, Badge } from "@gp/design-system";

function Stage({ children }: { children: ReactNode }) {
  return <div style={{ background: "#0a0a0f", padding: 32 }}>{children}</div>;
}

export function Basic() {
  return (
    <Stage>
      <Card className="max-w-sm p-8">
        <h3 className="font-display text-2xl font-bold text-white">Latest set</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Twelve new photos just dropped in the members gallery. Subscribers get
          full-resolution downloads and behind-the-scenes clips.
        </p>
      </Card>
    </Stage>
  );
}

export function WithActions() {
  return (
    <Stage>
      <Card className="max-w-sm p-8">
        <Badge variant="solid">Premium</Badge>
        <h3 className="mt-4 font-display text-2xl font-bold text-white">
          VIP membership
        </h3>
        <p className="mt-2 text-sm text-muted">
          Unlock the full archive, private streams, and direct messages.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="primary">Join now</Button>
          <Button variant="ghost">Learn more</Button>
        </div>
      </Card>
    </Stage>
  );
}
