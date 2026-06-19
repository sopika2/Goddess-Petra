// ExoClick push-notification service worker, served at the site ROOT
// (https://goddess-petra.info/worker.js) as the push code requires. The file is
// just an importScripts of ExoClick's worker; served with a JS content-type and
// root scope so the browser will register it as a service worker.
const WORKER = 'importScripts("https://js.wpnsrv.com/worker.php?v=2.0");\n';

export const dynamic = "force-static";

export async function GET() {
  return new Response(WORKER, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
