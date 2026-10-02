/* HoneyBee Service Worker — enables PWA install on Android */
const CACHE = 'honeybee-v1';
const ASSETS = [
  '/HoneyBee/',
  '/HoneyBee/index.html',
  '/HoneyBee/manifest.json',
  '/HoneyBee/favicon.svg',
  '/HoneyBee/styles/main.css',
  '/HoneyBee/styles/auth.css',
  '/HoneyBee/styles/layout.css',
  '/HoneyBee/styles/home.css',
  '/HoneyBee/styles/tasks.css',
  '/HoneyBee/styles/products.css',
  '/HoneyBee/styles/profile.css',
  '/HoneyBee/styles/modals.css',
  '/HoneyBee/styles/recharge.css',
  '/HoneyBee/js/utils.js',
  '/HoneyBee/js/email.js',
  '/HoneyBee/js/auth.js',
  '/HoneyBee/js/wallet.js',
  '/HoneyBee/js/tasks.js',
  '/HoneyBee/js/products.js',
  '/HoneyBee/js/notifications.js',
  '/HoneyBee/js/profile.js',
  '/HoneyBee/js/app.js',
  '/HoneyBee/images/icon-192.png',
  '/HoneyBee/images/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
