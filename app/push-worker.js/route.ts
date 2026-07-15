// Service worker for OUR web-push notifications. Served at /push-worker.js
// but registered with scope /gp-push/ so it can never collide with the
// ExoClick ad-network worker that owns /worker.js at root scope (one SW per
// scope — registering ours at root would silently replace theirs).
const SW_SOURCE = `
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || "goddess petra";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/goddess-petra.jpg",
      badge: "/goddess-petra.jpg",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
`;

export function GET() {
  return new Response(SW_SOURCE, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      // Script lives at the root, but we only ever claim the /gp-push/ scope.
      "Service-Worker-Allowed": "/gp-push/",
    },
  });
}
