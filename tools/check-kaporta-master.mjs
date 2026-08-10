import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const target = process.argv[2] || 'OTOTR_Kaporta_Giris_MASTER_v1.html';
const source = process.argv[3] || 'OTOTR_Kaporta_Giris_NIHAI_v16_Rapor_Orjinal_Nokta_Gizli.html';
const dataFile = 'data/ototr_kaporta_master_v1.json';
const html = fs.readFileSync(target, 'utf8');
const sourceHtml = fs.readFileSync(source, 'utf8');
const failures = [];

function extractConst(document, name) {
  const match = document.match(new RegExp(`const ${name}=(.*);`, 'm'));
  if (!match) throw new Error(`${name} bulunamadi`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
scripts.forEach((script, index) => {
  try {
    new vm.Script(script, { filename: `${path.basename(target)}#script-${index + 1}` });
  } catch (error) {
    failures.push(`Script ${index + 1} syntax: ${error.message}`);
  }
});

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) failures.push(`Tekrarlanan DOM id: ${duplicateIds.join(', ')}`);

const auto = extractConst(html, 'AUTO');
const sourceAuto = extractConst(sourceHtml, 'AUTO');
const parts = extractConst(html, 'PARTS');
const images = extractConst(html, 'VIEW_IMAGES');
const sourceImages = extractConst(sourceHtml, 'VIEW_IMAGES');
const expectedViews = parts.reduce((total, part) => total + part.views.length, 0);
const sourcePolygonSha256 = sha256(JSON.stringify(sourceAuto));

if (Object.keys(auto).length !== 48) failures.push(`AUTO tanimi 48 yerine ${Object.keys(auto).length}`);
if (parts.length !== 16) failures.push(`Dis parca sayisi 16 yerine ${parts.length}`);
if (expectedViews !== 44) failures.push(`Aktif dis gorunus 44 yerine ${expectedViews}`);
if (JSON.stringify(auto) !== JSON.stringify(sourceAuto)) failures.push('MASTER AUTO poligonlari ekli v16 kaynakla ayni degil');

for (const [view, dataUrl] of Object.entries(images)) {
  if (!dataUrl.startsWith('data:image/png;base64,')) failures.push(`${view} gorseli PNG data URL degil`);
  const bytes = Buffer.from(dataUrl.split(',')[1] || '', 'base64');
  if (bytes.subarray(1, 4).toString('ascii') !== 'PNG') failures.push(`${view} gorseli gecersiz PNG`);
  if (view === 'top' && dataUrl !== sourceImages[view]) failures.push('Logo icermeyen top gorseli gereksiz degistirilmis');
  if (view !== 'top' && dataUrl === sourceImages[view]) failures.push(`${view} gorseline fiziksel logo blur uygulanmamis`);
}

const requiredTokens = [
  "const LS_MASTER='ototr_kaporta_master_v1'",
  'window.OTOTR_ERP_ADAPTER',
  'window.runKaportaSelfTest',
  'window.OTOTR_KAPORTA_MASTER_V1',
  "version:'OTOTR_KAPORTA_MASTER_V1'",
  'Raporu Yazdir / PDF'.replace('Yazdir', 'Yazdır'),
];
requiredTokens.forEach((token) => {
  if (!html.includes(token)) failures.push(`Gerekli kontrat eksik: ${token}`);
});
if (html.includes('fetch(')) failures.push('Varsayilan adapter sahte fetch/endpoint icermemeli');
if (!html.includes("const PHYSICAL_LOGO_BLUR='pillow-gaussian-feather-v1'")) failures.push('Fiziksel logo blur isareti eksik');

let data = null;
try {
  data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  if (data.schema !== 'ototr.kaporta-master.v1') failures.push('MASTER JSON schema hatali');
  if (data.counts?.controls !== 20) failures.push('MASTER JSON kontrol sayisi 20 degil');
  if (Object.keys(data.polygons || {}).length !== 44) failures.push('MASTER JSON aktif polygon sayisi 44 degil');
  if (Object.keys(data.sourcePolygonDefinitions || {}).length !== 48) failures.push('MASTER JSON kaynak tanimi 48 degil');
  if (Object.keys(data.archivedDoorInnerSourcePolygons || {}).length !== 4) failures.push('MASTER JSON kapi ici arsivi 4 degil');
  if (JSON.stringify(data.sourcePolygonDefinitions) !== JSON.stringify(auto)) failures.push('MASTER JSON kaynak polygonlari HTML ile ayni degil');
  if (data.sourcePolygonSha256 !== sourcePolygonSha256) failures.push('MASTER JSON kaynak polygon SHA-256 degeri v16 ile ayni degil');
} catch (error) {
  failures.push(`MASTER JSON okunamadi: ${error.message}`);
}

const result = {
  ok: failures.length === 0,
  target,
  scripts: scripts.length,
  domIds: ids.length,
  sourcePolygonDefinitions: Object.keys(auto).length,
  exteriorParts: parts.length,
  activeExteriorViews: expectedViews,
  sourcePolygonSha256,
  embeddedImages: Object.keys(images).length,
  dataFile,
  dataActivePolygons: Object.keys(data?.polygons || {}).length,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
