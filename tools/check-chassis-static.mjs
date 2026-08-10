import fs from 'node:fs';
import vm from 'node:vm';

const file = process.argv[2] || 'crm-kaporta-sasi-ekrani-v38.html';
const html = fs.readFileSync(file, 'utf8');
const failures = [];
const warnings = [];

const dataMatch = html.match(/<script id="point-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!dataMatch) throw new Error('point-data bulunamadi');
const data = JSON.parse(dataMatch[1]);
const points = data.points || [];

if (points.length !== 22) failures.push(`Nokta sayisi 22 yerine ${points.length}`);
for (const field of ['no', 'itemId', 'noktaId']) {
  const values = points.map((point) => String(point[field]));
  if (new Set(values).size !== values.length) failures.push(`Tekrarlanan ${field}`);
}

const distribution = data.navigationDistribution || {};
const distributed = Object.values(distribution).flat();
if (distributed.length !== 22 || new Set(distributed).size !== 22) failures.push('Gorunum dagilimi 22 benzersiz noktayi kapsamiyor');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) failures.push(`Tekrarlanan DOM id: ${duplicateIds.join(', ')}`);

const scripts = [...html.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
scripts.forEach((script, index) => {
  try {
    new vm.Script(script, { filename: `${file}#script-${index + 1}` });
  } catch (error) {
    failures.push(`Script ${index + 1} syntax: ${error.message}`);
  }
});

for (const token of ['getChassis', 'putChassisPoint', 'postEvidence', 'completeChassis', 'window.OTOTRERPChassisAdapter']) {
  if (!html.includes(token)) failures.push(`ERP kontrati eksik: ${token}`);
}

const completeStart = html.indexOf('async function erpCompleteCurrentChassis');
const completeEnd = html.indexOf('async function erpHydrateFromBackend', completeStart);
const completeBody = completeStart >= 0 && completeEnd > completeStart ? html.slice(completeStart, completeEnd) : '';
if (!completeBody.includes("error.code='CHASSIS_INCOMPLETE'") || !completeBody.includes('!complete(point.no)')) {
  failures.push('Manuel completeChassis cagrisi tamamlanma kapisi kullanmiyor');
}

const modeStart = html.indexOf('function setChassisMode');
const modeEnd = html.indexOf('function printReport', modeStart);
const modeBody = modeStart >= 0 && modeEnd > modeStart ? html.slice(modeStart, modeEnd) : '';
if (!modeBody.includes("nextMode==='report'") || !modeBody.includes('!complete(point.no)')) {
  failures.push('Eksik noktalarla musteri raporu moduna gecis engellenmiyor');
}
if (!html.includes("const LS_MASTER='ototr_kaporta_master_v1'")) warnings.push('P1: Kaporta ve sasi depolama/adapter kontratlari ortak bir inspection envelope kullanmiyor');
if (!html.includes('runChassisSelfTest')) warnings.push('P1: runChassisSelfTest otomatik QA fonksiyonu bulunmuyor');

const result = {
  ok: failures.length === 0,
  file,
  scripts: scripts.length,
  domIds: ids.length,
  points: points.length,
  distribution: Object.fromEntries(Object.entries(distribution).map(([view, values]) => [view, values.length])),
  failures,
  warnings,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
