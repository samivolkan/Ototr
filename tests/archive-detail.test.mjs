import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const presentation = fs.readFileSync(path.join(root, 'docs', 'rapor-arsiv-tasarim.html'), 'utf8');
const begin = html.indexOf('    function dealerArchivePointStats(');
const end = html.indexOf('    function dealerOpenReportDetail(', begin);
assert.ok(begin >= 0 && end > begin);

const groups = Array.from({ length: 6 }, (_, index) => ({
  title: `Test ${index + 1}`,
  taskTypeCode: `TEST_${index + 1}`,
  items: [
    { id: `item-${index}-a`, name: `Nokta ${index + 1} A`, options: [{ id: 'ok', label: 'Sağlam' }, { id: 'risk', label: 'Bulgu', isNegative: true }] },
    { id: `item-${index}-b`, name: `Nokta ${index + 1} B`, options: [{ id: 'ok', label: 'Sağlam' }] },
  ],
}));
const workOrder = { id: 'WO-1', reportNo: 'RP-1', plate: '34 TEST 001', vehicle: 'Test araç', status: 'Rapor_Kapandı', revisionNo: 2, auditLog: [{ action: 'Onaylandı', actor: 'Yetkili', at: '01.01.2026' }] };
const values = {};
for (const [index, group] of groups.entries()) {
  values[`WO-1|item-${index}-a`] = { optionId: index === 0 ? 'risk' : 'ok', imageUrls: index === 0 ? ['https://example.test/kanit.jpg'] : [] };
  if (index !== 1) values[`WO-1|item-${index}-b`] = { optionId: 'ok' };
}
const state = { role: 'Şube Müdürü', reportGroupKey: '' };
const sandbox = {
  URL,
  dealerReportPointValues: () => values,
  dealerReportSchemaGroups: () => groups,
  dealerReportPointKey: (workOrderId, itemId) => `${workOrderId}|${itemId}`,
  dealerReportPointOption: (item, value) => item.options.find(option => option.id === value.optionId),
  dealerReportPointTone: (item, value) => item.options.find(option => option.id === value.optionId)?.isNegative ? 'risk' : 'done',
  dealerReportGroupKey: group => group.taskTypeCode,
  dealerPortalState: () => state,
  rpEsc: value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
  icon: name => `<i>${name}</i>`,
  fmtTL: value => `${value} TL`,
};
vm.createContext(sandbox);
vm.runInContext(html.slice(begin, end), sandbox);

test('inline application scripts parse', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=|type\s*=\s*["'](?:module|text\/plain|application\/json)/i.test(attributes));
  assert.ok(scripts.length > 0);
  for (const [, , source] of scripts) new vm.Script(source);
});

test('archive links to the published standalone demo presentation', () => {
  assert.match(html, /href="\.\/docs\/rapor-arsiv-tasarim\.html" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /Tasarım Sunumu \(Demo\)/);
  assert.match(presentation, /<title>OtoTR · Ekspertiz Arşivi Tasarım Sunumu<\/title>/);
  assert.match(presentation, /demo:true/);
  assert.doesNotMatch(presentation, /<script\b[^>]*\bsrc=/i);
  const scripts = [...presentation.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0);
  for (const [, source] of scripts) new vm.Script(source);
});

test('dealer review prototype covers evidence, revisions, sharing and operational states', () => {
  assert.match(presentation, /İnceleme Öncelikleri/);
  assert.match(presentation, /rapor-arsiv-arac-ana-acilar\.webp/);
  assert.match(presentation, /rapor-arsiv-arac-ek-acilar\.webp/);
  assert.match(presentation, /rapor-arsiv-bulgu-kanitlari\.webp/);
  assert.match(presentation, /const versionChanges=/);
  assert.match(presentation, /const shareStages=/);
  for (const scenario of ['pending', 'missing-evidence', 'empty', 'unauthorized', 'service-error']) {
    assert.match(presentation, new RegExp(`id:'${scenario}'`));
  }
  for (const asset of ['rapor-arsiv-arac-ana-acilar.webp', 'rapor-arsiv-arac-ek-acilar.webp', 'rapor-arsiv-bulgu-kanitlari.webp']) {
    const file = path.join(root, 'docs', 'assets', asset);
    assert.ok(fs.statSync(file).size > 100_000, `${asset} should contain a production-quality demo image`);
  }
});

test('archive counters use stored point answers, not task completion', () => {
  assert.equal(sandbox.dealerArchivePointStats(workOrder).total, 12);
  assert.equal(sandbox.dealerArchivePointStats(workOrder).done, 11);
  const page = sandbox.dealerArchiveDetailPage(workOrder, null);
  assert.match(page, /11 \/ 12/);
  assert.match(page, /Bulgu özeti · 1/);
  assert.equal((page.match(/class="dealer-archive-test /g) || []).length, 6);
  assert.equal((page.match(/dealer-archive-test incomplete/g) || []).length, 1);
  assert.match(page, /href="https:\/\/example\.test\/kanit\.jpg"/);
  assert.doesNotMatch(page, /data-dealer-report-point-save/);
});

test('selection is independent of completion and only changes the detail panel', () => {
  state.reportGroupKey = 'TEST_2';
  const page = sandbox.dealerArchiveDetailPage(workOrder, null);
  assert.match(page, /dealer-archive-test incomplete selected/);
  assert.match(page, /2 eksik|1 eksik/);
  state.reportGroupKey = '';
});

test('legacy report does not invent work orders, answers or evidence', () => {
  const page = sandbox.dealerArchiveDetailPage(null, { id: 'OLD-1', plate: '34 OLD 001' });
  assert.match(page, /Bu rapora test sonucu bağlanmamış/);
  assert.match(page, /Bağlı veri yok/);
  assert.match(page, /Sürüm kaydı yok/);
  assert.doesNotMatch(page, /Kanıt 1/);
  assert.doesNotMatch(html, /function dealerSeedArchivedReportPointValues/);
});

test('unsafe evidence links are not emitted', () => {
  values['WO-1|item-0-a'].imageUrls = ['javascript:alert(1)'];
  const page = sandbox.dealerArchiveDetailPage(workOrder, null);
  assert.doesNotMatch(page, /href="javascript:/);
  values['WO-1|item-0-a'].imageUrls = ['https://example.test/kanit.jpg'];
});

test('archive has read-only actions and avoids fake success controls', () => {
  const page = sandbox.dealerArchiveDetailPage({ ...workOrder, paidAmount: 999999, grossPrice: 999999 }, null);
  assert.match(page, /Arşive Dön/);
  assert.match(page, /Doğrulanmış dosya ve gönderim bağlantısı yok/);
  assert.match(page, /Yetkili finans servisi bağlanmadan/);
  assert.doesNotMatch(page, /999999/);
  assert.doesNotMatch(page, /data-dealer-archive-action="(?:print|mail|whatsapp|center)"/);
});

if (process.argv.includes('--preview')) {
  const styles = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  const page = sandbox.dealerArchiveDetailPage(workOrder, null);
  fs.writeFileSync(path.join(root, 'archive-preview.html'), `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${styles}body{background:#f7f8fa}.archive-preview-wrap{max-width:1540px;margin:auto;padding:24px}</style><body><div class="archive-preview-wrap">${page}</div></body></html>`);
}
