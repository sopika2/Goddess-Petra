"use client";

import { useCallback, useEffect, useState } from "react";

// One-tap web-push opt-in, used by both sides: the visitor's /chat page
// ("she answered" pings) and the admin inbox ("new DM" pings — enable it on
// the phone after opening the secret login link). Registers our own service
// worker on the /gp-push/ scope so the ExoClick root worker is untouched.
const SW_URL = "/push-worker.js";
const SW_SCOPE = "/gp-push/";

function toKeyBytes(base64url: string): Uint8Array {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "off" | "on" | "denied" | "busy";

export default function PushToggle({ label }: { label?: string }) {
  const [state, setState] = useState<State>("busy");

  useEffect(() => {
    (async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
        const sub = await reg?.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const keyRes = await fetch("/api/push/key", { cache: "no-store" });
      const { key } = await keyRes.json();
      if (!key) throw new Error("no key");
      const reg = await navigator.serviceWorker.register(SW_URL, {
        scope: SW_SCOPE,
      });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toKeyBytes(key) as BufferSource,
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("on");
    } catch {
      setState("off");
    }
  }, []);

  const disable = useCallback(async () => {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("off");
    }
  }, []);

  if (state === "unsupported") return null;
  if (state === "denied") {
    return (
      <span className="hud text-[9px] text-muted" title="Notifications are blocked in your browser settings.">
        🔕 blocked
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={state === "on" ? disable : enable}
      className={`rounded-full border px-3 py-1 font-typewriter text-[10px] uppercase tracking-wide transition ${
        state === "on"
          ? "border-accent text-accent"
          : "border-line text-muted hover:border-accent hover:text-accent"
      }`}
    >
      {state === "busy"
        ? "…"
        : state === "on"
          ? "🔔 notifications on"
          : `🔔 ${label || "notify me"}`}
    </button>
  );
}
