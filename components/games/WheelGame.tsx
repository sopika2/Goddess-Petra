"use client";

import { useState } from "react";
import { isVideoUrl } from "@/lib/format";

const COLORS = ["#ff2e88", "#2a2330", "#b3005e", "#39323b", "#f4c400", "#1a1620"];

/** Segments are stored as "label", "label|kind" or "label|kind|payload" —
 *  players only ever see the label. */
function labelOf(raw: string): string {
  return String(raw || "").split("|")[0].trim();
}

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
  onSettled,
}: {
  segments: string[];
  throneUrl: string;
  throneButton: string;
  onSettled?: () => void;
}) {
  const segs = segments.map(labelOf).filter(Boolean);
  const n = Math.max(segs.length, 1);
  const seg = 360 / n;
  // Repeating a prize gives it more slices (that's how she weights the odds),
  // so colour by the LABEL rather than the position — three "$100" slices then
  // read as one fat block of the same colour instead of a confusing rainbow.
  const uniqueLabels = [...new Set(segs)];
  const colorFor = (label: string) =>
    COLORS[Math.max(0, uniqueLabels.indexOf(label)) % COLORS.length];
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultIdx, setResultIdx] = useState(-1);
  const [result, setResult] = useState<string | null>(null);
  const [kind, setKind] = useState<string>("tribute");
  const [payload, setPayload] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Slice geometry for the SVG wheel. Slice i starts at the top and runs
  // clockwise, so the spin maths below (land i's centre under the pointer)
  // stays exactly as it was.
  const R = 150;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const slicePath = (i: number) => {
    if (n === 1) return "";
    const a0 = i * seg - 90;
    const a1 = (i + 1) * seg - 90;
    const x0 = R * Math.cos(rad(a0));
    const y0 = R * Math.sin(rad(a0));
    const x1 = R * Math.cos(rad(a1));
    const y1 = R * Math.sin(rad(a1));
    return `M0,0 L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
  };
  // Keep on-wheel text short enough to stay inside its slice.
  const maxChars = seg >= 60 ? 16 : seg >= 45 ? 13 : seg >= 30 ? 11 : 9;
  const short = (s: string) =>
    s.length > maxChars ? s.slice(0, maxChars - 1) + "…" : s;

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setResultIdx(-1);
    setPayload("");
    setKind("tribute");
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
        setKind(typeof data.kind === "string" ? data.kind : "tribute");
        setPayload(typeof data.payload === "string" ? data.payload : "");
        setResultIdx(i);
        setSpinning(false);
        onSettled?.();
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
        <svg
          viewBox="-160 -160 320 320"
          className="h-full w-full rounded-full border-4 border-white shadow-glow"
          style={{
            transform: `rotate(${rot}deg)`,
            transition: spinning
              ? "transform 4s cubic-bezier(0.15, 0.6, 0.2, 1)"
              : "none",
          }}
        >
          {n === 1 ? (
            <circle r={R} fill={colorFor(segs[0] || "")} />
          ) : (
            segs.map((label, i) => (
              <path key={i} d={slicePath(i)} fill={colorFor(label)} />
            ))
          )}
          {/* the prizes, written on the wheel itself */}
          {segs.map((label, i) => (
            <text
              key={`t${i}`}
              transform={`rotate(${i * seg + seg / 2 - 90}) translate(${R * 0.94}, 0)`}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#fff"
              stroke="#12101a"
              strokeWidth={3}
              paintOrder="stroke"
              style={{
                fontFamily: "var(--font-typewriter), monospace",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {short(label)}
            </text>
          ))}
          <circle r={22} fill="#fff" stroke="#12101a" strokeWidth={3} />
        </svg>
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

      {/* readable legend — one chip per prize, ×N when it has extra slices */}
      <div className="flex max-w-md flex-wrap justify-center gap-2">
        {uniqueLabels.map((label) => {
          const count = segs.filter((s) => s === label).length;
          const won = resultIdx >= 0 && segs[resultIdx] === label;
          return (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-typewriter text-xs transition ${
                won
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-muted"
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: colorFor(label) }}
              />
              {label}
              {count > 1 ? (
                <span className="text-accent-soft">×{count}</span>
              ) : null}
            </span>
          );
        })}
      </div>

      {result ? (
        <div className="card w-full max-w-sm p-5 text-center">
          <p className="hud text-muted">the wheel has spoken</p>
          <p className="mt-2 font-display text-2xl text-accent">{result}</p>

          {kind === "reward" ? (
            <>
              <p className="mt-2 font-hand text-xl text-accent-soft">
                lucky little thing. here — don&apos;t get used to it ♡
              </p>
              {payload ? (
                isVideoUrl(payload) ? (
                  <video
                    src={payload}
                    controls
                    preload="metadata"
                    className="mt-3 max-h-72 w-full rounded-lg"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={payload}
                    alt=""
                    className="mt-3 max-h-72 w-full rounded-lg object-contain"
                  />
                )
              ) : null}
            </>
          ) : kind === "info" ? (
            <Handover demand={payload} />
          ) : kind === "task" ? (
            <>
              <p className="mt-2 font-hand text-xl text-accent-soft">
                that&apos;s an order. go on ♡
              </p>
              {payload ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                  {payload}
                </p>
              ) : null}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** The "hand it over" form shown when the wheel demands something of them. */
function Handover({ demand }: { demand: string }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = answer.trim();
    if (!value || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/games/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demand, answer: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || "failed");
        return;
      }
      setSent(true);
      setAnswer("");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="mt-3 font-hand text-xl text-accent-soft">
        filed. it&apos;s mine now ♡
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 text-left">
      <p className="hud text-[10px] text-blood">
        hand it over{demand ? ` · ${demand}` : ""}
      </p>
      <textarea
        className="input min-h-[70px] w-full resize-y text-sm"
        placeholder={demand || "type it, loser…"}
        value={answer}
        maxLength={1500}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <button type="submit" disabled={busy} className="btn-primary px-5 py-2 text-xs">
        {busy ? "…" : "Give it to her"}
      </button>
      {err ? (
        <p className="font-typewriter text-xs text-blood">{err}</p>
      ) : null}
    </form>
  );
}
