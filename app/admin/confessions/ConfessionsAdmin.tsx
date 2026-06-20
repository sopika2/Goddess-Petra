"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Confession } from "@/lib/confessions";

function fmt(ts: string) {
  return ts ? ts.replace("T", " ").slice(0, 16) : "";
}

const STATUS_CLS: Record<string, string> = {
  pending: "border-accent-soft text-accent-soft",
  approved: "border-accent text-accent",
  rejected: "border-blood text-blood",
};

function Card({ c }: { c: Confession }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const [status, setStatus] = useState(c.status);

  async function act(action: "approve" | "reject" | "delete") {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/confessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, action }),
      });
      if (res.ok) {
        if (action === "delete") setGone(true);
        else setStatus(action === "approve" ? "approved" : "rejected");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (gone) return null;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {c.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-xs text-muted">
              {(c.name || c.username || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-accent">@{c.username}</p>
            <p className="hud truncate text-[9px]">
              {c.name} · {c.ip}
            </p>
          </div>
        </div>
        <span className={`stamp ${STATUS_CLS[status] || ""}`}>{status}</span>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words text-white/90">
        {c.body}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="hud">{fmt(c.createdAt)}</span>
        <div className="flex items-center gap-2">
          {status !== "approved" ? (
            <button
              onClick={() => act("approve")}
              disabled={busy}
              className="btn-primary px-4 py-1.5 text-xs"
            >
              Approve
            </button>
          ) : null}
          {status !== "rejected" ? (
            <button
              onClick={() => act("reject")}
              disabled={busy}
              className="btn-ghost px-4 py-1.5 text-xs"
            >
              Reject
            </button>
          ) : null}
          <button
            onClick={() => act("delete")}
            disabled={busy}
            className="px-3 py-1.5 font-typewriter text-xs text-blood hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfessionsAdmin({
  confessions,
}: {
  confessions: Confession[];
}) {
  if (!confessions.length) {
    return <p className="mt-6 text-muted">No confessions yet.</p>;
  }
  return (
    <div className="mt-6 space-y-3">
      {confessions.map((c) => (
        <Card key={c.id} c={c} />
      ))}
    </div>
  );
}
