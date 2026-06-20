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
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

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
        {active ? (
          <span className="stamp border-accent text-accent">
            {account.rigResult}
            {account.rigRemaining > 0 ? ` ×${account.rigRemaining}` : " ∞"}
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input max-w-[10rem] py-1.5 text-xs"
            value={result}
            onChange={(e) => setResult(e.target.value)}
          >
            <option value="">— no rig —</option>
            {segments.map((s) => (
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
            onClick={save}
            disabled={busy}
            className="btn-primary px-4 py-1.5 text-xs"
          >
            {busy ? "…" : "Set"}
          </button>
          {saved ? <span className="hud text-accent">✓</span> : null}
        </div>
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
