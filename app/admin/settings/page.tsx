import { notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import AdminNav from "../AdminNav";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAuthed())) notFound();
  const settings = await getSettings();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AdminNav active="Settings" />
      <h1 className="font-display text-3xl uppercase">Site Settings</h1>
      <p className="hud mt-1">edit the words on your site — saves instantly</p>
      <SettingsForm initial={settings} />
    </main>
  );
}
