"use client";

import { useState } from "react";

/**
 * Roulette — WIP. Same server-decided + rigged outcome as the wheel
 * (/api/games/spin with game=roulette), just a simpler presentation for now.
 */
export default function RouletteGame({
  throneUrl,
  throneButton,
}: {
  throneUrl: string;
  throneButton: string;
}) {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function roll() {
    if (rolling) return;
    setRolling(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/games/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "roulette" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "roll failed");
        setRolling(false);
        return;
      }
      window.setTimeout(() => {
        setResult(data.result || "");
        setRolling(false);
      }, 1200);
    } catch {
      setError("roll failed");
      setRolling(false);
    }
  }

  return (
    <div className="card flex flex-col items-center gap-4 p-6 text-center">
      <p className="hud text-muted">roulette · wip</p>
      <div className="flex h-20 w-full items-center justify-center font-display text-3xl uppercase">
        {rolling ? (
          <span className="rec-dot text-accent">spinning…</span>
        ) : result ? (
          <span className="text-accent">{result}</span>
        ) : (
          <span className="text-muted">place your fate</span>
        )}
      </div>
      <button
        type="button"
        onClick={roll}
        disabled={rolling}
        className="btn-feed disabled:opacity-70"
      >
        {rolling ? "rolling…" : "roll ▸"}
      </button>
      {error ? (
        <p className="font-typewriter text-xs uppercase text-blood">{error}</p>
      ) : null}
      {result && throneUrl ? (
        <a
          href={throneUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-throne"
        >
          {throneButton}
        </a>
      ) : null}
    </div>
  );
}
