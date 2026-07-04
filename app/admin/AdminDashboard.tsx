"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { isVideoUrl } from "@/lib/format";

interface FormState {
  name: string;
  tagline: string;
  twitter: string;
  info: string;
  thumbnail: string;
  gallery: string[];
  consentOnFile: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  tagline: "",
  twitter: "",
  info: "",
  thumbnail: "",
  gallery: [],
  consentOnFile: false,
};

export default function AdminDashboard({
  initialProfiles,
}: {
  initialProfiles: Profile[];
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
    router.refresh();
  }

  function startCreate() {
    setEditingSlug(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(p: Profile) {
    setEditingSlug(p.slug);
    setForm({
      name: p.name ?? "",
      tagline: p.tagline ?? "",
      twitter: p.twitter ?? "",
      info: p.info ?? "",
      thumbnail: p.thumbnail ?? "",
      gallery: p.gallery ?? [],
      consentOnFile: p.consentOnFile ?? false,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Upload failed.");
      return null;
    }
    return data.url as string;
  }

  async function onThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingThumb(true);
    setError(null);
    const url = await uploadFile(file);
    if (url) setForm((f) => ({ ...f, thumbnail: url }));
    setUploadingThumb(false);
  }

  async function onGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploadingGallery(true);
    setError(null);
    const urls: string[] = [];
    for (const file of files) {
      const u = await uploadFile(file);
      if (u) urls.push(u);
    }
    if (urls.length) setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls] }));
    setUploadingGallery(false);
  }

  function removeGalleryImage(idx: number) {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== idx) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.consentOnFile) {
      setError("Please confirm consent is on file before publishing.");
      return;
    }
    setBusy(true);
    try {
      const isEdit = editingSlug !== null;
      const res = await fetch(
        isEdit ? `/api/admin/profiles/${editingSlug}` : "/api/admin/profiles",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      await reload();
      startCreate();
    } finally {
      setBusy(false);
    }
  }

  async function toggleHidden(p: Profile) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/profiles/${p.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !p.hidden }),
      });
      if (res.ok) await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(slug: string) {
    if (!window.confirm("Delete this profile? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/profiles/${slug}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (editingSlug === slug) startCreate();
        await reload();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl uppercase">Profiles</h1>
      <p className="hud mb-6 mt-1">manage the exposed wall</p>

      {/* Form */}
      <form onSubmit={save} className="card mt-8 space-y-5 p-6">
        <h2 className="font-display text-xl font-semibold">
          {editingSlug ? "Edit profile" : "Add a new profile"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Name *
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Display name"
            />
          </div>
          <div>
            <label className="label" htmlFor="tagline">
              Tagline
            </label>
            <input
              id="tagline"
              className="input"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Short line shown under the name"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="twitter">
            X / Twitter handle
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted">@</span>
            <input
              id="twitter"
              className="input"
              value={form.twitter}
              onChange={(e) => setForm({ ...form, twitter: e.target.value })}
              placeholder="their_handle (links to x.com/their_handle)"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="info">
            Info / about
          </label>
          <textarea
            id="info"
            className="input min-h-[120px] resize-y"
            value={form.info}
            onChange={(e) => setForm({ ...form, info: e.target.value })}
            placeholder="Anything they agreed to share. Line breaks are preserved."
          />
        </div>

        {/* Thumbnail */}
        <div>
          <span className="label">Thumbnail</span>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {form.thumbnail ? (
                isVideoUrl(form.thumbnail) ? (
                  <video
                    src={form.thumbnail}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.thumbnail}
                    alt="thumbnail"
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                  none
                </div>
              )}
            </div>
            <label className="btn-ghost cursor-pointer px-4 py-2 text-xs">
              {uploadingThumb ? "Uploading…" : "Upload thumbnail"}
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="hidden"
                onChange={onThumb}
                disabled={uploadingThumb}
              />
            </label>
            {form.thumbnail ? (
              <button
                type="button"
                onClick={() => setForm({ ...form, thumbnail: "" })}
                className="text-xs text-muted hover:text-accent-soft"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        {/* Gallery */}
        <div>
          <span className="label">Gallery</span>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {form.gallery.map((src, i) => (
              <div
                key={src + i}
                className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2"
              >
                {isVideoUrl(src) ? (
                  <video
                    src={src}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={`gallery ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeGalleryImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-ink/80 px-2 text-sm text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted hover:border-accent-soft hover:text-accent-soft">
              {uploadingGallery ? "Uploading…" : "+ Add"}
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                multiple
                className="hidden"
                onChange={onGallery}
                disabled={uploadingGallery}
              />
            </label>
          </div>
        </div>

        {/* Consent */}
        <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-4">
          <input
            type="checkbox"
            checked={form.consentOnFile}
            onChange={(e) =>
              setForm({ ...form, consentOnFile: e.target.checked })
            }
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span className="text-sm text-muted">
            I confirm this person is <strong>18 or older</strong> and has
            consented to being displayed here. I have their consent on file and
            will honor any removal request. (Required to publish.)
          </span>
        </label>

        {error ? <p className="text-sm text-accent-soft">{error}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary px-6 py-2.5 text-sm"
          >
            {busy
              ? "Saving…"
              : editingSlug
                ? "Save changes"
                : "Publish profile"}
          </button>
          {editingSlug ? (
            <button
              type="button"
              onClick={startCreate}
              className="btn-ghost px-6 py-2.5 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {/* List */}
      <h2 className="mt-10 font-display text-xl font-semibold">
        Profiles ({profiles.length})
      </h2>
      <div className="mt-4 space-y-2">
        {profiles.length === 0 ? (
          <p className="text-sm text-muted">Nothing here yet.</p>
        ) : (
          profiles.map((p) => (
            <div
              key={p.slug}
              className={`card flex items-center gap-4 p-3 ${p.hidden ? "opacity-60" : ""}`}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {p.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  {p.name}
                  {p.hidden ? (
                    <span className="stamp shrink-0 border-blood text-blood">
                      hidden
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted">
                  /{p.slug} · {p.gallery.length} photo
                  {p.gallery.length === 1 ? "" : "s"}
                  {p.twitter ? ` · @${p.twitter}` : ""}
                </p>
              </div>
              <button
                onClick={() => toggleHidden(p)}
                disabled={busy}
                className="text-xs text-muted hover:text-accent-soft"
                title={
                  p.hidden
                    ? "Show on the public wall"
                    : "Hide from the public wall (stays here)"
                }
              >
                {p.hidden ? "Show" : "Hide"}
              </button>
              <button
                onClick={() => startEdit(p)}
                className="text-xs text-muted hover:text-accent-soft"
              >
                Edit
              </button>
              <button
                onClick={() => remove(p.slug)}
                className="text-xs text-muted hover:text-accent-soft"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
