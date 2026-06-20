"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  id: string;
  sender: "user" | "goddess";
  body: string;
  createdAt: string;
}

// The signed-in visitor's DM thread with the goddess. Polls for replies.
export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "failed");
        return;
      }
      setText("");
      if (data.message) setMessages((m) => [...m, data.message]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex h-[60vh] min-h-[420px] flex-col p-0">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!loaded ? (
          <p className="hud text-muted">opening your file…</p>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-center font-hand text-xl text-accent-soft">
            no messages yet. beg ♡
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                  m.sender === "user"
                    ? "bg-surface-2 text-white"
                    : "bg-accent text-ink"
                }`}
              >
                {m.sender === "goddess" ? (
                  <span className="hud block text-[9px] text-ink/70">
                    goddess petra
                  </span>
                ) : null}
                {m.body}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-line/60 p-3"
      >
        <input
          className="input flex-1"
          placeholder="say something, loser…"
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
      {error ? (
        <p className="px-3 pb-2 font-typewriter text-xs text-blood">{error}</p>
      ) : null}
    </div>
  );
}
