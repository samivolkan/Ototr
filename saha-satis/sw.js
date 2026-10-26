// Only public static application files. Auth/API responses are never cached here.
const OFFLINE_CACHE = 'ototr-saha-main-v2';
const shellFiles = ["./","offline.html","manifest.webmanifest","brand/icon-192.png","brand/icon-512.png","brand/icon-180.png","brand/ototr-logo.svg","assets/app-BSUNaAKu.js","assets/app-ChqVmgSm.css","assets/BranchesPage-BbdT4BCw.js","assets/browser-BQakVJvE.js","assets/browser-B_7DiHC-.js","assets/browser-Dsu8d5GH.js","assets/createReactComponent-9VDQH0-B.js","assets/customerPipeline-C3TXIujS.js","assets/CustomerPipelinePage-CBPBIj0y.js","assets/dates-DHKoqRh6.js","assets/dist-CdAJbOrv.js","assets/FeedbackCenter-CIHsbU9s.js","assets/feedbackLoader-IaLChBcb.js","assets/html2canvas-CRV6Yc1K.js","assets/index.es-BXduuHp8.js","assets/inter-latin-400-normal-C38fXH4l.woff2","assets/inter-latin-500-normal-Cerq10X2.woff2","assets/inter-latin-600-normal-LgqL8muc.woff2","assets/inter-latin-700-normal-Yt3aPRUw.woff2","assets/inter-latin-ext-400-normal-C1nco2VV.woff2","assets/inter-latin-ext-500-normal-CV4jyFjo.woff2","assets/inter-latin-ext-600-normal-D2bJ5OIk.woff2","assets/inter-latin-ext-700-normal-Ca8adRJv.woff2","assets/jsx-runtime-BHz_hoGM.js","assets/management-BHYlS4_e.js","assets/ManagementPage-CzfzPfd_.js","assets/PerformancePage-N0y45fU5.js","assets/purify.es-wSQYG3tN.js","assets/ReportPage-CAYjlkEl.css","assets/ReportPage-DUXLRjqU.js","assets/reportPdf-C-WGsuTk.js","assets/reports-BpBIHyaT.js","assets/rolldown-runtime-Bh1tDfsg.js","assets/SourceMonitor-BJj4mQhj.js","assets/typeof-B5XbjTb1.js","assets/v2Management-BU3MqhYQ.css","assets/vendor-Cl4r0BPv.js","assets/visitResults-BP1gVmUN.js"];
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
    data: { url: payload.url || self.registration.scope }
  };
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    if (windows.some(client => client.visibilityState === 'visible')) return;
    return self.registration.showNotification(title, options);
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || self.registration.scope, self.registration.scope);
  if (target.origin !== self.location.origin || !target.href.startsWith(self.registration.scope)) target.href = self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if(existing){existing.postMessage({type:'OTOTR_REVIEW_OPEN',url:target.href});return existing.focus();}
    return self.clients.openWindow(target.href);
  }));
});

