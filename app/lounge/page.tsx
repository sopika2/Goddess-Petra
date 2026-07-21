import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { readUserSession } from "@/lib/usersession";
import { isAuthed } from "@/lib/auth";
import LoungeRoom from "@/components/lounge/LoungeRoom";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "The Lounge",
  description: "The public chat room.",
  alternates: { canonical: "/lounge" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoungePage() {
  const s = await getSettings();
  if (!s.loungeEnabled) redirect("/");
  const [user, admin] = await Promise.all([readUserSession(), isAuthed()]);
  const canPost = Boolean(user || admin);

  return (
    <main className="min-h-screen">
      <div className="tape h-3" />

      <header className="relative mx-auto max-w-2xl px-6 py-10 text-center">
        <Link
          href="/"
          className="hud absolute left-6 top-6 hover:text-accent-soft"
        >
          ◂ back to file
        </Link>
        <h1 className="font-display text-4xl uppercase sm:text-5xl">
          {s.loungeHeading}
        </h1>
        <p className="mt-3 font-hand text-2xl text-accent-soft">{s.loungeSub}</p>
        {s.loungeNote ? (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {s.loungeNote}
          </p>
        ) : null}
      </header>

      <div className="tape h-3" />

      <section className="mx-auto max-w-2xl px-6 py-10">
        <LoungeRoom canPost={canPost} />
      </section>

      <SiteFooter />
    </main>
  );
}
