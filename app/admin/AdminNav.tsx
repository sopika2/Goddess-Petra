import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { totalUnread } from "@/lib/messages";

const ITEMS: [string, string][] = [
  ["Overview", "/admin"],
  ["Board", "/admin/board"],
  ["Profiles", "/admin/profiles"],
  ["Visitors", "/admin/visitors"],
  ["Games", "/admin/games"],
  ["Inbox", "/admin/inbox"],
  ["Confessions", "/admin/confessions"],
  ["Blocks", "/admin/blocks"],
  ["Settings", "/admin/settings"],
];

// Async server component — every consumer is a force-dynamic admin page, so
// the badge count is fresh on each load (and cheap: one indexed COUNT).
export default async function AdminNav({ active }: { active: string }) {
  let unread = 0;
  try {
    unread = await totalUnread();
  } catch {
    /* badges are cosmetic — never break the nav */
  }
  const badges: Record<string, number> = {
    Inbox: unread,
  };

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
      <nav className="flex flex-wrap gap-2">
        {ITEMS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={`relative rounded-full px-4 py-1.5 font-typewriter text-xs uppercase tracking-wide transition ${
              active === label
                ? "bg-accent text-ink"
                : "border border-line text-muted hover:text-accent"
            }`}
          >
            {label}
            {badges[label] > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blood px-1 text-[9px] font-bold text-white">
                {badges[label]}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="rounded-full border border-line px-4 py-1.5 font-typewriter text-xs uppercase tracking-wide text-muted transition hover:text-accent"
        >
          View site
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
