"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Visit, LoginEvent } from "@/lib/analytics";

type Selected =
  | { kind: "visit"; row: Visit }
  | { kind: "login"; row: LoginEvent }
  | null;

function fmt(ts: string) {
  return ts.replace("T", " ").slice(0, 19);
}

export default function LogTables({
  visits,
  logins,
  showLogins = true,
  showVisits = true,
}: {
  visits: Visit[];
  logins: LoginEvent[];
  showLogins?: boolean;
  showVisits?: boolean;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Selected>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  // When the modal is open: lock background scroll, close on Escape, move focus
  // into the dialog, and restore focus to the opener on close.
  useEffect(() => {
    if (!sel) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [sel]);

  const open = (s: Exclude<Selected, null>) => {
    prevFocus.current = document.activeElement as HTMLElement;
    setSel(s);
  };
  const onRowKey = (e: React.KeyboardEvent, s: Exclude<Selected, null>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(s);
    }
  };
  const go = (href: string) => {
    setSel(null);
    router.push(href);
  };

  return (
    <>
      {/* X logins */}
      {showLogins ? (
      <>
      <h2 className="hud mt-8 text-accent">x logins ({logins.length})</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="hud border-b border-line/60">
            <tr>
              <th className="p-3">handle</th>
              <th className="p-3">name</th>
              <th className="p-3">ip</th>
              <th className="p-3">access</th>
              <th className="p-3">when</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {logins.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-muted">
                  No matching X logins.
                </td>
              </tr>
            ) : (
              logins.map((l) => (
                <tr
                  key={l.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Login by @${l.twitterUsername} from ${l.ip} — open details`}
                  onClick={() => open({ kind: "login", row: l })}
                  onKeyDown={(e) => onRowKey(e, { kind: "login", row: l })}
                  className="cursor-pointer transition hover:bg-surface-2/60 focus:bg-surface-2/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <td className="whitespace-nowrap p-3 text-accent">
                    <span className="flex items-center gap-2">
                      {l.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.image}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : null}
                      @{l.twitterUsername}
                    </span>
                  </td>
                  <td className="p-3 text-muted">{l.twitterName}</td>
                  <td className="whitespace-nowrap p-3 font-typewriter text-accent-soft">
                    {l.ip}
                  </td>
                  <td className="p-3">
                    <span
                      className={`stamp ${
                        l.allowed
                          ? "border-accent text-accent"
                          : "border-blood text-blood"
                      }`}
                    >
                      {l.allowed ? "admin" : "loser"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 hud">{fmt(l.ts)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      </>
      ) : null}

      {/* Page visits */}
      {showVisits ? (
      <>
      <h2 className="hud mt-8 text-accent">recent visits ({visits.length})</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="hud border-b border-line/60">
            <tr>
              <th className="p-3">ip</th>
              <th className="p-3">location</th>
              <th className="p-3">page</th>
              <th className="p-3">device</th>
              <th className="p-3">when</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {visits.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-muted">
                  No matching visits.
                </td>
              </tr>
            ) : (
              visits.map((v) => (
                <tr
                  key={v.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Visit from ${v.ip} to ${v.path} — open details`}
                  onClick={() => open({ kind: "visit", row: v })}
                  onKeyDown={(e) => onRowKey(e, { kind: "visit", row: v })}
                  className="cursor-pointer transition hover:bg-surface-2/60 focus:bg-surface-2/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                >
                  <td className="whitespace-nowrap p-3 font-typewriter text-accent-soft">
                    {v.ip}
                  </td>
                  <td className="whitespace-nowrap p-3 text-muted">
                    {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="p-3 text-white">{v.path}</td>
                  <td className="p-3 text-muted">
                    <span className="text-white/90">{v.browser || "—"}</span>
                    <span className="hud block text-[9px]">
                      {[v.os, v.device].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 hud">{fmt(v.ts)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Tap (or focus + Enter on) any row to see everything that came with it.
      </p>
      </>
      ) : null}

      {/* Detail popup */}
      {sel ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-modal-title"
          onClick={() => setSel(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-lg p-6 shadow-glow"
          >
            <div className="flex items-center justify-between">
              <h3 id="log-modal-title" className="font-display text-xl uppercase">
                {sel.kind === "login" ? "X login" : "Visit"}
              </h3>
              <button
                ref={closeRef}
                onClick={() => setSel(null)}
                aria-label="Close"
                className="text-2xl text-muted hover:text-accent"
              >
                ×
              </button>
            </div>

            {sel.kind === "login" && sel.row.image ? (
              <div className="mt-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sel.row.image}
                  alt=""
                  className="h-14 w-14 rounded-full border border-line object-cover"
                />
                <div className="font-typewriter text-sm text-accent-soft">
                  {sel.row.twitterName}
                </div>
              </div>
            ) : null}

            <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
              {(sel.kind === "login"
                ? loginRows(sel.row)
                : visitRows(sel.row)
              ).map(([k, val]) => (
                <DRow key={k} label={k} value={val} />
              ))}
            </dl>

            <div className="mt-6 flex flex-wrap gap-2">
              {sel.row.ip ? (
                <button
                  onClick={() =>
                    go(`/admin/visitors?ip=${encodeURIComponent(sel.row.ip)}`)
                  }
                  className="btn-ghost px-4 py-2 text-xs"
                >
                  Everything from this IP
                </button>
              ) : null}
              {sel.kind === "login" && sel.row.twitterUsername ? (
                <button
                  onClick={() =>
                    go(
                      `/admin/visitors?handle=${encodeURIComponent(sel.row.twitterUsername)}`,
                    )
                  }
                  className="btn-ghost px-4 py-2 text-xs"
                >
                  Everything from @{sel.row.twitterUsername}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function visitRows(v: Visit): [string, string][] {
  return [
    ["IP", v.ip],
    ["Country", v.country || "—"],
    ["City", v.city || "—"],
    ["Region", v.region || "—"],
    ["Page", v.path],
    ["When", fmt(v.ts)],
    ["Fingerprint", v.fp || "—"],
    ["Browser", v.browser || "—"],
    ["OS", v.os || "—"],
    ["Device detail", v.uaFull || "—"],
    ["Device", v.device || "—"],
    ["GPU", v.gpu || "—"],
    ["Language", v.lang || "—"],
    ["Languages", v.langs || "—"],
    ["Timezone", v.tz || "—"],
    ["Screen", v.screen || "—"],
    ["Viewport", v.viewport || "—"],
    ["Color depth", v.colorDepth ? `${v.colorDepth}-bit` : "—"],
    ["Orientation", v.orientation || "—"],
    ["Pixel ratio", v.dpr || "—"],
    ["CPU cores", v.cores || "—"],
    ["RAM (GB)", v.memory || "—"],
    ["Storage", v.storage || "—"],
    ["Connection", v.connection || "—"],
    ["Network", v.netInfo || "—"],
    ["Touch", v.touch || "—"],
    ["Touch points", v.maxTouch || "—"],
    ["Do Not Track", v.dnt || "—"],
    ["Cookies", v.cookies || "—"],
    ["Platform", v.platform || "—"],
    ["Referer", v.referer || "—"],
    ["User-Agent", v.ua || "—"],
  ];
}

const num = (n?: number) =>
  typeof n === "number" && n > 0 ? n.toLocaleString() : "—";

function loginRows(l: LoginEvent): [string, string][] {
  return [
    ["When", fmt(l.ts)],
    ["Handle", "@" + l.twitterUsername],
    ["Name", l.twitterName || "—"],
    ["X ID", l.twitterId || "—"],
    ["Verified", l.verified ? "yes" : "no"],
    ["Bio", l.bio || "—"],
    ["Location", l.location || "—"],
    ["Website", l.url || "—"],
    ["Followers", num(l.followers)],
    ["Following", num(l.following)],
    ["Tweets", num(l.tweets)],
    ["Acct created", l.accountCreated ? fmt(l.accountCreated) : "—"],
    ["IP", l.ip],
    ["Access", l.allowed ? "admin (authorized)" : "loser (rejected)"],
    ["User-Agent", l.ua || "—"],
  ];
}

function DRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="hud pt-0.5">{label}</dt>
      <dd className="break-words text-white/90">{value}</dd>
    </>
  );
}
