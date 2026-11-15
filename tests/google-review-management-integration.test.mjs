import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../google-review-management.html', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../assets/google-review-management-bridge.js', import.meta.url), 'utf8');
const commandCenter = await readFile(new URL('../assets/google-review-command-center.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../assets/google-review-command-center.css', import.meta.url), 'utf8');

test('DeepSeek management UI is mounted inside the existing ERP review route', () => {
  assert.match(commandCenter, /google-review-management\.html\?embedded=1/);
  assert.doesNotMatch(bridge, /parentApi\.setCenterView|ai\.openItem/);
  assert.match(css, /\.google-management-frame/);
});

test('production scope is one live branch and two explicitly demo branches', () => {
  assert.match(bridge, /1 Canlı · 2 Demo/);
  assert.match(html, /live: i===0/);
  assert.match(html, /demo: i===1 \|\| i===2/);
  assert.match(bridge, /branch-google-nilufer/);
  assert.match(bridge, /Kocaeli Gebze/);
  assert.match(bridge, /Bursa İnegöl/);
  assert.match(bridge, /Demo veri · dış gönderim kapalı/);
});

test('live sync and publish actions delegate to the established secure ERP workflow', () => {
  assert.match(bridge, /syncGoogleReviewsForBranch/);
  assert.match(bridge, /ai\.manageReview/);
  assert.match(bridge, /fetchGoogleReviews/);
  assert.doesNotMatch(bridge, /access_token|service_role|api[_-]?key/i);
});

test('audit CSV treats untrusted spreadsheet formulas as text and preserves numeric values', () => {
  const source=html.slice(html.indexOf('function downloadCSV('),html.indexOf('function exportPerformance('));
  let output='';
  vm.runInNewContext(source+";downloadCSV('audit.csv',testRows);",{
    testRows:[['=HYPERLINK("x")',' +SUM(1,2)','@cmd',-12,'Türkçe\r\nsatır']],
    Blob:class{constructor(parts){output=parts.join('');}},document:{createElement:()=>({click(){}})},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout(){},toast(){}
  });
  assert.match(output,/'=HYPERLINK/);
  assert.match(output,/' \+SUM/);
  assert.match(output,/'@cmd,-12/);
  assert.match(output,/"Türkçe\r\nsatır"/);
});

test('Escape closes through the approval-aware modal function', () => {
  assert.match(html,/\$\$\("\.mbd\.on"\)\.forEach\(m => closeModal\(m\.id\)\)/);
  assert.match(bridge,/if\(id==='emailModal'\)\{pendingApproval=null;lockEditing\(\);\}/);
});
