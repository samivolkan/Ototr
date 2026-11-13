import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const [index,core,moduleSource,css]=await Promise.all([
  readFile(new URL('index.html',root),'utf8'),readFile(new URL('assets/app-core.js',root),'utf8'),
  readFile(new URL('assets/erp-arge-center.js',root),'utf8'),readFile(new URL('assets/erp-arge-center.css',root),'utf8')
]);

test('ERP navigation registers the ARGE main section and route',()=>{
  assert.match(core,/\['ERP ARGE', \[\['erp-arge','ARGE Merkezi','flask-conical'\]\]\]/);
  assert.match(core,/'erp-arge':'ERP ARGE'/);
  assert.match(core,/pageShell\('erp-arge', window\.OTOTR_ERP_ARGE/);
  assert.match(index,/assets\/erp-arge-center\.css\?v=20261113-2/);
  assert.match(index,/assets\/erp-arge-center\.js\?v=20261113-2/);
  assert.match(core,/const sideArgeItems = \(window\.OTOTR_ERP_ARGE\?\.modules\|\|\[\]\)\.map\(module=>/);
  assert.match(core,/data-nav-route="\$\{window\.OTOTR_ERP_ARGE\.routeFor\(module\)\}"/);
  assert.match(core,/if\(id==='erp-arge'\) return `<div class="nav-node has-sub">/);
  assert.doesNotMatch(core,/data-arge-external/);
});

test('ARGE catalog exposes only two verified owner-only sandbox links',()=>{
  const context={window:{},Object,Array,String};
  vm.runInNewContext(moduleSource,context,{filename:'erp-arge-center.js'});
  const catalog=context.window.OTOTR_ERP_ARGE.modules;
  assert.equal(catalog.length,10);
  const linked=catalog.filter(module=>module.url);
  assert.equal(linked.length,2);
  assert.deepEqual(Array.from(linked,module=>module.id),['arge-01','arge-02']);
  assert.ok(linked.every(module=>module.security.includes('Owner-only')));
  assert.ok(catalog.slice(2).every(module=>module.url===null&&module.tests==='Başlatılmadı'));
});

test('all ten ARGE modules have stable deep links and detail pages',()=>{
  const context={window:{},Object,Array,String};
  vm.runInNewContext(moduleSource,context,{filename:'erp-arge-center.js'});
  const api=context.window.OTOTR_ERP_ARGE;
  const routes=api.modules.map(module=>api.routeFor(module));
  assert.equal(routes.length,10);
  assert.equal(new Set(routes).size,10);
  routes.forEach((route,index)=>{
    const id=`arge-${String(index+1).padStart(2,'0')}`;
    assert.equal(api.parseRoute(route),id);
    assert.match(api.page(id),new RegExp(`data-arge-detail="${id}"`));
  });
  assert.match(api.page('arge-01'),/Denemeyi Aç/);
  assert.match(api.page('arge-02'),/Denemeyi Aç/);
  assert.match(api.page('arge-03'),/Canlı deneme henüz açılmadı/);
  assert.doesNotMatch(api.page('arge-03'),/target="_blank"/);
});

test('rendered center states privacy and production gates without write actions',()=>{
  const context={window:{},Object,Array,String};
  vm.runInNewContext(moduleSource,context,{filename:'erp-arge-center.js'});
  const html=context.window.OTOTR_ERP_ARGE.page();
  assert.match(html,/Yetkisiz kullanıcılar dış sandbox içeriğine erişemez/);
  assert.match(html,/gerçek ERP verisi, dış mesaj ve rapor kapatma işlemi tetiklemez/);
  assert.match(html,/NO-GO/);
  assert.equal((html.match(/target="_blank"/g)||[]).length,2);
  assert.equal((html.match(/aria-disabled="true"/g)||[]).length,8);
  assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|postMessage\(/);
  assert.match(css,/\.arge-grid/);
  assert.match(css,/\.arge-detail-grid/);
  assert.match(css,/@media\(max-width:520px\).*\.arge-detail-head/s);
});
