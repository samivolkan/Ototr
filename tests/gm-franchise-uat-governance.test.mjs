import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105200000_franchise_uat_governance.sql', import.meta.url), 'utf8');
const responsibleSql = await readFile(new URL('../supabase/migrations/20261106010440_franchise_uat_responsible_signoff_catalog.sql', import.meta.url), 'utf8');
const html = await readFile(new URL('../gm-franchise/index.html', import.meta.url), 'utf8');
const uatGuide = await readFile(new URL('../docs/franchise/FRANCHISE_DEPARTMENT_UAT_SIGNOFF_2026-11-05.md', import.meta.url), 'utf8');

test('UAT catalog contains exactly sixteen governed scenarios and nine signoff roles', () => {
  const scenarios = [...sql.matchAll(/\('UAT-(\d{2})'/g)].map((x) => x[1]);
  assert.deepEqual([...new Set(scenarios)].sort(), Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0')));
  for (const role of ['Franchise Sorumlusu','Finans Sorumlusu','Hukuk/KVKK','İK Sorumlusu','Academy Sorumlusu','Operasyon/Kalite/İSG','Tedarik/Mimari/Pazarlama','ERP/Bilgi Güvenliği','Genel Müdür']) assert.match(`${sql}\n${responsibleSql}`, new RegExp(role));
});

test('UAT guide uses the canonical single-responsible signoff catalog', () => {
  for (const role of ['Franchise Sorumlusu','Finans Sorumlusu','Hukuk/KVKK','İK Sorumlusu','Academy Sorumlusu','Operasyon/Kalite/İSG','Tedarik/Mimari/Pazarlama','ERP/Bilgi Güvenliği','Genel Müdür']) assert.match(uatGuide, new RegExp(role));
  for (const legacyRole of ['Franchise Yönetimi','Finans Direktörü','İK Yöneticisi','Academy Yöneticisi','CEO/Yönetim']) assert.doesNotMatch(uatGuide, new RegExp(legacyRole));
});

test('UAT evidence and signoffs are RLS protected and independently approved', () => {
  for (const table of ['franchise_uat_scenarios','franchise_uat_results','franchise_uat_signoff_catalog','franchise_uat_signoffs']) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  assert.match(sql, /checker_id is null or checker_id<>executor_id/i);
  assert.match(sql, /unique\(release_candidate,signer_id\)/i);
  assert.match(sql, /r\.executor_id<>franchise_uat_signoffs\.signer_id/i);
  assert.match(responsibleSql, /signoff_role<>'Genel Müdür'/i);
  assert.match(sql, /count\(\*\).*?=8/is);
  assert.match(sql, /count\(distinct r\.scenario_code\).*?=16/is);
  assert.match(sql, /count\(distinct s\.signoff_role\).*?=9/is);
  assert.match(sql, /with \(security_invoker=true\)/i);
});

test('release UI exposes a working sixteen-scenario maker-checker workspace', () => {
  assert.match(html, /const UAT_SCENARIOS=\[/);
  for (let i = 1; i <= 16; i++) assert.match(html, new RegExp(`"UAT-${String(i).padStart(2, '0')}"`));
  assert.match(html, /data-uat-run/);
  assert.match(html, /data-uat-review/);
  assert.match(html, /executorId!==R\(\)\+":demo-user"/);
  assert.match(html, /gerçek departman imzası üretmez/i);
});
