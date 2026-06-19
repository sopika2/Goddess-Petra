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
        All individuals featured on this site are 18 or older and have consented
        to appear. To request removal of content, use the contact details
        provided.
      </p>
    </footer>
  );
}
