"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isVideoUrl } from "@/lib/format";
import { uploadMedia } from "@/components/uploadMedia";

interface PollOption {
  id: string;
  label: string;
  votes: number;
}
interface Post {
  id: string;
  body: string;
  mediaUrl: string;
  linkLabel: string;
  linkUrl: string;
  pinned: boolean;
  createdAt: string;
  poll: PollOption[] | null;
  totalVotes: number;
}

function fmt(ts: string) {
  return ts ? ts.replace("T", " ").slice(0, 16) : "";
}

export default function BoardClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollText, setPollText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/posts", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setPosts(Array.isArray(d.posts) ? d.posts : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(file: File) {
    setUploading(true);
    setUploadPct(0);
    setError(null);
    try {
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

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const pollOptions = showPoll
      ? pollText.split("\n").map((l) => l.trim()).filter(Boolean)
      : [];
    if (!body.trim() && !mediaUrl && pollOptions.length < 2) {
      setError("Write something, add media, or give the poll 2+ options.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          mediaUrl,
          linkLabel,
          linkUrl,
          pollOptions,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Post failed.");
        return;
      }
      setBody("");
      setMediaUrl("");
      setLinkLabel("");
      setLinkUrl("");
      setShowPoll(false);
      setPollText("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function pin(p: Post) {
    await fetch("/api/admin/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, pinned: !p.pinned }),
    }).catch(() => {});
    load();
  }

  async function remove(id: string) {
    setPosts((ps) => ps.filter((p) => p.id !== id));
    await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  return (
    <div className="mt-6 space-y-8">
      {/* composer */}
      <form onSubmit={post} className="card space-y-3 p-4">
        <textarea
          className="input min-h-[90px] w-full resize-y"
          placeholder="say whatever you want, loser-whisperer…"
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />

        {mediaUrl ? (
          <div className="flex items-center gap-2">
            {isVideoUrl(mediaUrl) ? (
              <video src={mediaUrl} className="h-16 rounded" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt="" className="h-16 rounded object-cover" />
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
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
            <p className="hud mt-1 text-[9px]">uploading… {uploadPct}%</p>
          </div>
        ) : null}

        {showPoll ? (
          <div>
            <label className="label">Poll options (one per line, 2–6)</label>
            <textarea
              className="input min-h-[70px] w-full resize-y font-mono text-xs"
              placeholder={"yes ♡\nno (still pay)"}
              value={pollText}
              onChange={(e) => setPollText(e.target.value)}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input flex-1"
            placeholder="button label (optional)"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
          />
          <input
            className="input flex-[2]"
            placeholder="button link https://… (optional)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="rounded-full border border-line px-3 py-1.5 font-typewriter text-xs text-muted transition hover:border-accent hover:text-accent"
          >
            📎 photo/video
          </button>
          <button
            type="button"
            onClick={() => setShowPoll((v) => !v)}
            className={`rounded-full border px-3 py-1.5 font-typewriter text-xs transition ${
              showPoll
                ? "border-accent text-accent"
                : "border-line text-muted hover:border-accent hover:text-accent"
            }`}
          >
            📊 poll
          </button>
          <button
            type="submit"
            disabled={busy || uploading}
            className="btn-primary ml-auto px-6 py-2 text-xs"
          >
            {busy ? "…" : "Post"}
          </button>
        </div>
        {error ? (
          <p className="font-typewriter text-xs text-blood">{error}</p>
        ) : null}
      </form>

      {/* manage */}
      <section className="space-y-3">
        <h2 className="hud text-accent">posts ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted">Nothing posted yet.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="hud text-[9px]">
                    {p.pinned ? "📌 pinned · " : ""}
                    {fmt(p.createdAt)}
                  </p>
                  {p.body ? (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white">
                      {p.body}
                    </p>
                  ) : null}
                  {p.mediaUrl ? (
                    <p className="hud mt-1 text-[9px]">📎 {isVideoUrl(p.mediaUrl) ? "video" : "image"}</p>
                  ) : null}
                  {p.poll ? (
                    <div className="mt-1 space-y-0.5">
                      {p.poll.map((o) => (
                        <p key={o.id} className="text-xs text-muted">
                          {o.label} — <span className="text-accent">{o.votes}</span>
                        </p>
                      ))}
                      <p className="hud text-[9px]">{p.totalVotes} total</p>
                    </div>
                  ) : null}
                  {p.linkUrl ? (
                    <p className="hud mt-1 break-all text-[9px]">
                      🔗 {p.linkLabel} → {p.linkUrl}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => pin(p)}
                    className={`rounded-full border px-3 py-1 font-typewriter text-[10px] uppercase transition ${
                      p.pinned
                        ? "border-accent text-accent"
                        : "border-line text-muted hover:text-accent"
                    }`}
                  >
                    {p.pinned ? "unpin" : "pin"}
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="rounded-full border border-blood px-3 py-1 font-typewriter text-[10px] uppercase text-blood transition hover:bg-blood hover:text-white"
                  >
                    delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
