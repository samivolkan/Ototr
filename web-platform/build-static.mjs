import {mkdir,writeFile,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const target=resolve(process.argv[2]);
const base=process.env.WEB_RENDER_BASE||'http://127.0.0.1:8878';
const sitemapResponse=await fetch(base+'/web/sitemap.xml');
assert.equal(sitemapResponse.status,200);
const sitemap=await sitemapResponse.text();
const routes=[...new Set([...sitemap.matchAll(/<loc>https:\/\/oto-tr.com\/web\/([^<]*)<\/loc>/g)].map(m=>m[1]).concat(['randevu','gizlilik']))];
assert.ok(routes.some(route=>route.startsWith('subeler/')),'Published branch content must be available before build');
await mkdir(target,{recursive:true});
for(const route of routes){const response=await fetch(base+'/web/'+route);assert.equal(response.status,200,route);const html=await response.text();assert.match(html,/<h1[ >]/);const destination=resolve(target,route?route+'.html':'index.html');assert.ok(destination.startsWith(target));await mkdir(dirname(destination),{recursive:true});await writeFile(destination,html);}
await cp(new URL('../web/assets/',import.meta.url),target+'/assets',{recursive:true});
await writeFile(target+'/sitemap.xml',sitemap);
await cp(new URL('./static-web.config',import.meta.url),target+'/web.config');
await writeFile(target+'/publication.json',JSON.stringify({builtAt:new Date().toISOString(),mode:'offline-demo',pages:routes.length,contentUpdates:'Phase 1 demo only. No API calls or real submissions.'},null,2));
console.log('Built '+routes.length+' pages in '+target);
