import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('panelin zorunlu ekranları ve güvenlik metinleri bulunur', async () => {
  const html = await fs.readFile(path.join(directory, 'index.html'), 'utf8');
  for (const id of ['view-dashboard', 'view-rules', 'view-review', 'view-lookup', 'view-system', 'review-dialog']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /Plaka kazalı araca ait/);
  assert.match(html, /Alıcıya gösterim yetkisi/);
  assert.match(html, /X Bearer Token yalnız sunucudaki/);
});

test('tarayıcı kodu anahtar veya gizli bilgi içermez', async () => {
  const app = await fs.readFile(path.join(directory, 'app.js'), 'utf8');
  assert.doesNotMatch(app, /Bearer\s+[A-Za-z0-9%._-]{20,}/);
  assert.doesNotMatch(app, /X_BEARER_TOKEN\s*=\s*[^'"\s]+/);
  assert.match(app, /exactMatch/);
});
