"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="rounded-full border border-line px-4 py-1.5 font-typewriter text-xs uppercase tracking-wide text-muted transition hover:text-accent"
    >
      Log out
    </button>
  );
}
