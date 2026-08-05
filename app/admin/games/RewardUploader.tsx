"use client";

import { useRef, useState } from "react";
import { uploadMedia } from "@/components/uploadMedia";

/**
 * Upload a picture/video for a "reward" wheel segment and get its link, ready
 * to paste into Settings as `label|reward|<link>`.
 */
export default function RewardUploader() {
  const [url, setUrl] = useState("");
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setPct(0);
    setError(null);
    setCopied(false);
    try {
      const r = await uploadMedia(file, "/api/admin/upload", setPct);
      if (r.error) {
        setError(r.error);
        return;
      }
      setUrl(r.url || "");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("couldn't copy — select the link and copy it manually");
    }
  }

  return (
    <div className="card mt-3 space-y-3 p-4">
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="btn-primary px-4 py-1.5 text-xs"
        >
          {busy ? `uploading… ${pct}%` : "📎 Upload a reward"}
        </button>
        {url ? (
          <>
            <code className="min-w-0 flex-1 truncate rounded border border-line bg-ink/60 px-2 py-1 text-xs text-white">
              {url}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded-full border border-line px-3 py-1 font-typewriter text-[10px] uppercase text-muted transition hover:border-accent hover:text-accent"
            >
              {copied ? "copied ✓" : "copy link"}
            </button>
          </>
        ) : null}
      </div>
      {url ? (
        <p className="hud text-[9px]">
          now paste this into Settings as{" "}
          <span className="text-accent">a picture of me ♡|reward|{url}</span>
        </p>
      ) : null}
      {error ? (
        <p className="font-typewriter text-xs text-blood">{error}</p>
      ) : null}
    </div>
  );
}
