"use client";

import { useState } from "react";

const COLORS = ["#ff2e88", "#2a2330", "#b3005e", "#39323b", "#f4c400", "#1a1620"];

/**
 * Spin wheel of Throne gifts. The OUTCOME is decided server-side
 * (/api/games/spin); this only animates the colored wheel so the winning
 * segment lands under the pointer, and shows a readable legend (winner
 * highlighted) + the result + a Throne CTA. No cramped on-wheel text.
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
  const [resultIdx, setResultIdx] = useState(-1);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gradient = `conic-gradient(${segs
    .map((_, i) => `${COLORS[i % COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`)
    .join(", ")})`;

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setResultIdx(-1);
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
      // Land segment i's CENTER under the top pointer (+5 full spins).
      const base = Math.ceil(rot / 360) * 360;
      const target = base + 360 * 5 + (360 - (i * seg + seg / 2));
      setRot(target);
      window.setTimeout(() => {
        setResult(data.result ?? segs[i] ?? "");
        setResultIdx(i);
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
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white" />
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

      {/* readable legend — winner highlights */}
      <div className="flex max-w-md flex-wrap justify-center gap-2">
        {segs.map((label, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-typewriter text-xs transition ${
              resultIdx === i
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-muted"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {label}
          </span>
        ))}
      </div>

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
