import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import AdminNav from "../AdminNav";
import InboxClient from "./InboxClient";
import PushToggle from "@/components/PushToggle";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  if (!(await isAuthed())) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminNav active="Inbox" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase">Inbox</h1>
          <p className="hud mt-1">every loser who messaged you · newest first</p>
        </div>
        {/* Enable on your phone (after the secret login link) to get pinged
            the second a sub messages. */}
        <PushToggle label="notify this device" />
      </div>
      <InboxClient />
    </main>
  );
}
