import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import AdminNav from "../AdminNav";
import BoardClient from "./BoardClient";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  if (!(await isAuthed())) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AdminNav active="Board" />
      <h1 className="font-display text-3xl uppercase">Board</h1>
      <p className="hud mt-1">
        your timeline on the home page · post, poll, pin, delete
      </p>
      <BoardClient />
    </main>
  );
}
