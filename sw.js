// NECPL Service Worker v1.0
const CACHE_NAME = 'necpl-v1';
const OFFLINE_URL = './necpl-website.html';

// Files to cache on install
const PRECACHE_URLS = [
  './necpl-website.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Hind:wght@400;500;600&family=Oswald:wght@400;500;600;700&display=swap'
];

// ── INSTALL ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('Cache error (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Network first, cache fallback ────────
self.addEventListener('fetch', event => {
  // Skip non-GET and Firebase/external API requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseio.com')) return;
  if (event.request.url.includes('googleapis.com/identitytoolkit')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request)
          .then(cached => cached || caches.match(OFFLINE_URL));
      })
  );
});

// ── PUSH NOTIFICATIONS ───────────────────────────
self.addEventListener('push', event => {
  let data = { title: '🏏 NECPL', body: 'Koi naya update hai!' };
  try { data = event.data ? event.data.json() : data; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title || '🏏 NECPL', {
      body: data.body || '',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" fill="%231a6b2e" rx="24"/><text y="140" x="20" font-size="140">🏏</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="%231a6b2e" rx="12"/><text y="72" x="8" font-size="72">🏏</text></svg>',
      vibrate: [200, 100, 200],
      data: { url: data.url || './necpl-website.html' },
      actions: [
        { action: 'open', title: '🏏 Open NECPL' },
        { action: 'close', title: 'Close' }
      ]
    })
  );
});

// ── NOTIFICATION CLICK ───────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  const url = event.notification.data?.url || './necpl-website.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('necpl') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
