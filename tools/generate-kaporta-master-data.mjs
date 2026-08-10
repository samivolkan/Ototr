import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const masterFile = 'OTOTR_Kaporta_Giris_MASTER_v1.html';
const sourceFile = 'OTOTR_Kaporta_Giris_NIHAI_v16_Rapor_Orjinal_Nokta_Gizli.html';
const outputFile = 'data/ototr_kaporta_master_v1.json';
const masterHtml = fs.readFileSync(masterFile, 'utf8');
const sourceHtml = fs.readFileSync(sourceFile, 'utf8');

function extractConst(document, name) {
  const match = document.match(new RegExp(`const ${name}=(.*);`, 'm'));
  if (!match) throw new Error(`${name} not found`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null), { timeout: 1000 });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const viewMeta = extractConst(masterHtml, 'VIEW_META');
const sourceDefinitions = extractConst(masterHtml, 'AUTO');
const sourceAuto = extractConst(sourceHtml, 'AUTO');
const exteriorParts = extractConst(masterHtml, 'PARTS');
if (JSON.stringify(sourceDefinitions) !== JSON.stringify(sourceAuto)) {
  throw new Error('MASTER polygons do not match the v16 source');
}

const doorInnerParts = [
  { id: 'lr_door_inner', no: 24, name: 'Sol Arka Kapı İçi', group: 'doorInner', views: [] },
  { id: 'rr_door_inner', no: 31, name: 'Sağ Arka Kapı İçi', group: 'doorInner', views: [] },
  { id: 'rf_door_inner', no: 54, name: 'Sağ Ön Kapı İçi', group: 'doorInner', views: [] },
  { id: 'lf_door_inner', no: 56, name: 'Sol Ön Kapı İçi', group: 'doorInner', views: [] },
];
const partMap = Object.fromEntries(exteriorParts.map((part) => [part.id, part]));
const doorInnerIds = new Set(doorInnerParts.map((part) => part.id));
const polygons = {};
const archivedDoorInnerSourcePolygons = {};

for (const [polygonKey, percentages] of Object.entries(sourceDefinitions)) {
  const [partId, view] = polygonKey.split('__');
  if (doorInnerIds.has(partId)) {
    archivedDoorInnerSourcePolygons[polygonKey] = percentages;
    continue;
  }
  const part = partMap[partId];
  const meta = viewMeta[view];
  if (!part || !meta || !part.views.includes(view)) continue;
  polygons[polygonKey] = {
    partId,
    partNo: part.no,
    partName: part.name,
    view,
    points: percentages.map(([x, y]) => ({
      x: Number((meta.w * x / 100).toFixed(1)),
      y: Number((meta.h * y / 100).toFixed(1)),
    })),
    source: 'source-v16',
    sourceRank: 1,
  };
}

const statusOptions = [
  { id: 'unchecked', label: 'Kontrol Edilmedi' },
  { id: 'original', label: 'Orjinal' },
  { id: 'local', label: 'Lokal Boya' },
  { id: 'painted', label: 'Boyalı' },
  { id: 'changed', label: 'Değişen' },
  { id: 'plastic', label: 'Plastik' },
  { id: 'removefit', label: 'Sök-Tak' },
  { id: 'processed', label: 'İşlemli' },
];

const output = {
  schema: 'ototr.kaporta-master.v1',
  version: '1.0',
  masterFile,
  masterSha256: sha256(masterHtml),
  sourceFile,
  sourceSha256: sha256(sourceHtml),
  sourcePolygonSha256: sha256(JSON.stringify(sourceDefinitions)),
  generatedAt: new Date().toISOString(),
  counts: {
    controls: exteriorParts.length + doorInnerParts.length,
    exteriorParts: exteriorParts.length,
    doorInnerControls: doorInnerParts.length,
    sourcePolygonDefinitions: Object.keys(sourceDefinitions).length,
    activePolygons: Object.keys(polygons).length,
    archivedDoorInnerSourcePolygons: Object.keys(archivedDoorInnerSourcePolygons).length,
  },
  polygonPriority: ['manual', 'imported-json', 'legacy-storage', 'source-v16'],
  viewMeta,
  statusOptions,
  exteriorParts,
  doorInnerParts,
  polygons,
  sourcePolygonDefinitions: sourceDefinitions,
  archivedDoorInnerSourcePolygons,
  erpContract: {
    adapter: 'window.OTOTR_ERP_ADAPTER',
    methods: ['loadInspection(inspectionId)', 'saveInspection(payload)'],
    defaultPersistence: 'localStorage:ototr_kaporta_master_v1',
  },
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ outputFile, ...output.counts }, null, 2));
