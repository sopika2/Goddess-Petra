"use client";

import { useCallback, useEffect, useState } from "react";

interface Pet {
  number: number;
  userId: string;
  username: string;
  name: string;
  image: string;
  verified: boolean;
  claimedAt: string;
}

interface State {
  enabled: boolean;
  signedIn: boolean;
  isAdmin: boolean;
  pets: Pet[];
  count: number;
  pet: Pet | null;
  petName: string;
  tweetText: string;
  nextNumber: number;
}

const X_PROFILE_SETTINGS = "https://x.com/settings/profile";

function intentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

function Avatar({ src, name }: { src: string; name: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-[10px] text-muted">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default function PetPen() {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pets", { cache: "no-store" });
      if (!res.ok) return;
      setS(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function claim() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pets", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) window.location.href = "/api/auth/twitter/login";
        else setError(d.error || "failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyName() {
    if (!s?.petName) return;
    try {
      await navigator.clipboard.writeText(s.petName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("couldn't copy — select it and copy manually ♡");
    }
  }

  async function removePet(number: number) {
    setS((x) => (x ? { ...x, pets: x.pets.filter((p) => p.number !== number) } : x));
    await fetch("/api/admin/pets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number }),
    }).catch(() => {});
  }

  if (!s) {
    return <p className="hud text-center text-muted">opening the pen…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* ── your status ── */}
      {!s.signedIn ? (
        <div className="card p-6 text-center">
          <p className="hud text-accent">unclaimed</p>
          <p className="mt-3 font-hand text-2xl text-accent-soft">
            sign in with X to get your number ♡
          </p>
          <a href="/api/auth/twitter/login" className="btn-primary mt-5 inline-flex">
            Sign in with X
          </a>
        </div>
      ) : !s.pet ? (
        <div className="card p-6 text-center">
          <p className="hud text-accent">unclaimed</p>
          <p className="mt-3 font-display text-4xl uppercase">
            you&apos;d be pet #{s.nextNumber}
          </p>
          <p className="mt-2 font-hand text-2xl text-accent-soft">
            take the collar, loser :3
          </p>
          <button
            onClick={claim}
            disabled={busy}
            className="btn-primary mt-5 px-6 py-2.5"
          >
            {busy ? "…" : "Claim my number ♡"}
          </button>
          {error ? (
            <p className="mt-2 font-typewriter text-xs text-blood">{error}</p>
          ) : null}
        </div>
      ) : (
        <div className="card space-y-5 p-6">
          <div className="text-center">
            <p className="hud text-accent">
              {s.pet.verified ? "verified property ✓" : "claimed"}
            </p>
            <p className="mt-2 font-display text-5xl uppercase text-accent">
              #{s.pet.number}
            </p>
            <p className="mt-1 font-hand text-2xl text-accent-soft">
              you belong to me now ♡
            </p>
          </div>

          {/* step 1 — wear the name */}
          <div className="rounded-lg border border-line bg-surface-2/60 p-4">
            <p className="hud text-[10px] text-accent">step 1 · wear my name</p>
            <p className="mt-2 select-all break-words rounded border border-line bg-ink/60 px-3 py-2 font-typewriter text-sm text-white">
              {s.petName}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={copyName} className="btn-primary px-4 py-1.5 text-xs">
                {copied ? "copied ✓" : "Copy name"}
              </button>
              <a
                href={X_PROFILE_SETTINGS}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-line px-4 py-1.5 font-typewriter text-xs text-muted transition hover:border-accent hover:text-accent"
              >
                Open X profile settings ▸
              </a>
            </div>
            <p className="mt-2 text-xs text-muted">
              Paste it into your X <strong>Name</strong> field and save. I can&apos;t
              do it for you — X doesn&apos;t let anyone rename your account but you.
            </p>

            {s.pet.verified ? (
              <p className="mt-3 font-typewriter text-xs text-accent">
                ✓ checked — you&apos;re wearing it. good pet.
              </p>
            ) : (
              <div className="mt-3">
                <p className="font-typewriter text-xs text-blood">
                  not wearing it yet.
                </p>
                <a
                  href="/api/auth/twitter/login"
                  className="hud mt-1 inline-block text-[10px] text-accent"
                >
                  done it? click to re-check ▸
                </a>
              </div>
            )}
          </div>

          {/* step 2 — announce it */}
          <div className="rounded-lg border border-line bg-surface-2/60 p-4">
            <p className="hud text-[10px] text-accent">step 2 · tell everyone</p>
            <p className="mt-2 whitespace-pre-wrap break-words rounded border border-line bg-ink/60 px-3 py-2 font-typewriter text-sm text-white">
              {s.tweetText}
            </p>
            <a
              href={intentUrl(s.tweetText)}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-3 inline-flex px-5 py-2 text-xs"
            >
              Post it on X ▸
            </a>
            <p className="mt-2 text-xs text-muted">
              Opens X with it typed out — you just hit Post. The link shows my
              picture on your timeline ♡
            </p>
          </div>
        </div>
      )}

      {/* ── the herd ── */}
      <div>
        <h2 className="hud text-accent">the herd ({s.count})</h2>
        <div className="card mt-3 divide-y divide-line/40 p-0">
          {s.pets.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              no pets yet. be the first, loser ♡
            </p>
          ) : (
            s.pets.map((p) => (
              <div key={p.number} className="flex items-center gap-3 p-3">
                <span className="w-10 shrink-0 font-display text-lg text-accent">
                  #{p.number}
                </span>
                <Avatar src={p.image} name={p.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-accent-soft">
                    @{p.username}
                  </span>
                  <span className="hud block truncate text-[9px]">{p.name}</span>
                </span>
                {p.verified ? (
                  <span className="stamp shrink-0 border-accent text-accent">
                    wearing it
                  </span>
                ) : (
                  <span className="hud shrink-0 text-[9px] text-muted">unmarked</span>
                )}
                {s.isAdmin ? (
                  <button
                    onClick={() => removePet(p.number)}
                    title="Strip this pet of its number"
                    className="shrink-0 font-typewriter text-[11px] text-muted transition hover:text-blood"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
