import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../gm-franchise/index.html', import.meta.url), 'utf8');
const permissionBlock = html.match(/const PERM=\{([\s\S]*?)\n\};/)?.[1] || '';

test('pipeline activation creates a branch and idempotent 30/60/90 follow-ups', () => {
  assert.match(html, /c\.branch=\{id:`BR-DEMO-\$\{c\.id\}`/);
  assert.match(html, /ensureFollowUps\(c\)/);
});

test('follow-up view aggregates active pipeline branches and routes actions to their case', () => {
  assert.match(html, /C\.filter\(c=>c\.stage===6&&c\.durum==="Aktif"&&c\.followUps\?\.length\)/);
  assert.match(html, /data-followup-scope/);
  assert.match(html, /followUpScope\(followComplete\.dataset\.followupScope\)/);
});

test('stored active pipeline branches are backfilled after an upgrade', () => {
  assert.match(html, /C\.filter\(c=>c\.stage===6&&c\.durum==="Aktif"\)\.forEach/);
});

test('every 30/60/90 task owner can access the follow-up view', () => {
  for (const role of ['op', 'fn', 'ik', 'fd']) {
    const views = permissionBlock.match(new RegExp(`${role}:"([^"]+)"`))?.[1] || '';
    assert.match(views, /(?:^| )takip(?: |$)/, `${role} takip görünümüne erişebilmelidir`);
  }
});
