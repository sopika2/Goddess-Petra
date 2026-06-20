import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import AdminNav from "../AdminNav";
import InboxClient from "./InboxClient";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  if (!(await isAuthed())) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminNav active="Inbox" />
      <h1 className="font-display text-3xl uppercase">Inbox</h1>
      <p className="hud mt-1">every loser who messaged you · newest first</p>
      <InboxClient />
    </main>
  );
}
