import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default async function SiteFooter() {
  const s = await getSettings();
  const year = new Date().getFullYear();
  const handle = (process.env.NEXT_PUBLIC_TWITTER_HANDLE || "").replace(/^@/, "");
  return (
    <footer className="border-t border-line/60 px-6 py-10 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="rec-dot h-2 w-2 rounded-full bg-blood" />
        <span className="font-typewriter text-xs uppercase tracking-[0.16em] text-blood">
          {s.footerThreat}
        </span>
      </div>

      {handle ? (
        <p className="mt-5">
          <a
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="me noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-4 py-2 font-typewriter text-xs uppercase tracking-wide text-accent-soft transition hover:border-accent hover:text-accent"
          >
            follow on X — @{handle}
          </a>
        </p>
      ) : null}
      {/* Legal / consent — kept in plain legible type, never decorative. */}
      <p className="mt-5 text-xs text-muted">
        © {year} {s.siteName}. All rights reserved. 18+ only.
      </p>
      <p className="mt-2 text-xs text-muted">
        All individuals featured on this site are 18 or older and appear with
        consent. To request removal of content, email{" "}
        <a
          href={`mailto:${s.contactEmail}`}
          className="underline hover:text-accent-soft"
        >
          {s.contactEmail}
        </a>
        .
      </p>
      <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
        <Link href="/legal/2257" className="hover:text-accent-soft">
          2257 Statement
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/dmca" className="hover:text-accent-soft">
          DMCA / Removal
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/privacy" className="hover:text-accent-soft">
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link href="/legal/terms" className="hover:text-accent-soft">
          Terms
        </Link>
      </nav>
    </footer>
  );
}
