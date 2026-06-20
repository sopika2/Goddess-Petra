import { notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import {
  listVisits,
  searchVisits,
  searchLogins,
  visitsByIp,
  loginsByIp,
  loginsByHandle,
  visitsForHandle,
  stats,
  accountSummaries,
  topCountries,
  topPages,
  deviceSplit,
  browserFamilies,
  visitsByDay,
  type Visit,
  type LoginEvent,
  type AccountSummary,
  type Breakdown,
  type DayCount,
} from "@/lib/analytics";
import AdminNav from "../AdminNav";
import SearchBox from "./SearchBox";
import LogTables from "./LogTables";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

function fmt(ts: string) {
  return ts ? ts.replace("T", " ").slice(0, 16) : "—";
}

// ── dashboard pieces (server-rendered, no client JS) ──────────────────────
function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card p-4">
      <p className="font-display text-3xl leading-none text-accent">
        {n.toLocaleString()}
      </p>
      <p className="hud mt-2 text-muted">{label}</p>
    </div>
  );
}

function Bars({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="card mt-3 p-4">
      <p className="hud text-muted">visits · last {days.length} days</p>
      <div className="mt-3 flex items-end gap-1.5" style={{ height: 84 }}>
        {days.map((d) => (
          <div
            key={d.day}
            className="flex flex-1 flex-col items-center justify-end gap-1"
            title={`${d.day}: ${d.count}`}
          >
            <span className="hud text-[8px] text-accent-soft">
              {d.count || ""}
            </span>
            <div
              className="w-full rounded-t bg-accent/80"
              style={{
                height: `${Math.round((d.count / max) * 60)}px`,
                minHeight: d.count ? 3 : 1,
              }}
            />
            <span className="hud text-[8px]">{d.day.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: Breakdown[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="card p-4">
      <p className="hud text-accent">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted">no data yet</p>
        ) : (
          rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-white/90">{r.label}</span>
                <span className="hud shrink-0">{r.count}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-surface-2">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AccountsTable({ accounts }: { accounts: AccountSummary[] }) {
  return (
    <>
      <h2 className="hud mt-10 text-accent">accounts ({accounts.length})</h2>
      <p className="mt-1 text-xs text-muted">
        one row per X account · click to see everything they did
      </p>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="hud border-b border-line/60">
            <tr>
              <th className="p-3">account</th>
              <th className="p-3">logins</th>
              <th className="p-3">ips</th>
              <th className="p-3">access</th>
              <th className="p-3">first seen</th>
              <th className="p-3">last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-muted">
                  No X logins yet.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.twitterId} className="transition hover:bg-surface-2/60">
                  <td className="p-3">
                    <Link
                      href={`/admin/visitors?handle=${encodeURIComponent(a.username)}`}
                      className="flex items-center gap-2 text-accent hover:text-accent-soft"
                    >
                      {a.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.image}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-xs text-muted">
                          {(a.name || a.username || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate">@{a.username}</span>
                        <span className="hud block truncate text-[9px]">
                          {a.name}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 text-white">{a.logins}</td>
                  <td className="p-3 text-muted">{a.ips}</td>
                  <td className="p-3">
                    <span
                      className={`stamp ${
                        a.admin
                          ? "border-accent text-accent"
                          : "border-blood text-blood"
                      }`}
                    >
                      {a.admin ? "admin" : "loser"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 hud">
                    {fmt(a.firstSeen)}
                  </td>
                  <td className="whitespace-nowrap p-3 hud">
                    {fmt(a.lastSeen)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ip?: string; handle?: string }>;
}) {
  if (!(await isAuthed())) notFound();

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const ip = sp.ip ? decodeURIComponent(sp.ip) : "";
  const handle = sp.handle
    ? decodeURIComponent(sp.handle).replace(/^@/, "")
    : "";
  const investigating = Boolean(ip || handle || q);

  let content: React.ReactNode;

  if (investigating) {
    // ── investigation mode: raw events for a search / IP / handle ──
    let visits: Visit[] = [];
    let logins: LoginEvent[] = [];
    let focus: { label: string; lines: string[] } | null = null;

    if (ip) {
      [visits, logins] = await Promise.all([visitsByIp(ip), loginsByIp(ip)]);
      const handles = [...new Set(logins.map((x) => "@" + x.twitterUsername))];
      const times = [...visits, ...logins].map((x) => x.ts).sort();
      focus = {
        label: `IP ${ip}`,
        lines: [
          `${visits.length} visit(s) · ${logins.length} login(s)`,
          handles.length ? `X accounts: ${handles.join(", ")}` : "no X logins",
          times.length
            ? `first seen ${fmt(times[0])} · last seen ${fmt(times[times.length - 1])}`
            : "",
        ].filter(Boolean),
      };
    } else if (handle) {
      [logins, visits] = await Promise.all([
        loginsByHandle(handle),
        visitsForHandle(handle),
      ]);
      const ips = [...new Set(logins.map((x) => x.ip))];
      const name = logins[0]?.twitterName || "";
      focus = {
        label: `@${handle}`,
        lines: [
          name ? `name: ${name}` : "",
          `${logins.length} login(s) from ${ips.length} IP(s)`,
          ips.length ? `IPs: ${ips.join(", ")}` : "",
        ].filter(Boolean),
      };
    } else {
      [visits, logins] = await Promise.all([searchVisits(q), searchLogins(q)]);
    }

    content = (
      <>
        {focus ? (
          <div className="card mt-6 border-l-[3px] border-l-accent p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-typewriter text-accent">
                everything for {focus.label}
              </p>
              <Link
                href="/admin/visitors"
                className="hud hover:text-accent-soft"
              >
                ✕ clear
              </Link>
            </div>
            <div className="mt-2 space-y-0.5 text-sm text-muted">
              {focus.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ) : null}
        <LogTables visits={visits} logins={logins} />
      </>
    );
  } else {
    // ── dashboard mode: analytics overview ──
    const [s, accounts, countries, pages, devices, browsers, days, recent] =
      await Promise.all([
        stats(),
        accountSummaries(150),
        topCountries(8),
        topPages(8),
        deviceSplit(),
        browserFamilies(6),
        visitsByDay(14),
        listVisits(100),
      ]);

    content = (
      <>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat n={s.totalVisits} label="page visits" />
          <Stat n={s.uniqueIps} label="unique visitors" />
          <Stat n={s.visitsToday} label="visits today" />
          <Stat n={s.totalLogins} label="x logins" />
          <Stat n={s.uniqueLoginUsers} label="accounts" />
        </div>

        <Bars days={days} />

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BreakdownCard title="top countries" rows={countries} />
          <BreakdownCard title="top pages" rows={pages} />
          <BreakdownCard title="devices" rows={devices} />
          <BreakdownCard title="browsers" rows={browsers} />
        </div>

        <AccountsTable accounts={accounts} />

        <h2 className="hud mt-10 text-accent">latest activity</h2>
        <LogTables visits={recent} logins={[]} showLogins={false} />
      </>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminNav active="Visitors" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase">
            Visitors &amp; Logins
          </h1>
          <p className="hud mt-1">
            {investigating
              ? "raw records · tap a row for the full file"
              : "the numbers · search or click an account to dig in"}
          </p>
        </div>
        <AutoRefresh seconds={10} />
      </div>

      <SearchBox initialQ={q} initialIp={ip} />

      {content}
    </main>
  );
}
