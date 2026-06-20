import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { readUserSession } from "@/lib/usersession";
import ChatBox from "@/components/chat/ChatBox";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Message me",
  description: "Send Goddess Petra a message.",
  alternates: { canonical: "/chat" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const s = await getSettings();
  if (!s.chatEnabled) redirect("/");
  const user = await readUserSession();

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
          {s.chatHeading}
        </h1>
        <p className="mt-3 font-hand text-2xl text-accent-soft">{s.chatSub}</p>
        {s.chatNote ? (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {s.chatNote}
          </p>
        ) : null}
      </header>

      <div className="tape h-3" />

      <section className="mx-auto max-w-2xl px-6 py-12">
        {!user ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <p className="hud text-accent">access restricted</p>
            <p className="mt-3 font-hand text-2xl text-accent-soft">
              sign in with X to message me ♡
            </p>
            <p className="mt-2 text-sm text-muted">
              every word is logged to your file.
            </p>
            <a
              href="/api/auth/twitter/login"
              className="btn-primary mt-6 inline-flex"
            >
              Sign in with X
            </a>
          </div>
        ) : (
          <ChatBox />
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
