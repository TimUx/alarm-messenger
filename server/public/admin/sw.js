/* Admin PWA — minimal service worker (installability + precached static assets) */
const CACHE = 'alarm-admin-pwa-v1';
const PRECACHE_URLS = [
  '/admin/manifest.webmanifest',
  '/admin/styles.css',
  '/admin/theme.js',
  '/admin/pwa-register.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
