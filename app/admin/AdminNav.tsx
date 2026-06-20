import Link from "next/link";
import LogoutButton from "./LogoutButton";

const ITEMS: [string, string][] = [
  ["Overview", "/admin"],
  ["Profiles", "/admin/profiles"],
  ["Visitors", "/admin/visitors"],
  ["Games", "/admin/games"],
  ["Inbox", "/admin/inbox"],
  ["Confessions", "/admin/confessions"],
  ["Settings", "/admin/settings"],
];

export default function AdminNav({ active }: { active: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
      <nav className="flex flex-wrap gap-2">
        {ITEMS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-1.5 font-typewriter text-xs uppercase tracking-wide transition ${
              active === label
                ? "bg-accent text-ink"
                : "border border-line text-muted hover:text-accent"
            }`}
          >
            {label}
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
