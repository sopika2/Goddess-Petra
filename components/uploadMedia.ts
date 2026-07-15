// Client-side media upload shared by the visitor chat and the admin inbox.
// Files up to 10 MB go in one shot; bigger files are sliced into 8 MB batches
// (start → chunk×N → finish) so large videos survive slow connections and the
// Cloudflare tunnel. `onProgress` gets 0–100.

const SINGLE_SHOT_MAX = 10 * 1024 * 1024;
const CHUNK_SIZE = 8 * 1024 * 1024;

export interface UploadResult {
  url?: string;
  error?: string;
}

export async function uploadMedia(
  file: File,
  endpoint: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  try {
    onProgress?.(0);

    if (file.size <= SINGLE_SHOT_MAX) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return { error: d.error || "upload failed" };
      onProgress?.(100);
      return { url: d.url };
    }

    // Batched path for >10 MB.
    let res = await fetch(`${endpoint}?action=start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: file.type, size: file.size }),
    });
    let d = await res.json().catch(() => ({}));
    if (!res.ok || !d.uploadId) return { error: d.error || "upload failed" };
    const uploadId: string = d.uploadId;

    const total = Math.ceil(file.size / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const piece = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
      const fd = new FormData();
      fd.append("uploadId", uploadId);
      fd.append("index", String(i));
      fd.append("chunk", piece);
      res = await fetch(`${endpoint}?action=chunk`, { method: "POST", body: fd });
      if (!res.ok) {
        d = await res.json().catch(() => ({}));
        return { error: d.error || "upload failed mid-way" };
      }
      onProgress?.(Math.round(((i + 1) / (total + 1)) * 100));
    }

    res = await fetch(`${endpoint}?action=finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId }),
    });
    d = await res.json().catch(() => ({}));
    if (!res.ok || !d.url) return { error: d.error || "upload failed" };
    onProgress?.(100);
    return { url: d.url };
  } catch {
    return { error: "upload failed" };
  }
}
