"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface RigAccount {
  id: string;
  username: string;
  name: string;
  lastSeen: string;
  logins: number;
  rigResult: string;
  rigRemaining: number; // -1 unlimited, >0 count, 0 none
  excluded: string[]; // segments this account can never land on
  customSegments: string[]; // their own wheel; empty = the default one
}

function fmt(ts: string) {
  return ts ? ts.replace("T", " ").slice(0, 16) : "—";
}

function RigRow({
  account,
  segments,
}: {
  account: RigAccount;
  segments: string[];
}) {
  const router = useRouter();
  const [result, setResult] = useState(account.rigResult || "");
  const [times, setTimes] = useState(
    account.rigRemaining > 0 ? String(account.rigRemaining) : "",
  );
  const [excluded, setExcluded] = useState<string[]>(account.excluded || []);
  const [openBans, setOpenBans] = useState(false);
  const [openWheel, setOpenWheel] = useState(false);
  const [customText, setCustomText] = useState(
    (account.customSegments || []).join("\n"),
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pick from THEIR wheel when they have one, otherwise the default. Deduped:
  // repeating a prize adds slices (more chances), but forcing and banning act
  // on the prize itself, so it should only be listed once here.
  const rowSegments = [
    ...new Set(
      customText.trim()
        ? customText
            .split("\n")
            .map((l) => l.split("|")[0].trim())
            .filter(Boolean)
        : segments,
    ),
  ];

  function toggleBan(label: string) {
    setExcluded((x) =>
      x.includes(label) ? x.filter((s) => s !== label) : [...x, label],
    );
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    const remaining = !result
      ? 0
      : times.trim() === ""
        ? -1
        : Math.max(1, parseInt(times, 10) || 1);
    try {
      const res = await fetch("/api/admin/games/rig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: account.id,
          username: account.username,
          result,
          remaining,
          excluded,
          segments: customText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const active = account.rigResult && account.rigRemaining !== 0;

  return (
    <tr className="align-top">
      <td className="whitespace-nowrap p-3 text-accent">@{account.username}</td>
      <td className="p-3 text-muted">{account.name || "—"}</td>
      <td className="whitespace-nowrap p-3 hud">{fmt(account.lastSeen)}</td>
      <td className="p-3 text-muted">{account.logins}</td>
      <td className="p-3">
        <div className="space-y-1">
          {active ? (
            <span className="stamp border-accent text-accent">
              {account.rigResult}
              {account.rigRemaining > 0 ? ` ×${account.rigRemaining}` : " ∞"}
            </span>
          ) : null}
          {account.excluded.length > 0 ? (
            <span className="stamp block border-blood text-blood">
              {account.excluded.length} banned
            </span>
          ) : null}
          {account.customSegments.length > 0 ? (
            <span className="stamp block border-evidence text-evidence">
              own wheel
            </span>
          ) : null}
          {!active &&
          account.excluded.length === 0 &&
          account.customSegments.length === 0 ? (
            <span className="text-muted">—</span>
          ) : null}
        </div>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input max-w-[10rem] py-1.5 text-xs"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          >
            <option value="">— no rig —</option>
            {rowSegments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            placeholder="∞"
            className="input max-w-[5rem] py-1.5 text-xs"
            value={times}
            onChange={(e) => setTimes(e.target.value)}
            disabled={!result}
            title="how many spins (blank = forever)"
          />
          <button
            type="button"
            onClick={() => setOpenBans((v) => !v)}
            className={`rounded-full border px-3 py-1.5 font-typewriter text-[10px] uppercase transition ${
              excluded.length
                ? "border-blood text-blood"
                : "border-line text-muted hover:text-blood"
            }`}
            title="Segments this account can never land on"
          >
            ban {excluded.length ? `(${excluded.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setOpenWheel((v) => !v)}
            className={`rounded-full border px-3 py-1.5 font-typewriter text-[10px] uppercase transition ${
              customText.trim()
                ? "border-evidence text-evidence"
                : "border-line text-muted hover:text-evidence"
            }`}
            title="Give this account its own wheel"
          >
            wheel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="btn-primary px-4 py-1.5 text-xs"
          >
            {busy ? "…" : "Set"}
          </button>
          {saved ? <span className="hud text-accent">✓</span> : null}
        </div>

        {openBans ? (
          <div className="mt-2 rounded-lg border border-line bg-surface-2/60 p-2">
            <p className="hud mb-1.5 text-[9px] text-blood">
              they can never land on:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {rowSegments.length === 0 ? (
                <span className="text-xs text-muted">no segments configured</span>
              ) : (
                rowSegments.map((sg) => (
                  <button
                    key={sg}
                    type="button"
                    onClick={() => toggleBan(sg)}
                    className={`rounded-full border px-2.5 py-0.5 font-typewriter text-[10px] transition ${
                      excluded.includes(sg)
                        ? "border-blood bg-blood text-white"
                        : "border-line text-muted hover:border-blood hover:text-blood"
                    }`}
                  >
                    {sg}
                  </button>
                ))
              )}
            </div>
            <p className="hud mt-1.5 text-[9px]">
              pick, then hit Set. blocked ones simply never come up.
            </p>
          </div>
        ) : null}

        {openWheel ? (
          <div className="mt-2 rounded-lg border border-line bg-surface-2/60 p-2">
            <p className="hud mb-1.5 text-[9px] text-evidence">
              their own wheel · one per line · blank = the default wheel
            </p>
            <textarea
              className="input min-h-[90px] w-full resize-y font-mono text-[11px]"
              placeholder={"$50 tribute\nhand it over|info|your address\na picture of me|reward|/media/x.jpg"}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
            <p className="hud mt-1.5 text-[9px]">
              same format as Settings. hit Set to apply — only this account sees it.
            </p>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export default function RigManager({
  accounts,
  segments,
}: {
  accounts: RigAccount[];
  segments: string[];
}) {
  return (
    <div className="card mt-3 overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="hud border-b border-line/60">
          <tr>
            <th className="p-3">handle</th>
            <th className="p-3">name</th>
            <th className="p-3">last seen</th>
            <th className="p-3">logins</th>
            <th className="p-3">current rig</th>
            <th className="p-3">force result · times</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-muted">
                No one has signed in with X yet.
              </td>
            </tr>
          ) : (
            accounts.map((a) => (
              <RigRow key={a.id} account={a} segments={segments} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
