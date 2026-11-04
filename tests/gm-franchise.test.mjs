import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../gm-franchise/index.html', import.meta.url), 'utf8');
const nav = await readFile(new URL('../gm-franchise/erp-nav-integration.js', import.meta.url), 'utf8');
const root = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const inlineScript = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(inlineScript, 'inline application script must exist');
assert.doesNotThrow(() => new vm.Script(inlineScript), 'inline application script must parse');

assert.match(html, /GÜVENLİ PİLOT · CANLI FRANCHISE SİSTEMİ DEĞİLDİR/);
assert.match(html, /const E2E_STAGES=\["Başvuru".*"Aktif şube"\]/);
assert.equal((html.match(/"Başvuru","İlk temas","Ön değerlendirme","Yatırımcı sunumu","Finansal yeterlilik","Lokasyon","Due diligence","Ön onay","Sözleşme","Kurulum","Eğitim","Deneme operasyonu","Açılış kurulu","Aktif şube"/g) || []).length, 1);
assert.match(html, /Açılış öncesi tahsilat %100 doğrulandı/);
assert.match(html, /T\.C\. kimlik, banka\/finans ve sözleşme belgeleri/);
assert.match(html, /ad:"portallar"/);
assert.match(html, /td:"portallar"/);
assert.match(html, /if\(!perm\.includes\(CUR\)\)CUR=perm\[0\]\|\|"portallar"/);
assert.match(html, /İnsan Kaynakları/);
assert.match(html, /Mimari \/ Proje/);
assert.match(html, /data-e2e="activate"/);
assert.match(html, /30\/60\/90 gün görevleri oluşturuldu/);
assert.match(nav, /data-gm-franchise-link/);
assert.match(nav, /Franchise Yönetim Merkezi/);
assert.match(root, /gm-franchise\/erp-nav-integration\.js\?v=20261105/);

console.log('gm-franchise static acceptance: passed');
