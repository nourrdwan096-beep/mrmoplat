// MR. MOHAMED RADWAN EDUCATION PLATFORM - SERVICE WORKER
// High-Reliability Cross-Device Push & Web Notification Engine
// Supports Android (Chrome/Samsung/Edge), iOS (Safari PWA), Windows, macOS, Linux

const CACHE_NAME = 'mr-radwan-sw-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push events
self.addEventListener('push', (event) => {
  let payload = {
    title: 'منصة مستر محمد رضوان 🌟',
    body: 'تنبيه جديد على المنصة',
    url: '/',
    tag: 'mr_radwan_' + Date.now(),
  };

  try {
    if (event.data) {
      const json = event.data.json();
      payload = { ...payload, ...json };
    }
  } catch (e) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    dir: 'rtl',
    lang: 'ar',
    tag: payload.tag,
    renotify: true,
    vibrate: [150, 75, 150, 75, 200],
    data: {
      url: payload.url || '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Handle notification click across all platforms (Mobile & Desktop)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open with the platform, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
