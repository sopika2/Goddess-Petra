import { getSettings } from "@/lib/settings";

// Serves /ads.txt from the editable setting. Ad networks (and AdSense) fetch
// this file at the site root to verify the publisher and authorize payouts.
export const dynamic = "force-dynamic";

export async function GET() {
  let body = "";
  try {
    body = (await getSettings()).adsTxt || "";
  } catch {
    body = "";
  }
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
