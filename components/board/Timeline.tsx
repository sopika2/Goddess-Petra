"use client";

import { useCallback, useEffect, useState } from "react";
import { isVideoUrl } from "@/lib/format";

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
  myVote: string | null;
}

function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toISOString().slice(0, 10);
}

function Poll({
  post,
  signedIn,
  onVote,
}: {
  post: Post;
  signedIn: boolean;
  onVote: (postId: string, optionId: string) => void;
}) {
  const poll = post.poll!;
  const showResults = !!post.myVote || !signedIn;
  const total = post.totalVotes || 0;
  return (
    <div className="mt-3 space-y-2">
      {poll.map((o) => {
        const pct = total ? Math.round((o.votes / total) * 100) : 0;
        if (showResults) {
          const mine = post.myVote === o.id;
          return (
            <div key={o.id} className="relative overflow-hidden rounded-lg border border-line">
              <div
                className={`absolute inset-y-0 left-0 ${mine ? "bg-accent/40" : "bg-surface-2"}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
                <span className="text-white">
                  {mine ? "✓ " : ""}
                  {o.label}
                </span>
                <span className="hud text-[10px]">{pct}%</span>
              </div>
            </div>
          );
        }
        return (
          <button
            key={o.id}
            onClick={() => onVote(post.id, o.id)}
            className="block w-full rounded-lg border border-accent/60 px-3 py-1.5 text-left text-sm text-accent transition hover:bg-accent hover:text-ink"
          >
            {o.label}
          </button>
        );
      })}
      <p className="hud text-[9px]">
        {total} vote{total === 1 ? "" : "s"}
        {!signedIn ? " · sign in with X to vote" : ""}
      </p>
    </div>
  );
}

export default function Timeline() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setPosts(Array.isArray(d.posts) ? d.posts : []);
      setSignedIn(!!d.signedIn);
      setIsAdmin(!!d.isAdmin);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 20000);
    return () => clearInterval(t);
  }, [load]);

  function patch(id: string, fn: (p: Post) => Post) {
    setPosts((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
  }

  async function onVote(postId: string, optionId: string) {
    patch(postId, (p) =>
      p.poll
        ? {
            ...p,
            myVote: optionId,
            totalVotes: p.totalVotes + 1,
            poll: p.poll.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
          }
        : p,
    );
    try {
      const res = await fetch("/api/posts/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, optionId }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.post) patch(postId, () => d.post);
      else if (res.status === 401) window.location.href = "/api/auth/twitter/login";
    } catch {
      /* keep optimistic */
    }
  }

  async function deletePost(id: string) {
    setPosts((ps) => ps.filter((p) => p.id !== id));
    await fetch("/api/admin/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  if (loaded && posts.length === 0) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {posts.map((p) => (
        <article
          key={p.id}
          className={`card p-4 text-left ${p.pinned ? "border-l-[3px] border-l-accent" : ""}`}
        >
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/goddess-petra.jpg" alt="" className="h-8 w-8 rounded-full object-cover" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm text-accent">Goddess Petra</p>
              <p className="hud text-[9px]">
                {p.pinned ? "📌 pinned · " : ""}
                {ago(p.createdAt)}
              </p>
            </div>
            {isAdmin ? (
              <button
                onClick={() => deletePost(p.id)}
                title="Delete post"
                className="font-typewriter text-[11px] text-muted transition hover:text-blood"
              >
                ✕
              </button>
            ) : null}
          </div>

          {p.body ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white">
              {p.body}
            </p>
          ) : null}

          {p.mediaUrl ? (
            isVideoUrl(p.mediaUrl) ? (
              <video src={p.mediaUrl} controls preload="metadata" className="mt-3 max-h-[26rem] w-full rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.mediaUrl} alt="" className="mt-3 max-h-[26rem] w-full rounded-lg object-cover" />
            )
          ) : null}

          {p.poll ? <Poll post={p} signedIn={signedIn} onVote={onVote} /> : null}

          {p.linkUrl ? (
            <a href={p.linkUrl} target="_blank" rel="noreferrer" className="btn-primary mt-3 inline-flex px-5 py-2 text-xs">
              {p.linkLabel || "open ▸"}
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
