import { createServer } from "node:http";
import next from "next";
import nextEnv from "@next/env";

// Load .env / .env.local into process.env BEFORE we read PORT / HOST /
// TRUST_PROXY_HEADERS below — otherwise those (read at startup) would miss a
// .env.local that Next only loads later, during app.prepare(). (@next/env is
// CommonJS, so loadEnvConfig comes off the default import.)
nextEnv.loadEnvConfig(process.cwd());

// Production server that exposes the real client IP to the app. Next's built-in
// `next start` doesn't surface the socket address; here we copy it into
// x-forwarded-for (unless an upstream proxy already set it), so the analytics /
// audit log can record real visitor IPs on a self-hosted box.
//
// Requires `npm run build` first. Run with: npm start  (or: node server.mjs)

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";

const trustProxy = process.env.TRUST_PROXY_HEADERS === "1";

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
  if (!trustProxy) {
    // Bare self-host: authoritatively set the client IP from the real socket
    // address and strip any inbound copies a visitor sent, so the logged IP
    // can't be forged.
    delete req.headers["cf-connecting-ip"];
    delete req.headers["x-real-ip"];
    req.headers["x-forwarded-for"] = req.socket?.remoteAddress || "";
  }
  // When TRUST_PROXY_HEADERS=1 (behind Cloudflare tunnel / a trusted proxy),
  // leave Cloudflare's CF-Connecting-IP intact — lib/ip.ts trusts it there.
  handle(req, res);
}).listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
