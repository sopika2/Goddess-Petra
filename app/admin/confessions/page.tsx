import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { listForAdmin } from "@/lib/confessions";
import AdminNav from "../AdminNav";
import ConfessionsAdmin from "./ConfessionsAdmin";

export const dynamic = "force-dynamic";

export default async function ConfessionsAdminPage() {
  if (!(await isAuthed())) notFound();
  const confessions = await listForAdmin(300);
  const pending = confessions.filter((c) => c.status === "pending").length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <AdminNav active="Confessions" />
      <h1 className="font-display text-3xl uppercase">Confessions</h1>
      <p className="hud mt-1">
        {pending} waiting · approve what goes on the wall · you always see who
        sent it
      </p>
      <ConfessionsAdmin confessions={confessions} />
    </main>
  );
}
