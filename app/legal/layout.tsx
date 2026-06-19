import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <div className="tape h-3" />
      <article className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="hud hover:text-accent-soft">
          ◂ back to file
        </Link>
        {children}
      </article>
      <div className="tape h-3" />
      <SiteFooter />
    </main>
  );
}
