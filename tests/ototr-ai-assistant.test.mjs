import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html,js,css]=await Promise.all([
  readFile(new URL('../index.html',import.meta.url),'utf8'),
  readFile(new URL('../assets/ototr-ai-assistant.js',import.meta.url),'utf8'),
  readFile(new URL('../assets/ototr-ai-assistant.css',import.meta.url),'utf8')
]);

assert.match(html,/ototr-ai-assistant\.css\?v=1/);
assert.match(html,/ototr-ai-assistant\.js\?v=1/);
assert.match(js,/OTOTR AI Yönetim Asistanı/);
assert.match(js,/AI karar destek amaçlıdır/);
assert.match(js,/window\.OTOTR_AI_CONFIG/);
assert.match(js,/İnsan onayı olmadan işlem yapmam/);
assert.doesNotMatch(js,/(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z]{20,})/);
assert.match(css,/\.ototr-ai-panel/);
assert.match(css,/@media\(max-width:720px\)/);

console.log('OTOTR AI assistant static checks passed.');
