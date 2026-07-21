"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isVideoUrl } from "@/lib/format";
import PushToggle from "@/components/PushToggle";
import { uploadMedia } from "@/components/uploadMedia";
import TypingDots from "@/components/TypingDots";

interface Msg {
  id: string;
  sender: "user" | "goddess";
  body: string;
  createdAt: string;
  mediaUrl: string;
  kind: "text" | "tribute";
  link: string;
  readByGoddess: boolean;
}

// The signed-in visitor's DM thread with the goddess. Polls for replies
// (paused while the tab is hidden), supports sending pictures, and renders
// her "tribute demanded" stickers with a pay link.
export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [goddessTyping, setGoddessTyping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const goddessCount = useRef(0);
  const baseTitle = useRef("");
  const lastTypingPing = useRef(0);

  // Tell the server I'm typing — at most once every 2.5s while I keep typing.
  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingPing.current < 2500) return;
    lastTypingPing.current = now;
    fetch("/api/chat/typing", { method: "POST" }).catch(() => {});
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const msgs: Msg[] = Array.isArray(data.messages) ? data.messages : [];
      setMessages(msgs);
      if (data.chat) setBlocked(!!data.chat.blocked);

      // "(n) ♡" tab-title hint while the tab is hidden and she replies.
      const fromHer = msgs.filter((m) => m.sender === "goddess").length;
      if (document.hidden && fromHer > goddessCount.current) {
        document.title = `(${fromHer - goddessCount.current}) ♡ ${baseTitle.current}`;
      }
      goddessCount.current = fromHer;
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    baseTitle.current = document.title;
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    const onVis = () => {
      if (!document.hidden) {
        document.title = baseTitle.current;
        load();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Poll whether the goddess is typing (light, pauses when tab hidden).
  useEffect(() => {
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/chat/typing", { cache: "no-store" });
        if (!res.ok) return;
        const d = await res.json();
        setGoddessTyping(!!d.typing);
      } catch {
        /* ignore */
      }
    };
    const t = setInterval(check, 2500);
    return () => clearInterval(t);
  }, []);

  async function upload(file: File) {
    setUploading(true);
    setUploadPct(0);
    setError(null);
    try {
      // >10 MB is sent in 8 MB batches (components/uploadMedia.ts).
      const r = await uploadMedia(file, "/api/chat/upload", setUploadPct);
      if (r.error) {
        setError(r.error);
        return;
      }
      setMediaUrl(r.url || "");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !mediaUrl) || busy || uploading) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body, mediaUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "failed");
        return;
      }
      setText("");
      setMediaUrl("");
      if (data.message) setMessages((m) => [...m, data.message]);
    } finally {
      setBusy(false);
    }
  }

  const lastSeenId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        return messages[i].readByGoddess ? messages[i].id : null;
      }
    }
    return null;
  })();

  return (
    <div className="card flex h-[60vh] min-h-[420px] flex-col p-0">
      {/* notifications strip */}
      <div className="flex items-center justify-between gap-2 border-b border-line/60 px-4 py-2">
        <p className="hud text-[10px] text-muted">
          get pinged when she answers ▸
        </p>
        <PushToggle label="notify me ♡" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!loaded ? (
          <p className="hud text-muted">opening your file…</p>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-center font-hand text-xl text-accent-soft">
            no messages yet. beg ♡
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id}>
              <div
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.kind === "tribute" ? (
                  /* tribute sticker — her pay-me card */
                  <div className="max-w-[80%] -rotate-1 rounded-lg border-2 border-blood bg-manila px-4 py-3 shadow-stamp">
                    <p className="font-typewriter text-[10px] uppercase tracking-widest text-blood">
                      ♛ tribute demanded
                    </p>
                    {m.body ? (
                      <p className="mt-1 font-hand text-xl text-[#7a1640]">
                        {m.body}
                      </p>
                    ) : null}
                    {m.link ? (
                      <a
                        href={m.link}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-throne mt-3 py-2 text-xs"
                      >
                        pay up ▸
                      </a>
                    ) : null}
                  </div>
                ) : (
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
                    {m.mediaUrl ? (
                      isVideoUrl(m.mediaUrl) ? (
                        <video
                          src={m.mediaUrl}
                          controls
                          preload="metadata"
                          className="mt-1 max-h-64 rounded-lg"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.mediaUrl}
                          alt=""
                          className="mt-1 max-h-64 rounded-lg object-contain"
                        />
                      )
                    ) : null}
                  </div>
                )}
              </div>
              {m.id === lastSeenId ? (
                <p className="hud mt-0.5 text-right text-[9px] text-muted">
                  seen ♡
                </p>
              ) : null}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="h-4 px-4">
        {goddessTyping ? <TypingDots label="goddess is typing…" /> : null}
      </div>

      {blocked ? (
        <div className="border-t border-line/60 p-4 text-center">
          <p className="font-hand text-xl text-blood">
            you&apos;re muted. cry about it ♡
          </p>
        </div>
      ) : (
        <form onSubmit={send} className="border-t border-line/60 p-3">
          {mediaUrl ? (
            <div className="mb-2 flex items-center gap-2">
              {isVideoUrl(mediaUrl) ? (
                <video src={mediaUrl} className="h-14 rounded" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="h-14 rounded object-cover" />
              )}
              <button
                type="button"
                onClick={() => setMediaUrl("")}
                className="font-typewriter text-xs text-blood"
              >
                remove ✕
              </button>
            </div>
          ) : null}
          {uploading ? (
            <div className="mb-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
              <p className="hud mt-1 text-[9px]">uploading… {uploadPct}%</p>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Send a picture or video"
              className="rounded-full border border-line px-3 py-2 font-typewriter text-xs text-muted transition hover:border-accent hover:text-accent"
            >
              {uploading ? "…" : "📎"}
            </button>
            <input
              className="input flex-1"
              placeholder="say something, loser…"
              value={text}
              maxLength={2000}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) pingTyping();
              }}
            />
            <button
              type="submit"
              disabled={busy || uploading}
              className="btn-primary px-5 py-2 text-xs"
            >
              {busy ? "…" : "Send"}
            </button>
          </div>
          {error ? (
            <p className="mt-1 font-typewriter text-xs text-blood">{error}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
