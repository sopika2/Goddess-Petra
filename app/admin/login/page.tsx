import type { Metadata } from "next";
import { Suspense } from "react";
import { isTwitterConfigured } from "@/lib/twitter";
import LoginForm from "./LoginForm";

// Never index the admin login.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Read env at request time (not build time).
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const twitterEnabled = isTwitterConfigured();
  return (
    <Suspense fallback={null}>
      <LoginForm twitterEnabled={twitterEnabled} />
    </Suspense>
  );
}
