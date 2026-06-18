import type { ReactNode } from "react";
import { SiteFooter } from "@gp/design-system";

function Stage({ children }: { children: ReactNode }) {
  return <div style={{ background: "#0a0a0f", paddingTop: 8 }}>{children}</div>;
}

export function Default() {
  return (
    <Stage>
      <SiteFooter />
    </Stage>
  );
}

export function CustomBrand() {
  return (
    <Stage>
      <SiteFooter siteName="Petra Studios" year={2025} />
    </Stage>
  );
}
