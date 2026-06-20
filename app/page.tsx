import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { getSettings, isSafeUrl } from "@/lib/settings";
import { isAuthed } from "@/lib/auth";
import { readUserSession } from "@/lib/usersession";
import { renderWithRedactions } from "@/components/RichText";
import FeedHint from "@/components/FeedHint";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Read editable settings on each request.
export const dynamic = "force-dynamic";

// Ransom-note cut-out wordmark — mismatched letter blocks (styled in code).
const ransom = [
  { t: "GOD", cls: "bg-white text-ink font-display -rotate-3" },
  { t: "DESS", cls: "bg-accent text-ink font-typewriter rotate-2" },
  { t: "PET", cls: "bg-evidence text-ink font-display rotate-1" },
  { t: "RA", cls: "bg-[#7A1640] text-white font-display italic -rotate-2" },
];

export default async function HomePage() {
  const s = await getSettings();
  const authed = await isAuthed();
  const user = await readUserSession();
  const throneHost = s.throneUrl.replace(/^https?:\/\//, "");
  const throneSafe = isSafeUrl(s.throneUrl);

  // Structured data so search engines understand who/what this page is.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const handle = (process.env.NEXT_PUBLIC_TWITTER_HANDLE || "").replace(/^@/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: s.siteName,
    url: siteUrl,
    mainEntity: {
      "@type": "Person",
      name: s.siteName,
      url: siteUrl,
      ...(handle ? { sameAs: [`https://x.com/${handle}`] } : {}),
    },
  };

  const avatar =
    user && user.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt=""
        className="h-7 w-7 rounded-full object-cover"
      />
    ) : (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 font-display text-xs text-muted">
        {(user?.name || "?").charAt(0).toUpperCase()}
      </span>
    );

  // The account chip: signed-in users see their avatar + name (admins get a link
  // into the control center); everyone else sees "Sign in with X".
  const accountChip = user ? (
    <div className="flex items-center gap-2">
      {authed ? (
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-full border border-line bg-surface/60 py-1 pl-1 pr-3 transition hover:border-accent"
        >
          {avatar}
          <span className="font-typewriter text-xs text-accent-soft">
            {user.name}
          </span>
          <span className="hud text-[9px] text-accent">admin ▸</span>
        </Link>
      ) : (
        <span className="flex items-center gap-2 rounded-full border border-line bg-surface/60 py-1 pl-1 pr-3">
          {avatar}
          <span className="font-typewriter text-xs text-accent-soft">
            {user.name}
          </span>
        </span>
      )}
      <a
        href="/api/auth/logout"
        title="Sign out"
        aria-label="Sign out"
        className="rounded-full border border-line bg-surface/60 px-2 py-1 font-typewriter text-xs text-muted transition hover:border-accent hover:text-accent"
      >
        ↩
      </a>
    </div>
  ) : authed ? (
    <Link
      href="/admin"
      className="rounded-lg border border-line bg-surface/60 px-4 py-1.5 font-typewriter text-xs uppercase tracking-wide text-accent-soft transition hover:border-accent hover:text-accent"
    >
      Admin ▸
    </Link>
  ) : (
    <a
      href="/api/auth/twitter/login"
      className="rounded-lg border border-line bg-surface/60 px-4 py-1.5 font-typewriter text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent"
    >
      Sign in with X
    </a>
  );

  const losersChip = (
    <Link href="/exposed" className="btn-loser">
      losers ▸
    </Link>
  );

  const feedChip = (
    <Link href="/feed" className="btn-feed">
      {s.adsNavLabel}
    </Link>
  );

  const gamesChip = (
    <Link href="/games" className="btn-game">
      {s.gamesNavLabel}
    </Link>
  );

  const chatChip = (
    <Link href="/chat" className="btn-chat">
      {s.chatNavLabel}
    </Link>
  );

  const confessChip = (
    <Link href="/confessions" className="btn-confess">
      {s.confessNavLabel}
    </Link>
  );

  const xLink = handle ? (
    <a
      href={`https://x.com/${handle}`}
      target="_blank"
      rel="me noopener noreferrer"
      className="inline-flex -rotate-1 items-center gap-2 border-2 border-white bg-ink px-5 py-2.5 font-display text-base uppercase tracking-wide text-white shadow-stamp transition hover:rotate-0 hover:border-ink hover:bg-accent hover:text-ink"
    >
      <span className="text-lg leading-none">𝕏</span> follow @{handle}
    </a>
  ) : null;

  const bio = (sizeCls: string) =>
    s.bioLines.map((line, i) => (
      <p key={i} className={sizeCls}>
        {renderWithRedactions(line)}
      </p>
    ));

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* ───────── MOBILE / TABLET: centered poster (unchanged) ───────── */}
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 lg:hidden">
        <nav className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          {accountChip}
        </nav>
        <nav className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2 sm:right-6 sm:top-6">
          {losersChip}
          {s.confessionsEnabled ? confessChip : null}
          {s.chatEnabled ? chatChip : null}
          {s.gamesEnabled ? gamesChip : null}
          {s.feedEnabled ? feedChip : null}
        </nav>

        <section className="flex flex-1 flex-col items-center justify-center py-28 text-center">
          <div className="mb-8 h-36 w-36 overflow-hidden rounded-full border-2 border-white outline outline-4 outline-accent outline-offset-2 sm:h-44 sm:w-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/goddess-petra.jpg"
              alt={s.siteName}
              className="h-full w-full object-cover"
            />
          </div>

          <h1 className="flex flex-wrap items-center justify-center gap-1.5">
            {ransom.map((p) => (
              <span
                key={p.t}
                className={`inline-block px-2 py-1 text-4xl leading-none sm:text-6xl ${p.cls}`}
              >
                {p.t}
              </span>
            ))}
          </h1>

          <div className="mt-10 space-y-1 font-hand text-2xl leading-tight text-accent-soft sm:text-3xl">
            {bio("")}
          </div>

          {s.tagline ? (
            <p className="mt-9">
              <span className="sticker-tag -rotate-2 font-display text-2xl normal-case sm:text-3xl">
                {s.tagline}
              </span>
            </p>
          ) : null}

          {xLink ? <div className="mt-9">{xLink}</div> : null}
        </section>

        <div className="tape -mx-6 h-2" />

        <section className="py-16">
          <div className="folder mx-auto max-w-md -rotate-1">
            <span className="stamp absolute -right-3 -top-3 rotate-6 border-blood bg-manila text-blood">
              {s.throneStamp}
            </span>
            <p className="font-typewriter text-xs uppercase tracking-wider text-[#5b431a]">
              {s.throneKicker}
            </p>
            <h2 className="mt-1 font-display text-3xl text-[#2A1E06]">
              {s.throneHeading}
            </h2>
            <p className="mt-3 font-hand text-2xl text-[#7a1640]">
              {s.throneNote}
            </p>
            {throneSafe ? (
              <a
                href={s.throneUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-throne mt-6"
              >
                {s.throneButton}
              </a>
            ) : (
              <span className="btn-throne mt-6 cursor-not-allowed opacity-60">
                {s.throneButton}
              </span>
            )}
            <p className="mt-3 break-all text-center font-typewriter text-[10px] text-[#5b431a]">
              {throneHost}
            </p>
          </div>
        </section>

        <SiteFooter />
      </div>

      {/* ───────── DESKTOP: case-file dossier ───────── */}
      <div className="hidden min-h-screen flex-col lg:flex">
        {/* caution-tape header band */}
        <div className="tape h-3" />

        {/* folder-tab nav row */}
        <header className="flex items-center justify-between gap-4 px-10 py-5 xl:px-16">
          {accountChip}
          <div className="flex items-center gap-3">
            {s.confessionsEnabled ? confessChip : null}
            {s.chatEnabled ? chatChip : null}
            {s.gamesEnabled ? gamesChip : null}
            {s.feedEnabled ? (
              <div className="relative">
                {feedChip}
                <FeedHint label="pay me by watching ads" />
              </div>
            ) : null}
            {losersChip}
          </div>
        </header>

        {/* dossier body */}
        <div className="grid flex-1 grid-cols-12 items-center gap-10 px-10 py-8 xl:gap-16 xl:px-20">
          {/* taped polaroid + a small tribute folder tucked into the file */}
          <div className="col-span-5 flex flex-col items-center gap-10">
            <div className="relative -rotate-3">
              <span className="absolute -left-4 -top-3 z-10 h-7 w-28 -rotate-12 bg-white/20" />
              <span className="absolute -bottom-3 -right-4 z-10 h-7 w-28 -rotate-12 bg-white/20" />
              <div className="bg-[#f5efe6] p-3 shadow-folder">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/goddess-petra.jpg"
                  alt={s.siteName}
                  className="h-[22rem] w-[19rem] object-cover xl:h-[25rem] xl:w-[21rem]"
                />
              </div>
              <span className="stamp absolute -bottom-3 left-6 rotate-6 border-blood bg-[#f5efe6] text-blood">
                Classified
              </span>
            </div>

            <div className="folder relative w-[19rem] -rotate-1 p-5 xl:w-[21rem]">
              <span className="stamp absolute -right-2 -top-2 rotate-6 border-blood bg-manila text-blood">
                {s.throneStamp}
              </span>
              <p className="font-typewriter text-[10px] uppercase tracking-wider text-[#5b431a]">
                {s.throneKicker}
              </p>
              <h2 className="mt-0.5 font-display text-2xl text-[#2A1E06]">
                {s.throneHeading}
              </h2>
              <p className="mt-1 font-hand text-lg text-[#7a1640]">
                {s.throneNote}
              </p>
              {throneSafe ? (
                <a
                  href={s.throneUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-throne mt-3 py-2 text-xs"
                >
                  {s.throneButton}
                </a>
              ) : (
                <span className="btn-throne mt-3 cursor-not-allowed py-2 text-xs opacity-60">
                  {s.throneButton}
                </span>
              )}
            </div>
          </div>

          {/* subject file */}
          <div className="col-span-7 flex flex-col justify-center">
            <h1 className="flex flex-wrap items-center gap-1.5">
              {ransom.map((p) => (
                <span
                  key={p.t}
                  className={`inline-block px-2 py-1 text-6xl leading-none xl:text-7xl ${p.cls}`}
                >
                  {p.t}
                </span>
              ))}
            </h1>

            <p className="hud mt-8 text-accent">subject notes</p>
            <div className="mt-3 space-y-1 font-hand text-3xl leading-tight text-accent-soft xl:text-4xl">
              {bio("")}
            </div>

            {s.tagline ? (
              <p className="mt-8">
                <span className="sticker-tag -rotate-2 font-display text-3xl normal-case xl:text-4xl">
                  {s.tagline}
                </span>
              </p>
            ) : null}

            {xLink ? <div className="mt-8">{xLink}</div> : null}
          </div>
        </div>

        {/* caution-tape band above the footer */}
        <div className="tape h-3" />

        <SiteFooter />
      </div>
    </main>
  );
}
