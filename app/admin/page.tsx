import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { stats, listVisits, listLogins } from "@/lib/analytics";
import { listProfiles } from "@/lib/db";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

function fmt(ts: string) {
  return ts.replace("T", " ").slice(0, 16);
}

export default async function AdminOverview() {
  if (!(await isAuthed())) notFound();

  const s = await stats();
  const profiles = await listProfiles();
  const visits = await listVisits(8);
  const logins = await listLogins(8);

  const cards: [string, number][] = [
    ["Visits", s.totalVisits],
    ["Unique IPs", s.uniqueIps],
    ["Today", s.visitsToday],
    ["X logins", s.totalLogins],
    ["Exposed", profiles.length],
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AdminNav active="Overview" />
      <h1 className="font-display text-3xl uppercase">Control Room</h1>
      <p className="hud mt-1">subject activity // live</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, val]) => (
          <div key={label} className="card p-4">
            <p className="font-display text-3xl text-accent">{val}</p>
            <p className="hud mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="hud text-accent">recent visitors</h2>
          <div className="card mt-3 divide-y divide-line/60">
            {visits.length === 0 ? (
              <p className="p-4 text-sm text-muted">No visits logged yet.</p>
            ) : (
              visits.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <span className="font-typewriter text-accent-soft">{v.ip}</span>
                  <span className="flex-1 truncate text-muted">{v.path}</span>
                  <span className="hud shrink-0">{fmt(v.ts)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="hud text-accent">recent X logins</h2>
          <div className="card mt-3 divide-y divide-line/60">
            {logins.length === 0 ? (
              <p className="p-4 text-sm text-muted">No X logins yet.</p>
            ) : (
              logins.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <span className="truncate font-medium text-white">
                    @{l.twitterUsername}
                  </span>
                  <span className="font-typewriter text-accent-soft">{l.ip}</span>
                  <span
                    className={`stamp shrink-0 ${
                      l.allowed ? "border-accent text-accent" : "border-blood text-blood"
                    }`}
                  >
                    {l.allowed ? "admin" : "loser"}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <p className="mt-10 text-xs leading-relaxed text-muted">
        Note: real public IPs require running behind a reverse proxy or the
        bundled <code className="text-accent-soft">server.mjs</code>; on a bare
        laptop they show as localhost. This is first-party data (your server logs
        + accounts that authorized via X). Keep a privacy notice and use it
        lawfully and consensually.
      </p>
    </main>
  );
}
