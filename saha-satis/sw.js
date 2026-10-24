// Only public static application files. Auth/API responses are never cached here.
const OFFLINE_CACHE = 'ototr-saha-shell-v2';
const shellFiles = /*PRECACHE*/[];
const offlineUrl = new URL('offline.html', self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.addAll(shellFiles.length?shellFiles.map(p=>new URL(p,self.registration.scope).href):[offlineUrl])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope)) return;
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match(self.registration.scope)) || (await caches.match(offlineUrl)) || new Response('İlk giriş için internet gerekli', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
  else if(url.pathname.includes('/assets/')||url.pathname.includes('/brand/'))event.respondWith(caches.match(url.href,{ignoreVary:true}).then(cached=>cached||fetch(event.request)));
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = payload.title || 'OTOTR Saha Satış';
  const options = {
    body: payload.body || 'Saha planınızı kontrol edin.',
    icon: new URL('brand/ototr-saha-icon.svg', self.registration.scope).href,
    badge: new URL('brand/ototr-saha-icon.svg', self.registration.scope).href,
    tag: payload.tag || 'ototr-saha-reminder',
    renotify: false,
    data: { url: self.registration.scope }
  };
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    if (windows.some(client => client.visibilityState === 'visible')) return;
    return self.registration.showNotification(title, options);
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || self.registration.scope, self.registration.scope);
  if (target.origin !== self.location.origin) target.href = self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    return existing ? existing.focus() : self.clients.openWindow(target.href);
  }));
});

