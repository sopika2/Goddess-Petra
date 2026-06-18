"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    router.push(
      t ? `/admin/visitors?q=${encodeURIComponent(t)}` : "/admin/visitors",
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-wrap items-center gap-2">
      <input
        className="input max-w-sm"
        placeholder="search ip, @handle, page, browser, os, timezone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="btn-primary px-5 py-2 text-xs">
        Search
      </button>
      {initial ? (
        <Link href="/admin/visitors" className="btn-ghost px-5 py-2 text-xs">
          Clear
        </Link>
      ) : null}
    </form>
  );
}
