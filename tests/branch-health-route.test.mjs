import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../assets/app-core.js',import.meta.url),'utf8');
test('branch health demo has an independent ERP navigation route and page',()=>{
  assert.match(src,/\['branch-health','Şube Sağlık & Erken Uyarı','activity'\]/);
  assert.match(src,/pageShell\('branch-health', BranchHealthDemoPage\(\)\)/);
  assert.match(src,/data-route="branch-health">Ayrı ekrana git/);
  assert.match(src,/DEMO TASARIM:/);
});
