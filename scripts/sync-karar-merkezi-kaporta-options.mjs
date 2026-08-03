import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const htmlPath = resolve(repoRoot, 'karar-merkezi', 'index.html');
const catalogPath = resolve(repoRoot, 'data', 'inspection_options.json');
const bodyGroupId = 'kaporta-boya-ekspertiz-ve-check-up';
const bodyCatalogPrefix = 'body_paint_checkup_';
const frontBumperPointId = '11';
const rearBumperPointId = '23';
const frontBumperTemplateLabels = [
  'Orijinal',
  'Plastik Parça',
  'Değişim',
  'Boyalı',
  'Çizik',
  'Lokal Boyalı',
  'Ezik Mevcut',
  'Göçük Mevcut',
  'Kırık',
  'Darbe-Hasar Mevcut',
  'Metal',
  'Kaplama',
];

const html = await readFile(htmlPath, 'utf8');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const sourceMatch = html.match(/(<script type="application\/json" id="source-data">)(.*?)(<\/script>)/s);

if (!sourceMatch) {
  throw new Error('source-data JSON block was not found.');
}

const source = JSON.parse(sourceMatch[2]);
const bodyGroup = source.groups?.find((group) => group.groupId === bodyGroupId);

if (!bodyGroup) {
  throw new Error(`Body/paint group was not found: ${bodyGroupId}`);
}

const optionsByPoint = new Map();
for (const option of catalog) {
  if (!String(option.itemId || '').startsWith(bodyCatalogPrefix)) continue;
  const pointId = String(option.legacyNoktaId);
  const pointOptions = optionsByPoint.get(pointId) || [];
  pointOptions.push(option);
  optionsByPoint.set(pointId, pointOptions);
}

for (const options of optionsByPoint.values()) {
  options.sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
}

harmonizeRearBumperOptions(optionsByPoint);

const report = {
  items: bodyGroup.items.length,
  previousOptions: 0,
  catalogOptions: 0,
  preservedOptionIds: 0,
  generatedOptionIds: 0,
  removedSourceOptions: 0,
};

for (const item of bodyGroup.items) {
  const pointId = String(item.noktaId);
  const catalogOptions = optionsByPoint.get(pointId);
  if (!catalogOptions?.length) {
    throw new Error(`No normalized options found for point ${pointId} (${item.title}).`);
  }

  const sourceOptions = Array.isArray(item.options) ? item.options : [];
  const usedSourceIds = new Set();
  report.previousOptions += sourceOptions.length;
  report.catalogOptions += catalogOptions.length;

  item.options = catalogOptions.map((catalogOption, index) => {
    const value = String(catalogOption.legacyOptionId);
    const label = repairMojibake(String(catalogOption.label || catalogOption.legacyLabel || '').trim());
    if (!label) {
      throw new Error(`Catalog label is empty for point ${pointId}, option ${value}.`);
    }

    const matchedSource = findSourceOption(sourceOptions, usedSourceIds, value, label, index, catalogOptions.length);
    const optionId = matchedSource?.optionId || `erp-${value}`;

    if (matchedSource) {
      usedSourceIds.add(matchedSource.optionId);
      report.preservedOptionIds += 1;
    } else {
      report.generatedOptionIds += 1;
    }

    return {
      optionId,
      value,
      label,
      unknown: false,
      optionType: matchedSource?.optionType || 'checkbox',
      sourceText: `ERP option ${value}: ${label}`,
    };
  });

  item.unresolvedOptionCount = 0;
  report.removedSourceOptions += sourceOptions.length - usedSourceIds.size;
}

const allItems = source.groups.flatMap((group) => group.items || []);
const allOptions = allItems.flatMap((item) => item.options || []);
source.stats.optionCount = allOptions.length;
source.stats.unresolvedOptionCount = allOptions.filter((option) => option.unknown || !option.label).length;

const updatedSource = JSON.stringify(source).replaceAll('</script', '<\\/script');
const updatedHtml = html.replace(sourceMatch[0], `${sourceMatch[1]}${updatedSource}${sourceMatch[3]}`);
await writeFile(htmlPath, updatedHtml, 'utf8');

process.stdout.write(`${JSON.stringify({
  ...report,
  totalOptions: source.stats.optionCount,
  unresolvedOptions: source.stats.unresolvedOptionCount,
}, null, 2)}\n`);

function findSourceOption(sourceOptions, usedSourceIds, value, label, index, catalogCount) {
  const available = (option) => option?.optionId && !usedSourceIds.has(option.optionId);
  const byValue = sourceOptions.find((option) => available(option) && String(option.value) === value);
  if (byValue) return byValue;

  const normalizedLabel = normalizeForMatch(label);
  const byLabel = sourceOptions.find((option) => {
    if (!available(option)) return false;
    return [option.label, option.value].some((candidate) => normalizeForMatch(candidate) === normalizedLabel);
  });
  if (byLabel) return byLabel;

  if (sourceOptions.length === catalogCount && available(sourceOptions[index])) {
    return sourceOptions[index];
  }

  return null;
}

function harmonizeRearBumperOptions(optionsByPoint) {
  const frontOptions = optionsByPoint.get(frontBumperPointId);
  const rearOptions = optionsByPoint.get(rearBumperPointId);
  if (!frontOptions?.length || !rearOptions?.length) return;

  const rearByLabel = new Map(
    rearOptions.map((option) => [normalizeForMatch(option.label || option.legacyLabel || ''), option]),
  );

  const alignedRearOptions = [];
  for (const expectedLabel of frontBumperTemplateLabels) {
    const rearMatch = rearByLabel.get(normalizeForMatch(expectedLabel));
    if (!rearMatch) continue;
    alignedRearOptions.push({
      ...rearMatch,
      label: expectedLabel,
      legacyLabel: expectedLabel,
    });
  }

  if (alignedRearOptions.length === frontBumperTemplateLabels.length) {
    optionsByPoint.set(rearBumperPointId, alignedRearOptions);
  }
}

function normalizeForMatch(value) {
  return repairMojibake(String(value || ''))
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function repairMojibake(value) {
  let current = value;
  for (let attempt = 0; attempt < 2 && /[ÃÂÄÅâ]/.test(current); attempt += 1) {
    const candidate = Buffer.from(current, 'latin1').toString('utf8');
    if (mojibakeScore(candidate) >= mojibakeScore(current)) break;
    current = candidate;
  }
  return current;
}

function mojibakeScore(value) {
  return (value.match(/[ÃÂÄÅâ�]/g) || []).length;
}
