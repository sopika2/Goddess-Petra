import { notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import {
  listVisits,
  listLogins,
  searchVisits,
  searchLogins,
  visitsByIp,
  loginsByIp,
  loginsByHandle,
  visitsForHandle,
  type Visit,
  type LoginEvent,
} from "@/lib/analytics";
import AdminNav from "../AdminNav";
import SearchBox from "./SearchBox";
import LogTables from "./LogTables";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

function fmt(ts: string) {
  return ts.replace("T", " ").slice(0, 19);
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
  } else if (q) {
    [visits, logins] = await Promise.all([searchVisits(q), searchLogins(q)]);
  } else {
    [visits, logins] = await Promise.all([listVisits(300), listLogins(300)]);
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
            search anything · tap a row for the full record
          </p>
        </div>
        <AutoRefresh seconds={10} />
      </div>

      <SearchBox initialQ={q} initialIp={ip} />

      {focus ? (
        <div className="card mt-6 border-l-[3px] border-l-accent p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-typewriter text-accent">
              everything for {focus.label}
            </p>
            <Link href="/admin/visitors" className="hud hover:text-accent-soft">
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
    </main>
  );
}
