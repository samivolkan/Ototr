import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('finance, HR and franchise use one responsible title per department', async () => {
  const [appCore, franchise] = await Promise.all([
    readFile(new URL('assets/app-core.js', root), 'utf8'),
    readFile(new URL('gm-franchise/index.html', root), 'utf8')
  ]);

  for (const title of [
    'İnsan Kaynakları Sorumlusu',
    'Finans Sorumlusu',
    'Franchise Sorumlusu'
  ]) {
    assert.match(appCore, new RegExp(title));
  }

  for (const legacyTitle of [
    'İnsan Kaynakları Direktörü',
    'İK Direktörü',
    'Finans Direktörü',
    'Franchise Direktörü',
    'Franchise Uzmanı'
  ]) {
    assert.doesNotMatch(appCore, new RegExp(legacyTitle));
  }

  assert.match(appCore, /\{name:'Franchise Yönetimi',owner:'Franchise Sorumlusu'/);
  assert.match(appCore, /position:'Franchise Sorumlusu',department:'Franchise Yönetimi'/);
  assert.match(franchise, /Her departmanda bir aktif ana sorumlu bulunur/);
  assert.match(franchise, /Alt personel daha sonra aynı sorumlunun altına eklenir/);
});

