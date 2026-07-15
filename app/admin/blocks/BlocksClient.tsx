"use client";

import { useCallback, useEffect, useState } from "react";

interface Block {
  id: string;
  kind: "ip" | "x";
  value: string;
  username: string;
  reason: string;
  createdAt: string;
}

function fmt(ts: string) {
  return ts ? ts.replace("T", " ").slice(0, 16) : "";
}

export default function BlocksClient() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [kind, setKind] = useState<"ip" | "x">("ip");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blocks", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setBlocks(Array.isArray(d.blocks) ? d.blocks : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    setError(null);
    try {
      // For an X block, let the operator type "@handle" or a numeric id; if it's
      // a handle we still store it, but IP/id is what the enforcement matches.
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          value: v.replace(/^@/, ""),
          username: kind === "x" ? v.replace(/^@/, "") : "",
          reason: reason.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Failed.");
        return;
      }
      setValue("");
      setReason("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await fetch("/api/admin/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setBlocks((b) => b.filter((x) => x.id !== id));
    } catch {
      /* ignore */
    }
  }

  const ips = blocks.filter((b) => b.kind === "ip");
  const xs = blocks.filter((b) => b.kind === "x");

  return (
    <div className="mt-6 space-y-8">
      <form onSubmit={add} className="card space-y-3 p-4">
        <h2 className="hud text-accent">add a block</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line p-0.5">
            {(["ip", "x"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1 font-typewriter text-[10px] uppercase transition ${
                  kind === k ? "bg-accent text-ink" : "text-muted hover:text-accent"
                }`}
              >
                {k === "ip" ? "IP" : "X account"}
              </button>
            ))}
          </div>
          <input
            className="input flex-1"
            placeholder={
              kind === "ip"
                ? "1.2.3.4 (exact IP)"
                : "@handle or numeric X id"
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <input
            className="input flex-1"
            placeholder="reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn-primary px-5 py-2 text-xs">
            {busy ? "…" : "Block"}
          </button>
        </div>
        {kind === "x" ? (
          <p className="text-xs text-muted">
            Blocking by <strong>numeric X id</strong> is bulletproof (it survives
            a handle change). Blocking a <code>@handle</code> only matches that
            exact handle. The one-tap block on a conversation always uses the id.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Matches the exact visitor IP. IPs can rotate, so this stops a
            specific connection, not a person forever.
          </p>
        )}
        {error ? (
          <p className="font-typewriter text-xs text-blood">{error}</p>
        ) : null}
      </form>

      <section>
        <h2 className="hud text-accent">blocked X accounts ({xs.length})</h2>
        <div className="card mt-3 divide-y divide-line/60 p-0">
          {xs.length === 0 ? (
            <p className="p-4 text-sm text-muted">None.</p>
          ) : (
            xs.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <span className="text-accent">
                    {b.username ? `@${b.username}` : b.value}
                  </span>
                  <span className="hud ml-2 text-[9px]">id {b.value}</span>
                  {b.reason ? (
                    <span className="block truncate text-xs text-muted">
                      {b.reason}
                    </span>
                  ) : null}
                  <span className="hud block text-[9px]">{fmt(b.createdAt)}</span>
                </span>
                <button
                  onClick={() => remove(b.id)}
                  className="rounded-full border border-line px-3 py-1 font-typewriter text-[10px] uppercase text-muted transition hover:border-accent hover:text-accent"
                >
                  unblock
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="hud text-accent">blocked IPs ({ips.length})</h2>
        <div className="card mt-3 divide-y divide-line/60 p-0">
          {ips.length === 0 ? (
            <p className="p-4 text-sm text-muted">None.</p>
          ) : (
            ips.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-white">{b.value}</span>
                  {b.reason ? (
                    <span className="block truncate text-xs text-muted">
                      {b.reason}
                    </span>
                  ) : null}
                  <span className="hud block text-[9px]">{fmt(b.createdAt)}</span>
                </span>
                <button
                  onClick={() => remove(b.id)}
                  className="rounded-full border border-line px-3 py-1 font-typewriter text-[10px] uppercase text-muted transition hover:border-accent hover:text-accent"
                >
                  unblock
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
