import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../gm-franchise/index.html', import.meta.url), 'utf8');
const permissionBlock = html.match(/const PERM=\{([\s\S]*?)\n\};/)?.[1] || '';

test('every local UAT executor and reviewer can remain on release readiness', () => {
  for (const role of ['gm', 'fd', 'hk', 'fn', 'mh', 'ik', 'ak', 'op', 'bt', 'kl', 'mm']) {
    const views = permissionBlock.match(new RegExp(`${role}:"([^"]+)"`))?.[1] || '';
    assert.match(views, /(?:^| )yayin(?: |$)/, `${role} yayın hazırlığı görünümüne erişebilmelidir`);
  }
});

test('release readiness remains fail closed for every role', () => {
  assert.match(html, /<button class="btn" disabled>Canlıya yayınla<\/button>/);
  assert.match(html, /Ekrandaki etiket tek başına yetkili değildir/);
});
