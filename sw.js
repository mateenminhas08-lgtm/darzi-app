const CACHE = 'darzi-dukaan-shell-v1';
const SHELL = ['/', '/index.html', '/assets/app.js', '/assets/style.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/fonts/dm-sans-latin-400-normal.woff2', '/fonts/dm-sans-latin-500-normal.woff2', '/fonts/dm-sans-latin-600-normal.woff2', '/fonts/dm-sans-latin-700-normal.woff2', '/fonts/dm-serif-display-latin-400-normal.woff2'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('darzi-dukaan-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put('/index.html', response.clone()));
      return response;
    }).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
