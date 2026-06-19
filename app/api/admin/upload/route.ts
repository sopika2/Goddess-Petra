import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { isAuthed } from "@/lib/auth";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  // Don't use `instanceof File`: the File global doesn't exist on Node < 20
  // (throws "File is not defined"). Duck-type the uploaded blob instead so this
  // works on any Node version.
  if (
    !file ||
    typeof file === "string" ||
    typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== "function"
  ) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const upload = file as {
    type: string;
    arrayBuffer: () => Promise<ArrayBuffer>;
  };

  const ext = EXT_BY_TYPE[upload.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPG, PNG, WebP or GIF." },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await upload.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 15 MB)." },
      { status: 400 },
    );
  }

  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  // Stored under data/ (not public/) and served via the /media route, because
  // Next's production server does not serve files added to public/ at runtime.
  const dir = path.join(process.cwd(), "data", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);

  return NextResponse.json({ url: `/media/${name}` });
}
