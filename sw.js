// Trecard のホーム画面アプリの service worker。通知を表示し、押されたらその抽選の画面を開くだけ。
// ページやデータのキャッシュはしない（いつも最新の画面を開く）。秘密の値は持たない。
"use strict";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = String(data.title || "Trecard").slice(0, 80);
  event.waitUntil(self.registration.showNotification(title, {
    body: String(data.body || "").slice(0, 200),
    tag: String(data.tag || ""),
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { target: String(data.target || "").slice(0, 1200) }
  }));
});

// An open app gets the target by message; otherwise the app opens with it in the address (#open=...).
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = String((event.notification.data && event.notification.data.target) || "");
  event.waitUntil((async () => {
    const scope = new URL(self.registration.scope);
    const appUrl = new URL("./#open=" + encodeURIComponent(target), scope).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      let url;
      try { url = new URL(client.url); } catch { continue; }
      if (url.origin !== scope.origin || ![scope.pathname, scope.pathname + "index.html"].includes(url.pathname)) continue;
      if (!("focus" in client)) continue;
      try {
        await client.focus();
        client.postMessage({ type: "trecard:open", target });
        return;
      } catch { /* A closed or unfocusable window must not consume the notification target. */ }
    }
    await self.clients.openWindow(appUrl);
  })());
});
