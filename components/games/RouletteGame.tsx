"use client";

import { useRef, useState } from "react";

/**
 * Roulette — a real 37-slot European wheel (green 0 + 1–36 red/black). They bet
 * a colour; the OUTCOME is decided server-side (/api/games/spin) and can be
 * rigged per account. Winning only buys mercy — the zero always costs extra.
 */

const RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
// Real European wheel order, so the pockets aren't in a suspiciously tidy line.
const ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const SLICE = 360 / ORDER.length;

function colorOf(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED.has(n) ? "red" : "black";
}
function hexOf(n: number): string {
  const c = colorOf(n);
  return c === "green" ? "#128a4a" : c === "red" ? "#c0113f" : "#1a1620";
}

interface Outcome {
  number: number;
  color: "red" | "black" | "green";
  bet: "red" | "black";
  won: boolean;
  cost: number;
  result: string;
}

export default function RouletteGame({
  throneUrl,
  throneButton,
  onSettled,
}: {
  throneUrl: string;
  throneButton: string;
  onSettled?: () => void;
}) {
  const [bet, setBet] = useState<"red" | "black">("red");
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const gradient = `conic-gradient(${ORDER.map(
    (n, i) => `${hexOf(n)} ${i * SLICE}deg ${(i + 1) * SLICE}deg`,
  ).join(", ")})`;

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setOutcome(null);
    setError(null);
    try {
      const res = await fetch("/api/games/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "roulette", bet }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "spin failed");
        setSpinning(false);
        return;
      }
      // Land the winning pocket's centre under the top pointer (+6 full turns).
      const idx = Math.max(0, ORDER.indexOf(data.number));
      const base = Math.ceil(rot / 360) * 360;
      setRot(base + 360 * 6 + (360 - (idx * SLICE + SLICE / 2)));
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setOutcome(data as Outcome);
        setSpinning(false);
        onSettled?.();
      }, 4300);
    } catch {
      setError("spin failed");
      setSpinning(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <p className="hud text-muted">roulette · the zero is always mine</p>

      <div className="relative h-[260px] w-[260px] max-w-full">
        <div
          className="absolute left-1/2 top-[-4px] z-10 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "20px solid #fff",
          }}
          aria-hidden
        />
        <div
          className="h-full w-full rounded-full border-4 border-white shadow-glow"
          style={{
            background: gradient,
            transform: `rotate(${rot}deg)`,
            transition: spinning
              ? "transform 4s cubic-bezier(0.15, 0.6, 0.2, 1)"
              : "none",
          }}
        />
        <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-surface">
          {outcome ? (
            <span
              className="font-display text-3xl"
              style={{ color: hexOf(outcome.number) === "#1a1620" ? "#fff" : hexOf(outcome.number) }}
            >
              {outcome.number}
            </span>
          ) : (
            <span className="hud text-[9px] text-muted">
              {spinning ? "…" : "place it"}
            </span>
          )}
        </div>
      </div>

      {/* bet picker */}
      <div className="flex items-center gap-2">
        {(["red", "black"] as const).map((c) => (
          <button
            key={c}
            type="button"
            disabled={spinning}
            onClick={() => setBet(c)}
            className={`rounded-full border-2 px-5 py-2 font-typewriter text-xs uppercase tracking-wide transition disabled:opacity-60 ${
              bet === c
                ? "border-white text-white"
                : "border-line text-muted hover:text-white"
            }`}
            style={{ background: bet === c ? (c === "red" ? "#c0113f" : "#1a1620") : undefined }}
          >
            {c}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="btn-feed disabled:opacity-70"
      >
        {spinning ? "no takebacks…" : `bet ${bet} ▸`}
      </button>

      {error ? (
        <p className="font-typewriter text-xs uppercase text-blood">{error}</p>
      ) : null}

      {outcome ? (
        <div className="card w-full max-w-sm p-5 text-center">
          <p className="hud text-muted">
            you called {outcome.bet} · it landed {outcome.color}
          </p>
          {outcome.won ? (
            <>
              <p className="mt-2 font-display text-2xl text-accent">spared ♡</p>
              <p className="mt-2 font-hand text-xl text-accent-soft">
                lucky. try again — it won&apos;t last :3
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-2xl text-blood">
                ${outcome.cost} tribute
              </p>
              <p className="mt-2 font-hand text-xl text-accent-soft">
                {outcome.color === "green"
                  ? "the zero. drained ♡"
                  : "wrong. pay up, loser ♡"}
              </p>
              {throneUrl ? (
                <a
                  href={throneUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-throne mt-4"
                >
                  {throneButton}
                </a>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
