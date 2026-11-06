import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../gm-franchise/index.html', import.meta.url), 'utf8');

test('Finance and Accounting are distinct roles and departments', () => {
  assert.match(html, /<option value="fn">Finans Sorumlusu<\/option>/);
  assert.match(html, /<option value="mh">Muhasebe<\/option>/);
  assert.match(html, /fn:"Finans Sorumlusu",mh:"Muhasebe"/);
  assert.match(html, /"Finans":\[/);
  assert.match(html, /"Muhasebe":\[/);
  assert.match(html, /"Finans":"fn","Muhasebe":"mh"/);
  assert.doesNotMatch(html, /"Finans \/ Muhasebe":\[/);
});

test('Franchise Finance and HR use one accountable person per department', () => {
  assert.match(html, /<option value="fd">Franchise Sorumlusu<\/option>/);
  assert.match(html, /<option value="ik">İK Sorumlusu<\/option>/);
  assert.doesNotMatch(html, /<option value="fu">/);
  assert.match(html, /Genel Müdür ikinci onayı/);
});

test('opening gate requires Finance, Accounting and full collection', () => {
  assert.match(html, /flowDeptPct\('Finans'\)===100&&flowDeptPct\('Muhasebe'\)===100&&FLOW\.paid===100/);
  assert.match(html, /if\(s===4&&flowDeptPct\("Finans"\)<100\)/);
});

test('visible workflow has 13 departments and 39 tasks', () => {
  const block = html.match(/const E2E_TASKS=\{([\s\S]*?)\n\};/);
  assert.ok(block, 'E2E task catalog missing');
  const departments = [...block[1].matchAll(/^\s*"[^"]+":\[/gm)];
  const tasks = [...block[1].matchAll(/\["[^"]+","[^"]+","[^"]+"\]/g)];
  assert.equal(departments.length, 13);
  assert.equal(tasks.length, 13);
});
