"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isVideoUrl } from "@/lib/format";
import { uploadMedia } from "@/components/uploadMedia";
import TypingDots from "@/components/TypingDots";

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
  pinned: boolean;
  blocked: boolean;
}
interface Msg {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
  mediaUrl: string;
  kind: string;
  link: string;
  readUser: boolean;
}
interface Dossier {
  login: {
    username: string;
    name: string;
    bio: string;
    location: string;
    verified: boolean;
    accountCreated: string;
    followers: number;
    following: number;
    tweets: number;
    lastIp: string;
    lastSeen: string;
  } | null;
  loginCount: number;
  distinctIps: number;
  firstSeen: string;
  spins: number;
  lastSpinResult: string;
  confessions: number;
  flags: { pinned: boolean; blocked: boolean; note: string };
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

function MediaBubble({ url }: { url: string }) {
  if (isVideoUrl(url)) {
    return (
      <video src={url} controls preload="metadata" className="mt-1 max-h-64 rounded-lg" />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="mt-1 max-h-64 rounded-lg object-contain" />;
}

export default function InboxClient() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [tributePresets, setTributePresets] = useState<
    { label: string; url: string }[]
  >([]);
  const [sel, setSel] = useState<Convo | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [tab, setTab] = useState<"chat" | "media">("chat");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // attachment + tribute composer state
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [tribute, setTribute] = useState(false);
  const [tributeLink, setTributeLink] = useState("");
  const [presetLabel, setPresetLabel] = useState("");
  // dossier side panel
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [blockedNote, setBlockedNote] = useState<string | null>(null);
  const [userTyping, setUserTyping] = useState(false);
  // "pull this DM into a board post" panel
  const [repostMsg, setRepostMsg] = useState<Msg | null>(null);
  const [repostCaption, setRepostCaption] = useState("");
  const [repostCredit, setRepostCredit] = useState(true);
  const [repostBusy, setRepostBusy] = useState(false);
  const [repostDone, setRepostDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastTypingPing = useRef(0);
  const selId = sel?.userId || null;

  // Tell the sub I'm typing — throttled to once every 2.5s.
  function pingTyping() {
    if (!selId) return;
    const now = Date.now();
    if (now - lastTypingPing.current < 2500) return;
    lastTypingPing.current = now;
    fetch(`/api/admin/inbox/typing?userId=${encodeURIComponent(selId)}`, {
      method: "POST",
    }).catch(() => {});
  }

  const loadConvos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inbox", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setConvos(Array.isArray(data.conversations) ? data.conversations : []);
      if (Array.isArray(data.quickReplies)) setQuickReplies(data.quickReplies);
      if (Array.isArray(data.tributePresets)) setTributePresets(data.tributePresets);
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

  const loadDossier = useCallback(async (userId: string) => {
    try {
      const res = await fetch(
        `/api/admin/inbox/dossier?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const d = (await res.json()) as Dossier;
      setDossier(d);
      setNoteDraft(d.flags?.note || "");
    } catch {
      /* ignore */
    }
  }, []);

  // Adaptive polling: skip while the tab is hidden, refresh the moment it
  // becomes visible again.
  useEffect(() => {
    loadConvos();
    const t = setInterval(() => {
      if (!document.hidden) loadConvos();
    }, 6000);
    const onVis = () => {
      if (!document.hidden) loadConvos();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadConvos]);

  useEffect(() => {
    if (!selId) return;
    loadThread(selId);
    loadDossier(selId);
    const t = setInterval(() => {
      if (!document.hidden) loadThread(selId);
    }, 4000);
    const onVis = () => {
      if (!document.hidden) loadThread(selId);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [selId, loadThread, loadDossier]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [thread.length]);

  // Poll whether the selected sub is typing (light; only while a thread is open).
  useEffect(() => {
    if (!selId) return;
    setUserTyping(false);
    const check = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(
          `/api/admin/inbox/typing?userId=${encodeURIComponent(selId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const d = await res.json();
        setUserTyping(!!d.typing);
      } catch {
        /* ignore */
      }
    };
    const t = setInterval(check, 2500);
    return () => clearInterval(t);
  }, [selId]);

  function open(c: Convo) {
    setSel(c);
    setThread([]);
    setTab("chat");
    setDossier(null);
    setDossierOpen(false);
    setError(null);
    setTribute(false);
    setTributeLink("");
    setPresetLabel("");
    setBlockedNote(null);
    // optimistic: clear unread badge immediately
    setConvos((cs) =>
      cs.map((x) => (x.userId === c.userId ? { ...x, unread: 0 } : x)),
    );
  }

  async function upload(file: File) {
    setUploading(true);
    setUploadPct(0);
    setError(null);
    try {
      // >10 MB goes up in 8 MB batches (see components/uploadMedia.ts).
      const r = await uploadMedia(file, "/api/admin/upload", setUploadPct);
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

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    let body = text.trim();
    if ((!body && !mediaUrl && !tribute) || !sel || busy || uploading) return;
    // Preset chosen but nothing typed → the amount becomes the demand.
    if (tribute && !body && presetLabel) body = `${presetLabel} ♡`;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: sel.userId,
          message: body,
          mediaUrl,
          kind: tribute ? "tribute" : "text",
          link: tribute ? tributeLink.trim() : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reply failed.");
        return;
      }
      if (data.message) {
        setText("");
        setMediaUrl("");
        setTribute(false);
        setTributeLink("");
        setPresetLabel("");
        setThread((m) => [...m, data.message]);
        loadConvos();
      }
    } finally {
      setBusy(false);
    }
  }

  function openRepost(m: Msg) {
    setRepostMsg(m);
    setRepostCaption(m.body || "");
    setRepostCredit(m.sender === "user");
    setRepostDone(null);
  }

  // Pull a DM straight onto the home Board — reuses the normal create-post
  // endpoint with the message's media (a /media/... path it already validates).
  async function submitRepost() {
    if (!repostMsg || repostBusy || !sel) return;
    const cap = repostCaption.trim();
    const body = repostCredit
      ? cap
        ? `@${sel.username}: ${cap}`
        : `@${sel.username} sent me this ♡`
      : cap;
    if (!body && !repostMsg.mediaUrl) return;
    setRepostBusy(true);
    setRepostDone(null);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, mediaUrl: repostMsg.mediaUrl }),
      });
      if (res.ok) {
        setRepostDone("posted to The Board ✓");
      } else {
        const d = await res.json().catch(() => ({}));
        setRepostDone(d.error || "failed");
      }
    } finally {
      setRepostBusy(false);
    }
  }

  async function blockSitewide(kind: "ip" | "x", value: string, username = "") {
    if (!value) return;
    try {
      await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, value, username, reason: "blocked from inbox" }),
      });
      setBlockedNote(kind === "x" ? "account banned site-wide ✓" : "IP banned ✓");
    } catch {
      setBlockedNote("block failed");
    }
  }

  async function saveFlags(patch: { pinned?: boolean; blocked?: boolean; note?: string }) {
    if (!sel) return;
    try {
      const res = await fetch("/api/admin/inbox/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: sel.userId, ...patch }),
      });
      if (!res.ok) return;
      const d = await res.json();
      setDossier((x) => (x ? { ...x, flags: d.flags } : x));
      loadConvos();
    } catch {
      /* ignore */
    }
  }

  const flags = dossier?.flags;
  const threadMedia = thread.filter((m) => m.mediaUrl);
  const lastGoddessSeenId = (() => {
    for (let i = thread.length - 1; i >= 0; i--) {
      if (thread[i].sender === "goddess") {
        return thread[i].readUser ? thread[i].id : null;
      }
    }
    return null;
  })();

  return (
    <div
      className={`mt-6 grid gap-4 ${
        dossierOpen
          ? "md:grid-cols-[280px_1fr_300px]"
          : "md:grid-cols-[320px_1fr]"
      }`}
    >
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
                  <span className="truncate text-accent">
                    {c.pinned ? "📌 " : ""}@{c.username}
                    {c.blocked ? (
                      <span className="ml-1 font-typewriter text-[9px] uppercase text-blood">
                        muted
                      </span>
                    ) : null}
                  </span>
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
            <div className="flex flex-col gap-2 border-b border-line/60 p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={sel.image} name={sel.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-accent">@{sel.username}</p>
                  <p className="hud truncate text-[9px]">{sel.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                <div className="flex rounded-full border border-line p-0.5">
                  {(["chat", "media"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`rounded-full px-2.5 py-0.5 font-typewriter text-[10px] uppercase transition ${
                        tab === t ? "bg-accent text-ink" : "text-muted hover:text-accent"
                      }`}
                    >
                      {t}
                      {t === "media" && threadMedia.length
                        ? ` ${threadMedia.length}`
                        : ""}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => saveFlags({ pinned: !flags?.pinned })}
                  title={flags?.pinned ? "Unpin" : "Pin"}
                  className={`rounded-full border px-2 py-1 font-typewriter text-[10px] uppercase transition ${
                    flags?.pinned
                      ? "border-accent text-accent"
                      : "border-line text-muted hover:text-accent"
                  }`}
                >
                  pin
                </button>
                <button
                  onClick={() => saveFlags({ blocked: !flags?.blocked })}
                  title={flags?.blocked ? "Unmute" : "Mute"}
                  className={`rounded-full border px-2 py-1 font-typewriter text-[10px] uppercase transition ${
                    flags?.blocked
                      ? "border-blood bg-blood text-white"
                      : "border-line text-muted hover:text-blood"
                  }`}
                >
                  {flags?.blocked ? "muted" : "mute"}
                </button>
                <button
                  onClick={() => setDossierOpen((v) => !v)}
                  className="rounded-full border border-line px-2 py-1 font-typewriter text-[10px] uppercase text-muted transition hover:text-accent"
                >
                  dossier {dossierOpen ? "▸" : "◂"}
                </button>
              </div>
            </div>
            {tab === "media" ? (
              <div className="flex-1 overflow-y-auto p-4">
                {threadMedia.length === 0 ? (
                  <p className="mt-6 text-center text-sm text-muted">
                    no pictures or videos in this thread yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {threadMedia.map((m) => (
                      <a
                        key={m.id}
                        href={m.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block aspect-square overflow-hidden rounded-lg border border-line/60 bg-surface-2"
                        title={`${m.sender === "goddess" ? "you" : "@" + sel.username} · ${fmt(m.createdAt)}`}
                      >
                        {isVideoUrl(m.mediaUrl) ? (
                          <>
                            <video
                              src={m.mediaUrl}
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-2xl">
                              ▶
                            </span>
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.mediaUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                        <span
                          className={`absolute left-1 top-1 rounded px-1 font-typewriter text-[8px] uppercase ${
                            m.sender === "goddess"
                              ? "bg-accent text-ink"
                              : "bg-ink/80 text-white"
                          }`}
                        >
                          {m.sender === "goddess" ? "you" : "them"}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {thread.map((m) => (
                <div key={m.id}>
                  <div
                    className={`flex ${m.sender === "goddess" ? "justify-end" : "justify-start"}`}
                  >
                    {m.kind === "tribute" ? (
                      <div className="max-w-[80%] rotate-1 rounded-lg border-2 border-blood bg-manila px-4 py-2 shadow-stamp">
                        <p className="font-typewriter text-[10px] uppercase tracking-widest text-blood">
                          ♛ tribute demanded
                        </p>
                        {m.body ? (
                          <p className="mt-0.5 font-hand text-lg text-[#7a1640]">
                            {m.body}
                          </p>
                        ) : null}
                        {m.link ? (
                          <p className="mt-0.5 break-all font-typewriter text-[9px] text-[#5b431a]">
                            {m.link}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender === "goddess"
                            ? "bg-accent text-ink"
                            : "bg-surface-2 text-white"
                        }`}
                      >
                        {m.body}
                        {m.mediaUrl ? <MediaBubble url={m.mediaUrl} /> : null}
                      </div>
                    )}
                  </div>
                  {m.kind !== "tribute" && (m.body || m.mediaUrl) ? (
                    <div
                      className={`mt-0.5 flex ${m.sender === "goddess" ? "justify-end" : "justify-start"}`}
                    >
                      <button
                        type="button"
                        onClick={() => openRepost(m)}
                        title="Pull this into a post on your home Board"
                        className="hud text-[9px] text-muted transition hover:text-accent"
                      >
                        → board
                      </button>
                    </div>
                  ) : null}
                  {m.id === lastGoddessSeenId ? (
                    <p className="hud mt-0.5 text-right text-[9px] text-muted">
                      seen
                    </p>
                  ) : null}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            )}

            {/* quick replies */}
            {tab === "chat" ? (
            <>
            <div className="h-4 px-3">
              {userTyping ? (
                <TypingDots label={`@${sel.username} is typing…`} />
              ) : null}
            </div>
            {tributePresets.length > 0 && tribute ? (
              <div className="flex flex-wrap gap-1.5 border-t border-line/40 px-3 pt-2">
                {tributePresets.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => {
                      setTributeLink(p.url);
                      setPresetLabel(p.label);
                    }}
                    className={`rounded-full border px-2.5 py-0.5 font-typewriter text-[10px] uppercase transition ${
                      tributeLink === p.url
                        ? "border-blood bg-blood text-white"
                        : "border-line text-muted hover:border-blood hover:text-blood"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : null}
            {quickReplies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 border-t border-line/40 px-3 pt-2">
                {quickReplies.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setText(q)}
                    className="rounded-full border border-line px-2.5 py-0.5 font-typewriter text-[10px] text-muted transition hover:border-accent hover:text-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {/* composer */}
            <form onSubmit={reply} className="border-t border-line/60 p-3">
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
              {tribute ? (
                <div className="mb-2">
                  <input
                    className="input w-full py-1.5 text-xs"
                    placeholder="throne link (pick an amount above, or blank = default Throne)"
                    value={tributeLink}
                    onChange={(e) => {
                      setTributeLink(e.target.value);
                      setPresetLabel("");
                    }}
                  />
                  <p className="hud mt-1 text-[9px]">
                    ♛ pay-up sticker — pick an amount chip or paste a link; the
                    text box is the demand written on the card
                  </p>
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
                  <p className="hud mt-1 text-[9px]">
                    uploading… {uploadPct}%
                  </p>
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
                  title="Attach photo/video"
                  className="rounded-full border border-line px-3 py-2 font-typewriter text-xs text-muted transition hover:border-accent hover:text-accent"
                >
                  {uploading ? "…" : "📎"}
                </button>
                <button
                  type="button"
                  onClick={() => setTribute((v) => !v)}
                  title="Demand a tribute (sends your Throne link as a sticker)"
                  className={`rounded-full border px-3 py-2 font-typewriter text-xs transition ${
                    tribute
                      ? "border-blood bg-blood text-white"
                      : "border-line text-muted hover:border-blood hover:text-blood"
                  }`}
                >
                  ♛
                </button>
                <input
                  className="input flex-1"
                  placeholder={tribute ? "the demand, e.g. $20. now. ♡" : "reply…"}
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
                  className="btn-primary whitespace-nowrap px-5 py-2 text-xs"
                >
                  {busy ? "…" : tribute ? "Send ♛" : "Send"}
                </button>
              </div>
              {error ? (
                <p className="mt-1 font-typewriter text-xs text-blood">{error}</p>
              ) : null}
            </form>
            </>
            ) : null}
          </>
        )}
      </div>

      {/* dossier side panel */}
      {dossierOpen && sel ? (
        <div className="card max-h-[72vh] space-y-4 overflow-y-auto p-4">
          <h3 className="hud text-accent">the file on @{sel.username}</h3>
          {!dossier ? (
            <p className="text-xs text-muted">pulling the file…</p>
          ) : (
            <>
              <section className="space-y-1 text-xs">
                <p className="hud text-[9px]">x account</p>
                {dossier.login ? (
                  <>
                    <p className="text-white">
                      {dossier.login.followers} followers ·{" "}
                      {dossier.login.following} following
                      {dossier.login.verified ? " · ✔ verified" : ""}
                    </p>
                    {dossier.login.bio ? (
                      <p className="text-muted">{dossier.login.bio}</p>
                    ) : null}
                    {dossier.login.location ? (
                      <p className="text-muted">📍 {dossier.login.location}</p>
                    ) : null}
                    <p className="text-muted">
                      joined X {fmt(dossier.login.accountCreated).slice(0, 10)}
                    </p>
                    <p className="text-muted">
                      last IP <span className="text-white">{dossier.login.lastIp}</span>
                    </p>
                    <p className="text-muted">
                      {dossier.loginCount} logins · {dossier.distinctIps} IPs ·
                      first seen {fmt(dossier.firstSeen).slice(0, 10)}
                    </p>
                  </>
                ) : (
                  <p className="text-muted">no login record.</p>
                )}
              </section>

              <section className="space-y-1 text-xs">
                <p className="hud text-[9px]">activity</p>
                <p className="text-muted">
                  {dossier.spins} spins
                  {dossier.lastSpinResult
                    ? ` · last: ${dossier.lastSpinResult}`
                    : ""}
                </p>
                <p className="text-muted">{dossier.confessions} confessions</p>
              </section>

              <section className="space-y-1.5 text-xs">
                <p className="hud text-[9px]">private note</p>
                <textarea
                  className="input min-h-[60px] w-full resize-y text-xs"
                  value={noteDraft}
                  maxLength={500}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => saveFlags({ note: noteDraft })}
                  className="btn-primary px-3 py-1 text-[10px]"
                >
                  Save note
                </button>
              </section>

              <section className="space-y-1.5 border-t border-blood/40 pt-3 text-xs">
                <p className="hud text-[9px] text-blood">danger zone</p>
                <p className="text-muted">
                  Site-wide ban — they can&apos;t view the site or reach you.
                  Different from &quot;mute&quot; (which only silences this
                  chat).
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      blockSitewide("x", sel.userId, sel.username)
                    }
                    className="rounded-full border border-blood px-3 py-1 font-typewriter text-[10px] uppercase text-blood transition hover:bg-blood hover:text-white"
                  >
                    ban this account
                  </button>
                  {dossier.login?.lastIp ? (
                    <button
                      type="button"
                      onClick={() =>
                        blockSitewide("ip", dossier.login!.lastIp)
                      }
                      className="rounded-full border border-blood px-3 py-1 font-typewriter text-[10px] uppercase text-blood transition hover:bg-blood hover:text-white"
                    >
                      ban last IP
                    </button>
                  ) : null}
                </div>
                {blockedNote ? (
                  <p className="font-typewriter text-[10px] text-accent">
                    {blockedNote}
                  </p>
                ) : null}
              </section>
            </>
          )}
        </div>
      ) : null}

      {/* pull-a-DM-into-a-post panel */}
      {repostMsg && sel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setRepostMsg(null)}
        >
          <div
            className="card w-full max-w-md space-y-3 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="hud text-accent">pull into a board post</h3>
              <button
                onClick={() => setRepostMsg(null)}
                className="font-typewriter text-xs text-muted hover:text-accent"
              >
                ✕
              </button>
            </div>

            {repostMsg.mediaUrl ? (
              <div className="flex items-center gap-2">
                {isVideoUrl(repostMsg.mediaUrl) ? (
                  <video src={repostMsg.mediaUrl} className="h-16 rounded" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={repostMsg.mediaUrl} alt="" className="h-16 rounded object-cover" />
                )}
                <span className="hud text-[9px]">their attachment goes on the post</span>
              </div>
            ) : null}

            <textarea
              className="input min-h-[80px] w-full resize-y text-sm"
              placeholder="caption…"
              value={repostCaption}
              maxLength={2000}
              onChange={(e) => setRepostCaption(e.target.value)}
            />

            <label className="flex items-center gap-2 font-typewriter text-xs text-muted">
              <input
                type="checkbox"
                checked={repostCredit}
                onChange={(e) => setRepostCredit(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              expose @{sel.username} (put their handle on it)
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={submitRepost}
                disabled={repostBusy}
                className="btn-primary px-5 py-2 text-xs"
              >
                {repostBusy ? "…" : "Post to board"}
              </button>
              {repostDone ? (
                <span className="font-typewriter text-xs text-accent">
                  {repostDone}
                </span>
              ) : null}
            </div>
            <p className="hud text-[9px]">
              it lands on your home Board (turn The Board on in Settings if it&apos;s off).
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
