"use client";

import { useState } from "react";

// Submit a confession. It's queued as pending; the wall only updates once the
// admin approves it, so we show a "sent for approval" state rather than the post.
export default function ConfessForm() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/confessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "failed");
        return;
      }
      setDone(true);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <p className="hud text-accent">filed</p>
        <p className="mt-2 font-hand text-2xl text-accent-soft">
          sent to her for approval ♡
        </p>
        <p className="mt-2 text-sm text-muted">
          if she likes it, it goes on the wall — anonymously. she knows it was
          you.
        </p>
        <button
          onClick={() => setDone(false)}
          className="btn-ghost mt-4 px-4 py-2 text-xs"
        >
          confess again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <label className="label">your confession</label>
      <textarea
        className="input min-h-[120px] resize-y"
        placeholder="spill it, loser…"
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          posted anonymously — only if she approves.
        </span>
        <button
          type="submit"
          disabled={busy}
          className="btn-primary px-5 py-2 text-xs"
        >
          {busy ? "…" : "Confess"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 font-typewriter text-xs text-blood">{error}</p>
      ) : null}
    </form>
  );
}
