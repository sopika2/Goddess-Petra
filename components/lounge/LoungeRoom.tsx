"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface RoomMsg {
  id: string;
  userId: string;
  username: string;
  name: string;
  image: string;
  sender: "user" | "goddess";
  body: string;
  createdAt: string;
}

function Avatar({ src, name }: { src: string; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-[10px] text-muted">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

// The public live room. Everyone sees it; `canPost` gates the composer.
export default function LoungeRoom({ canPost }: { canPost: boolean }) {
  const [messages, setMessages] = useState<RoomMsg[]>([]);
  const [pinned, setPinned] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/lounge", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setMessages(Array.isArray(d.messages) ? d.messages : []);
      setPinned(d.pinned || "");
      setIsAdmin(!!d.isAdmin);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  // Live-ish: poll every 4s, but pause while the tab is hidden.
  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 4000);
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  // Auto-scroll only if the viewer is already at the bottom (don't yank them up
  // while they scroll back through history).
  useEffect(() => {
    if (atBottom.current) endRef.current?.scrollIntoView();
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lounge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "failed");
        return;
      }
      setText("");
      atBottom.current = true;
      if (d.message) setMessages((m) => [...m, d.message]);
    } finally {
      setBusy(false);
    }
  }

  async function hide(id: string) {
    setMessages((m) => m.filter((x) => x.id !== id));
    try {
      await fetch("/api/lounge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* ignore — it's already gone from view */
    }
  }

  return (
    <div className="card flex h-[68vh] min-h-[440px] flex-col p-0">
      {pinned ? (
        <div className="border-b border-line/60 bg-surface-2/60 px-4 py-2">
          <p className="hud text-[9px] text-accent">📌 pinned</p>
          <p className="font-hand text-lg text-accent-soft">{pinned}</p>
        </div>
      ) : null}

      <div
        className="flex-1 space-y-2.5 overflow-y-auto p-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {!loaded ? (
          <p className="hud text-muted">tuning in…</p>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-center font-hand text-xl text-accent-soft">
            dead silent in here. say something ♡
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="group flex items-start gap-2.5">
              <Avatar src={m.image} name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 leading-none">
                  <span
                    className={`truncate text-xs ${
                      m.sender === "goddess"
                        ? "font-display uppercase text-accent"
                        : "text-accent-soft"
                    }`}
                  >
                    {m.sender === "goddess"
                      ? m.name || "goddess petra"
                      : `@${m.username}`}
                  </span>
                  {m.sender === "goddess" ? (
                    <span className="hud text-[8px] text-blood">host</span>
                  ) : null}
                  {isAdmin ? (
                    <button
                      onClick={() => hide(m.id)}
                      title="Delete this line"
                      className="ml-auto hidden font-typewriter text-[10px] text-muted transition hover:text-blood group-hover:block"
                    >
                      ✕
                    </button>
                  ) : null}
                </p>
                <p
                  className={`mt-1 whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm ${
                    m.sender === "goddess"
                      ? "bg-accent/90 text-ink"
                      : "bg-surface-2 text-white"
                  }`}
                >
                  {m.body}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {canPost ? (
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-line/60 p-3"
        >
          <input
            className="input flex-1"
            placeholder="say it to the whole room…"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-primary px-5 py-2 text-xs"
          >
            {busy ? "…" : "Send"}
          </button>
        </form>
      ) : (
        <div className="border-t border-line/60 p-4 text-center">
          <p className="text-sm text-muted">sign in with X to join in.</p>
          <a
            href="/api/auth/twitter/login"
            className="btn-primary mt-3 inline-flex px-5 py-2 text-xs"
          >
            Sign in with X
          </a>
        </div>
      )}
      {error ? (
        <p className="px-3 pb-2 font-typewriter text-xs text-blood">{error}</p>
      ) : null}
    </div>
  );
}
