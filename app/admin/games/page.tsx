import { notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import {
  listRolls,
  searchRolls,
  listAccounts,
  listRigs,
  type GameRoll,
} from "@/lib/games";
import { getSettings } from "@/lib/settings";
import AdminNav from "../AdminNav";
import AutoRefresh from "../visitors/AutoRefresh";
import RigManager, { type RigAccount } from "./RigManager";
import RewardUploader from "./RewardUploader";

export const dynamic = "force-dynamic";

function fmt(ts: string) {
  return ts.replace("T", " ").slice(0, 19);
}

export default async function GamesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await isAuthed())) notFound();

  const q = ((await searchParams).q || "").trim();
  let rolls: GameRoll[] = [];
  try {
    rolls = q ? await searchRolls(q) : await listRolls(300);
  } catch {
    rolls = [];
  }

  // Roster of every account that has signed in, with its current rig.
  let accounts: RigAccount[] = [];
  let segments: string[] = [];
  try {
    const [accts, rigs, s] = await Promise.all([
      listAccounts(),
      listRigs(),
      getSettings(),
    ]);
    const rigMap = new Map(rigs.map((r) => [r.userId, r]));
    // Players only ever see the label, so the admin picker uses labels too.
    // Deduped — a repeated prize means extra slices, not a second entry here.
    segments = [
      ...new Set(
        s.wheelSegments.map((x) => String(x).split("|")[0].trim()).filter(Boolean),
      ),
    ];
    accounts = accts.map((a) => ({
      ...a,
      rigResult: rigMap.get(a.id)?.result || "",
      rigRemaining: rigMap.get(a.id)?.remaining ?? 0,
      excluded: rigMap.get(a.id)?.excluded || [],
      customSegments: rigMap.get(a.id)?.segments || [],
    }));
  } catch {
    accounts = [];
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminNav active="Games" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase">Game rolls</h1>
          <p className="hud mt-1">who spun what · rigged spins are flagged</p>
        </div>
        <AutoRefresh seconds={10} />
      </div>

      <h2 className="hud mt-8 text-accent">rig the wheel · all accounts</h2>
      <p className="mt-1 text-xs text-muted">
        <strong className="text-white">Force</strong> a result for any account
        (for N spins, blank = forever), and/or <strong className="text-white">ban</strong>{" "}
        segments they can never land on — they just never come up, and the
        player is never told either way. A per-account force beats the global
        one in Settings.
      </p>
      <RigManager accounts={accounts} segments={segments} />

      <h2 className="hud mt-10 text-accent">reward media</h2>
      <p className="mt-1 text-xs text-muted">
        Upload a picture or video, then paste its link into a{" "}
        <code>reward</code> segment in Settings so the wheel can hand it out.
      </p>
      <RewardUploader />

      <form action="/admin/games" method="get" className="mt-10 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          className="input max-w-xs"
          placeholder="search @handle, result, game, ip…"
        />
        <button type="submit" className="btn-primary px-5 py-2 text-xs">
          Search
        </button>
        {q ? (
          <Link href="/admin/games" className="btn-ghost px-5 py-2 text-xs">
            Clear
          </Link>
        ) : null}
      </form>

      <h2 className="hud mt-8 text-accent">rolls ({rolls.length})</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="hud border-b border-line/60">
            <tr>
              <th className="p-3">when</th>
              <th className="p-3">handle</th>
              <th className="p-3">game</th>
              <th className="p-3">result</th>
              <th className="p-3">rigged</th>
              <th className="p-3">ip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {rolls.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-muted">
                  No rolls yet.
                </td>
              </tr>
            ) : (
              rolls.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap p-3 hud">{fmt(r.ts)}</td>
                  <td className="whitespace-nowrap p-3 text-accent">
                    @{r.username}
                  </td>
                  <td className="whitespace-nowrap p-3 text-muted">{r.game}</td>
                  <td className="p-3 text-white">{r.result}</td>
                  <td className="p-3">
                    {r.rigged ? (
                      <span className="stamp border-accent text-accent">rigged</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 font-typewriter text-accent-soft">
                    {r.ip}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
