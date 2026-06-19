"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SearchBox({
  initialQ,
  initialIp,
}: {
  initialQ: string;
  initialIp: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [ip, setIp] = useState(initialIp);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    const i = ip.trim();
    // Exact-IP filter takes precedence (pulls every visit + login for that IP).
    if (i) router.push(`/admin/visitors?ip=${encodeURIComponent(i)}`);
    else if (t) router.push(`/admin/visitors?q=${encodeURIComponent(t)}`);
    else router.push("/admin/visitors");
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-wrap items-center gap-2">
      <input
        className="input max-w-xs"
        placeholder="search ip, @handle, page, browser, os…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <input
        className="input max-w-[12rem]"
        placeholder="filter by exact IP"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
        inputMode="numeric"
      />
      <button type="submit" className="btn-primary px-5 py-2 text-xs">
        Search
      </button>
      {initialQ || initialIp ? (
        <Link href="/admin/visitors" className="btn-ghost px-5 py-2 text-xs">
          Clear
        </Link>
      ) : null}
    </form>
  );
}
