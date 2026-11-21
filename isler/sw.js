const CACHE='ototr-isler-static-task2-v1';
const ROOT=new URL('./',self.location.href);
const FILES=['./','index.html','app/index.html','app/manifest.webmanifest','app/icon-192.png','app/icon-512.png','app/favicon.svg','manifest.webmanifest','icon-192.png','icon-512.png','../task-merkezi-v2/js/runtime-config.js','../task-merkezi-v2/js/vendor/supabase.js','../task-merkezi-v2/js/auth.js'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(FILES);const r=await fetch(new URL('app/index.html',ROOT));if(r.ok){const html=await r.text();const assets=[...html.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+)"/g)].map(m=>new URL(m[1],new URL('app/index.html',ROOT)).href);await c.addAll(assets)}})()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ototr-isler-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 // Strict allowlist: never cache API/auth, exports, records or third-party requests.
 const u=new URL(e.request.url),app=new URL('app/',ROOT);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.includes('/api/')||u.pathname.includes('/auth/')||(!FILES.includes(e.request.url)&&!(u.href.startsWith(app.href)&&u.pathname.includes('/assets/'))))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok&&r.type!=='opaque'){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request)));
});
