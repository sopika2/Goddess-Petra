import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { listProfiles } from "@/lib/db";
import AdminDashboard from "../AdminDashboard";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  if (!(await isAuthed())) notFound();
  const profiles = await listProfiles();
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AdminNav active="Profiles" />
      <AdminDashboard initialProfiles={profiles} />
    </main>
  );
}
