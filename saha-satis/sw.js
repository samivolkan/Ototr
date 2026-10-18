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
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    return existing ? existing.focus() : self.clients.openWindow(target.href);
  }));
});
