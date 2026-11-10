import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../gm-franchise/index.html',import.meta.url),'utf8');
const nav=await readFile(new URL('../gm-franchise/erp-nav-integration.js',import.meta.url),'utf8');
const root=await readFile(new URL('../index.html',import.meta.url),'utf8');

test('current Franchise pilot is wired into the ERP Franchise menu',()=>{
  assert.match(html,/<script type="module">/);
  assert.match(html,/dealer-growth-engine\.mjs/);
  assert.match(html,/GÜVENLİ PİLOT · CANLI FRANCHISE SİSTEMİ DEĞİLDİR/);
  assert.match(html,/v0\.10\.0-beta\.1/);
  assert.match(html,/const E2E_STAGES=\["Başvuru".*"Aktif şube"\]/);
  assert.match(html,/\["","BUY","BAYİ BÜYÜME"\]/);
  assert.match(html,/data-growth-profile/);
  assert.match(nav,/data-gm-franchise-link/);
  assert.match(nav,/Franchise Yönetim Merkezi/);
  assert.match(nav,/title\.textContent\.trim\(\) === 'Franchise Yönetimi'/);
  assert.match(nav,/nav\.insertBefore\(node, nextGroup\)/);
  assert.match(root,/gm-franchise\/erp-nav-integration\.js\?v=20261111/);
});
