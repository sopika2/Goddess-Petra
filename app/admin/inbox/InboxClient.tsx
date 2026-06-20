"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Convo {
  userId: string;
  username: string;
  name: string;
  image: string;
  lastBody: string;
  lastSender: string;
  lastAt: string;
  unread: number;
  total: number;
}
interface Msg {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
}

function fmt(ts: string) {
  return ts ? ts.replace("T", " ").slice(0, 16) : "";
}

function Avatar({ src, name, size }: { src: string; name: string; size: number }) {
  const cls = `rounded-full object-cover shrink-0`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img src={src} alt="" className={cls} style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-muted"
      style={{ width: size, height: size }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default function InboxClient() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [sel, setSel] = useState<Convo | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const selId = sel?.userId || null;

  const loadConvos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inbox", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setConvos(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadThread = useCallback(async (userId: string) => {
    try {
      const res = await fetch(
        `/api/admin/inbox/thread?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setThread(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadConvos();
    const t = setInterval(loadConvos, 6000);
    return () => clearInterval(t);
  }, [loadConvos]);

  useEffect(() => {
    if (!selId) return;
    loadThread(selId);
    const t = setInterval(() => loadThread(selId), 4000);
    return () => clearInterval(t);
  }, [selId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [thread.length]);

  function open(c: Convo) {
    setSel(c);
    setThread([]);
    // optimistic: clear unread badge immediately
    setConvos((cs) =>
      cs.map((x) => (x.userId === c.userId ? { ...x, unread: 0 } : x)),
    );
  }

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !sel || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: sel.userId,
          username: sel.username,
          name: sel.name,
          image: sel.image,
          message: body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setText("");
        setThread((m) => [...m, data.message]);
        loadConvos();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-[320px_1fr]">
      {/* conversation list */}
      <div className="card max-h-[72vh] overflow-y-auto p-0">
        {convos.length === 0 ? (
          <p className="p-4 text-muted">No messages yet.</p>
        ) : (
          convos.map((c) => (
            <button
              key={c.userId}
              onClick={() => open(c)}
              className={`flex w-full items-start gap-3 border-b border-line/40 p-3 text-left transition hover:bg-surface-2 ${
                selId === c.userId ? "bg-surface-2" : ""
              }`}
            >
              <Avatar src={c.image} name={c.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-accent">@{c.username}</span>
                  {c.unread > 0 ? (
                    <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-ink">
                      {c.unread}
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted">
                  {c.lastSender === "goddess" ? "you: " : ""}
                  {c.lastBody}
                </span>
                <span className="hud block text-[9px]">{fmt(c.lastAt)}</span>
              </span>
            </button>
          ))
        )}
      </div>

      {/* thread */}
      <div className="card flex h-[72vh] flex-col p-0">
        {!sel ? (
          <div className="flex flex-1 items-center justify-center text-muted">
            Select a conversation.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-line/60 p-3">
              <Avatar src={sel.image} name={sel.name} size={32} />
              <div className="min-w-0">
                <p className="truncate text-accent">@{sel.username}</p>
                <p className="hud text-[9px]">{sel.name}</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {thread.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === "goddess" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                      m.sender === "goddess"
                        ? "bg-accent text-ink"
                        : "bg-surface-2 text-white"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form
              onSubmit={reply}
              className="flex items-center gap-2 border-t border-line/60 p-3"
            >
              <input
                className="input flex-1"
                placeholder="reply…"
                value={text}
                maxLength={2000}
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
          </>
        )}
      </div>
    </div>
  );
}
