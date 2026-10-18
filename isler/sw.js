const CACHE='ototr-isler-static-v24-2';
const ROOT=new URL('./',self.location.href);
const FILES=['./','index.html','app.js','manifest.webmanifest','icon-192.png','icon-512.png','../task-merkezi-v2/js/runtime-config.js','../task-merkezi-v2/js/vendor/supabase.js'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ototr-isler-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 // Strict allowlist: never cache API/auth, exports, records or third-party requests.
 if(e.request.method!=='GET'||!FILES.includes(e.request.url))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok&&r.type!=='opaque'){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request)));
});
