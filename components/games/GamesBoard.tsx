"use client";

import { useRef, useState } from "react";
import WheelGame from "./WheelGame";
import RouletteGame from "./RouletteGame";
import GameStats, { type GameStatsHandle } from "./GameStats";

/**
 * The games floor: pick a table, play it, and watch the scoreboard update.
 * Owning the tab state here lets a finished spin refresh the stats panel.
 */
export default function GamesBoard({
  segments,
  rouletteEnabled,
  throneUrl,
  throneButton,
}: {
  segments: string[];
  rouletteEnabled: boolean;
  throneUrl: string;
  throneButton: string;
}) {
  const [tab, setTab] = useState<"wheel" | "roulette">("wheel");
  const stats = useRef<GameStatsHandle>(null);
  const refresh = () => stats.current?.refresh();
  // With roulette off there's only one table — don't show a pointless picker.
  const showTabs = rouletteEnabled;
  const active = rouletteEnabled ? tab : "wheel";

  return (
    <div className="flex w-full flex-col items-center gap-8">
      {showTabs ? (
        <div className="flex rounded-full border border-line p-1">
          {(
            [
              ["wheel", "the wheel"],
              ["roulette", "roulette"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-full px-5 py-1.5 font-typewriter text-xs uppercase tracking-wide transition ${
                active === id ? "bg-accent text-ink" : "text-muted hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {active === "wheel" ? (
        <WheelGame
          segments={segments}
          throneUrl={throneUrl}
          throneButton={throneButton}
          onSettled={refresh}
        />
      ) : (
        <RouletteGame
          throneUrl={throneUrl}
          throneButton={throneButton}
          onSettled={refresh}
        />
      )}

      <GameStats ref={stats} throneUrl={throneUrl} throneButton={throneButton} />
    </div>
  );
}
