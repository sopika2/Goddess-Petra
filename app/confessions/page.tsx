import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { readUserSession } from "@/lib/usersession";
import { listPublic } from "@/lib/confessions";
import ConfessForm from "@/components/confessions/ConfessForm";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Confessions",
  description: "Anonymous confessions to Goddess Petra.",
  alternates: { canonical: "/confessions" },
};

export const dynamic = "force-dynamic";

function shortDate(ts: string) {
  return ts ? ts.slice(0, 10) : "";
}

export default async function ConfessionsPage() {
  const s = await getSettings();
  if (!s.confessionsEnabled) redirect("/");
  const [user, confessions] = await Promise.all([
    readUserSession(),
    listPublic(200),
  ]);

  return (
    <main className="min-h-screen">
      <div className="tape h-3" />

      <header className="relative mx-auto max-w-2xl px-6 py-12 text-center">
        <Link
          href="/"
          className="hud absolute left-6 top-6 hover:text-accent-soft"
        >
          ◂ back to file
        </Link>
        <h1 className="font-display text-4xl uppercase sm:text-5xl">
          {s.confessHeading}
        </h1>
        <p className="mt-3 font-hand text-2xl text-accent-soft">
          {s.confessSub}
        </p>
        {s.confessNote ? (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {s.confessNote}
          </p>
        ) : null}
      </header>

      <div className="tape h-3" />

      <section className="mx-auto max-w-2xl px-6 py-12">
        {user ? (
          <ConfessForm />
        ) : (
          <div className="card mx-auto max-w-md p-8 text-center">
            <p className="hud text-accent">access restricted</p>
            <p className="mt-3 font-hand text-2xl text-accent-soft">
              sign in with X to confess ♡
            </p>
            <p className="mt-2 text-sm text-muted">
              the wall is anonymous — but she always knows it was you.
            </p>
            <a
              href="/api/auth/twitter/login"
              className="btn-primary mt-6 inline-flex"
            >
              Sign in with X
            </a>
          </div>
        )}

        <h2 className="hud mt-12 text-accent">
          the confessions ({confessions.length})
        </h2>
        <div className="mt-4 space-y-4">
          {confessions.length === 0 ? (
            <p className="font-hand text-xl text-accent-soft">
              no one&apos;s confessed yet… be the first, loser :3
            </p>
          ) : (
            confessions.map((c) => (
              <blockquote key={c.id} className="card relative p-5">
                <span className="hud absolute right-4 top-4 text-[9px] text-muted">
                  anonymous · {shortDate(c.createdAt)}
                </span>
                <p className="mt-2 whitespace-pre-wrap break-words pr-24 font-hand text-xl leading-snug text-accent-soft">
                  {c.body}
                </p>
              </blockquote>
            ))
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
