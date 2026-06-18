"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const ERROR_TEXT: Record<string, string> = {
  auth_failed: "X sign-in failed, or that account isn’t the authorized admin.",
  twitter_not_configured:
    "X login isn’t set up yet — sign in with your password below.",
  server_config:
    "The server isn’t fully configured — set a strong ADMIN_SESSION_SECRET in .env.local and restart.",
};

export default function LoginForm({
  twitterEnabled,
}: {
  twitterEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const queryError = params.get("error");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(!twitterEnabled);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const banner = error || (queryError ? ERROR_TEXT[queryError] ?? "Login failed." : null);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-display text-2xl font-bold">Admin login</h1>
        <p className="mt-1 text-sm text-muted">
          Restricted area. Sign in to manage profiles.
        </p>

        {banner ? (
          <p className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-soft">
            {banner}
          </p>
        ) : null}

        {twitterEnabled ? (
          <a href="/api/auth/twitter/login" className="btn-primary mt-6 w-full">
            Sign in with X
          </a>
        ) : null}

        {twitterEnabled && !showPassword ? (
          <button
            onClick={() => setShowPassword(true)}
            className="mt-4 w-full text-center text-xs text-muted hover:text-accent-soft"
          >
            or use password instead
          </button>
        ) : null}

        {showPassword ? (
          <form onSubmit={submit} className={twitterEnabled ? "mt-6" : "mt-6"}>
            {twitterEnabled ? (
              <div className="mb-4 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
            ) : null}
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus={!twitterEnabled}
            />
            <button
              type="submit"
              disabled={busy || !password}
              className="btn-ghost mt-4 w-full"
            >
              {busy ? "Checking…" : "Log in with password"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
