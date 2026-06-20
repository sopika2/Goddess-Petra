import { notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import { listRolls, searchRolls, type GameRoll } from "@/lib/games";
import AdminNav from "../AdminNav";
import AutoRefresh from "../visitors/AutoRefresh";

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

      <form action="/admin/games" method="get" className="mt-6 flex flex-wrap items-center gap-2">
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
