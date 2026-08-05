import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSettings, isSafeUrl } from "@/lib/settings";
import { readUserSession } from "@/lib/usersession";
import { getRig, effectiveSegments } from "@/lib/games";
import GamesBoard from "@/components/games/GamesBoard";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Games",
  description: "Spin the wheel. You can't win — you can only pay.",
  alternates: { canonical: "/games" },
};

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const s = await getSettings();
  if (!s.gamesEnabled) redirect("/");
  const user = await readUserSession();
  const throneUrl = isSafeUrl(s.throneUrl) ? s.throneUrl : "";

  // She can hand any account its own wheel; everyone else gets the default.
  // The player's wheel must match what the spin route picks from, so both
  // resolve it the same way.
  let segments = s.wheelSegments;
  if (user) {
    try {
      segments = effectiveSegments(s.wheelSegments, await getRig(user.id));
    } catch {
      /* fall back to the default wheel */
    }
  }

  return (
    <main className="min-h-screen">
      <div className="tape h-3" />

      <header className="relative mx-auto max-w-3xl px-6 py-12 text-center">
        <Link
          href="/"
          className="hud absolute left-6 top-6 hover:text-accent-soft"
        >
          ◂ back to file
        </Link>
        <h1 className="font-display text-4xl uppercase sm:text-5xl">
          {s.gamesHeading}
        </h1>
        <p className="mt-3 font-hand text-2xl text-accent-soft">{s.gamesSub}</p>
        {s.gamesNote ? (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {s.gamesNote}
          </p>
        ) : null}
      </header>

      <div className="tape h-3" />

      <section className="mx-auto max-w-3xl px-6 py-12">
        {!user ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <p className="hud text-accent">access restricted</p>
            <p className="mt-3 font-hand text-2xl text-accent-soft">
              sign in with X to play, loser ♡
            </p>
            <p className="mt-2 text-sm text-muted">
              every spin is logged to your account. no hiding.
            </p>
            <a
              href="/api/auth/twitter/login"
              className="btn-primary mt-6 inline-flex"
            >
              Sign in with X to play
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-10">
            <p className="hud text-muted">
              playing as <span className="text-accent">@{user.username}</span> ·
              she&apos;s watching
            </p>
            <GamesBoard
              segments={segments}
              rouletteEnabled={s.rouletteEnabled}
              throneUrl={throneUrl}
              throneButton={s.throneButton}
            />
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
