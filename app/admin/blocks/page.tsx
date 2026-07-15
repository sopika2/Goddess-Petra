import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import AdminNav from "../AdminNav";
import BlocksClient from "./BlocksClient";

export const dynamic = "force-dynamic";

export default async function BlocksPage() {
  if (!(await isAuthed())) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="Blocks" />
      <h1 className="font-display text-3xl uppercase">Blocks</h1>
      <p className="hud mt-1">
        banned IPs &amp; X accounts · they can&apos;t view the site or message you
      </p>
      <BlocksClient />
    </main>
  );
}
