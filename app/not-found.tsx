import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-6xl font-bold">404</h1>
      <p className="mt-4 text-muted">This page doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary mt-8">
        Back home
      </Link>
    </main>
  );
}
