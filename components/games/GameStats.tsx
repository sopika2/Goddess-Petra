"use client";

import { useCallback, useEffect, useImperativeHandle, useState } from "react";
import type { Ref } from "react";

interface Rec {
  spins: number;
  owed: number;
  lastResult: string;
  lastAt: string;
  recent: { result: string; ts: string; game: string }[];
}
interface Leader {
  userId: string;
  username: string;
  name: string;
  spins: number;
  owed: number;
}
interface Tick {
  username: string;
  result: string;
  ts: string;
  game: string;
}

export interface GameStatsHandle {
  refresh: () => void;
}

function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** The scoreboard: your own file, the wall of shame, and the live ticker. */
export default function GameStats({
  throneUrl,
  throneButton,
  ref,
}: {
  throneUrl: string;
  throneButton: string;
  ref?: Ref<GameStatsHandle>;
}) {
  const [me, setMe] = useState<Rec | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [ticker, setTicker] = useState<Tick[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/games/stats", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setMe(d.me || null);
      setLeaders(Array.isArray(d.leaders) ? d.leaders : []);
      setTicker(Array.isArray(d.ticker) ? d.ticker : []);
    } catch {
      /* ignore */
    }
  }, []);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 15000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="grid w-full gap-4 md:grid-cols-2">
      {/* your file */}
      {me ? (
        <div className="card p-5 md:col-span-2">
          <p className="hud text-accent">your file</p>
          <div className="mt-3 flex flex-wrap items-end gap-6">
            <div>
              <p className="font-display text-4xl text-blood">${me.owed}</p>
              <p className="hud text-[9px]">racked up</p>
            </div>
            <div>
              <p className="font-display text-2xl text-white">{me.spins}</p>
              <p className="hud text-[9px]">spins</p>
            </div>
            {me.lastResult ? (
              <div className="min-w-0 flex-1">
                <p className="truncate font-typewriter text-sm text-accent-soft">
                  {me.lastResult}
                </p>
                <p className="hud text-[9px]">last · {ago(me.lastAt)}</p>
              </div>
            ) : null}
          </div>

          {me.owed > 0 && throneUrl ? (
            <a
              href={throneUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-throne mt-4 py-2 text-xs"
            >
              {throneButton}
            </a>
          ) : null}

          {me.recent.length > 0 ? (
            <div className="mt-4 border-t border-line/40 pt-3">
              <p className="hud text-[9px]">your last spins</p>
              <div className="mt-1 space-y-0.5">
                {me.recent.map((r, i) => (
                  <p key={i} className="font-typewriter text-xs text-muted">
                    <span className="text-accent-soft">{r.game}</span> ·{" "}
                    {r.result} · {ago(r.ts)}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* wall of shame */}
      <div className="card p-5">
        <p className="hud text-accent">wall of shame</p>
        <p className="mt-1 text-xs text-muted">who the wheel bled the most</p>
        <div className="mt-3 space-y-1.5">
          {leaders.length === 0 ? (
            <p className="text-sm text-muted">nobody&apos;s brave enough yet.</p>
          ) : (
            leaders.map((l, i) => (
              <div key={l.userId} className="flex items-center gap-2 text-sm">
                <span className="w-5 shrink-0 font-display text-muted">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-accent-soft">
                  @{l.username}
                </span>
                <span className="hud shrink-0 text-[9px]">{l.spins} spins</span>
                <span className="w-16 shrink-0 text-right font-display text-blood">
                  ${l.owed}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* live ticker */}
      <div className="card p-5">
        <p className="hud text-accent">just landed</p>
        <p className="mt-1 text-xs text-muted">everyone sees what you rolled</p>
        <div className="mt-3 space-y-1">
          {ticker.length === 0 ? (
            <p className="text-sm text-muted">silence. spin something.</p>
          ) : (
            ticker.map((t, i) => (
              <p key={i} className="truncate font-typewriter text-xs">
                <span className="text-accent-soft">@{t.username}</span>{" "}
                <span className="text-muted">{t.result}</span>{" "}
                <span className="hud text-[9px]">{ago(t.ts)}</span>
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
