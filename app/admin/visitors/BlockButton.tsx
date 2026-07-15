"use client";

import { useState } from "react";

// One-tap site-wide ban from the Visitors investigation view — for the IP or
// the @handle currently being inspected.
export default function BlockButton({
  kind,
  value,
  username,
  label,
}: {
  kind: "ip" | "x";
  value: string;
  username?: string;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function block() {
    if (state !== "idle") return;
    setState("busy");
    try {
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          value,
          username: username || "",
          reason: "blocked from visitors",
        }),
      });
      setState(res.ok ? "done" : "idle");
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={block}
      disabled={state !== "idle"}
      className="rounded-full border border-blood px-3 py-1 font-typewriter text-[10px] uppercase text-blood transition hover:bg-blood hover:text-white disabled:opacity-60"
    >
      {state === "done" ? "banned ✓" : state === "busy" ? "…" : label}
    </button>
  );
}
