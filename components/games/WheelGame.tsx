"use client";

import { useState } from "react";

// Brand-ish segment colors, cycled across the wheel.
const COLORS = ["#ff2e88", "#2a2330", "#b3005e", "#39323b", "#f4c400", "#1a1620"];

/**
 * Spin wheel of Throne gifts. The OUTCOME is decided server-side
 * (/api/games/spin) — this only animates the wheel to the returned index, then
 * reveals the gift + a Throne tribute CTA. Requires the visitor to be signed in
 * (the API 401s otherwise).
 */
export default function WheelGame({
  segments,
  throneUrl,
  throneButton,
}: {
  segments: string[];
  throneUrl: string;
  throneButton: string;
}) {
  const segs = segments.filter(Boolean);
  const n = Math.max(segs.length, 1);
  const seg = 360 / n;
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gradient = `conic-gradient(${segs
    .map(
      (_, i) =>
        `${COLORS[i % COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`,
    )
    .join(", ")})`;

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/games/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "wheel" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "spin failed");
        setSpinning(false);
        return;
      }
      const i = typeof data.index === "number" ? data.index : 0;
      // Land segment i's center under the top pointer, plus 5 full spins.
      const base = Math.ceil(rot / 360) * 360;
      const target = base + 360 * 5 + (360 - (i * seg + seg / 2));
      setRot(target);
      window.setTimeout(() => {
        setResult(data.result || segs[i] || "");
        setSpinning(false);
      }, 4300);
    } catch {
      setError("spin failed");
      setSpinning(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-[300px] w-[300px] max-w-full">
        <div
          className="absolute left-1/2 top-[-4px] z-10 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "22px solid #fff",
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
        >
          {segs.map((label, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-left"
              style={{ transform: `rotate(${i * seg + seg / 2}deg) translate(34px, -0.6em)` }}
            >
              <span className="whitespace-nowrap font-typewriter text-[10px] font-bold uppercase tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
                {label}
              </span>
            </div>
          ))}
          <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white" />
        </div>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="btn-grovel disabled:opacity-70"
      >
        {spinning ? "rigging your fate…" : "SPIN ♡"}
      </button>

      {error ? (
        <p className="font-typewriter text-xs uppercase tracking-wide text-blood">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="card max-w-sm p-5 text-center">
          <p className="hud text-muted">the wheel has spoken</p>
          <p className="mt-2 font-display text-2xl text-accent">{result}</p>
          <p className="mt-2 font-hand text-xl text-accent-soft">
            pay up. you knew you&apos;d lose ♡
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
        </div>
      ) : null}
    </div>
  );
}
