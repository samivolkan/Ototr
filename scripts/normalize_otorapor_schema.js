const fs = require('fs');
const path = require('path');

const sourcePath = process.argv[2];

if (!sourcePath) {
  console.error(
    'Usage: node scripts/normalize_otorapor_schema.js <otorapor_json_path>',
  );
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const docsDir = path.join(rootDir, 'docs');
const generatedDir = path.join(rootDir, 'lib', 'data', 'generated');

for (const dir of [dataDir, docsDir, generatedDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const raw = JSON.parse(fs.readFileSync(path.resolve(sourcePath), 'utf8'));
const rawItems = Array.isArray(raw.maddeler) ? raw.maddeler : [];

const groupDefinitions = {
  'İŞ EMRİ / ARAÇ KABUL FORMU': {
    id: 'work_order_acceptance',
    code: 'WORK_ORDER_ACCEPTANCE',
    name: 'İş Emri / Araç Kabul',
    icon: 'clipboard',
    color: '#64748B',
  },
  'ARAÇ DOSYA EKSPERTİZ RAPORU': {
    id: 'vehicle_file_check',
    code: 'VEHICLE_FILE_CHECK',
    name: 'Araç Dosya Ekspertizi',
    icon: 'folder-check',
    color: '#0F766E',
  },
  'MOTOR EKSPERTİZ VE CHECK-UP': {
    id: 'motor_checkup',
    code: 'MOTOR_CHECKUP',
    name: 'Motor Ekspertiz ve Check-up',
    icon: 'engine',
    color: '#2563EB',
  },
  'ALT / ÖN / MEKANİK EKSPERTİZ ve CHECK-UP': {
    id: 'mechanical_checkup',
    code: 'MECHANICAL_CHECKUP',
    name: 'Alt / Ön / Mekanik Ekspertiz',
    icon: 'wrench',
    color: '#475569',
  },
  'KAPORTA - BOYA EKSPERTİZ VE CHECK-UP': {
    id: 'body_paint_checkup',
    code: 'BODY_PAINT_CHECKUP',
    name: 'Kaporta ve Boya Ekspertizi',
    icon: 'car-front',
    color: '#DC2626',
  },
  'OBD/BEYİN TEST': {
    id: 'obd_ecu_test',
    code: 'OBD_ECU_TEST',
    name: 'OBD / Beyin Testi',
    icon: 'cpu',
    color: '#7C3AED',
  },
  'FREN / SÜSPANSİYON TESTİ': {
    id: 'brake_suspension_test',
    code: 'BRAKE_SUSPENSION_TEST',
    name: 'Fren / Süspansiyon Testi',
    icon: 'gauge',
    color: '#EA580C',
  },
  'DYNO/ YOL TESTİ': {
    id: 'dyno_road_test',
    code: 'DYNO_ROAD_TEST',
    name: 'Dyno / Yol Testi',
    icon: 'route',
    color: '#0891B2',
  },
  'GENEL KONDİSYON / DIŞ EKSPERTİZ VE CHECK-UP': {
    id: 'exterior_condition',
    code: 'EXTERIOR_CONDITION',
    name: 'Genel Kondisyon / Dış Ekspertiz',
    icon: 'scan-search',
    color: '#16A34A',
  },
  'İÇ EKSPERTİZ VE CHECK-UP': {
    id: 'interior_checkup',
    code: 'INTERIOR_CHECKUP',
    name: 'İç Ekspertiz',
    icon: 'armchair',
    color: '#9333EA',
  },
  'Airbag (Hava Yastıkları) Kontrol Testi': {
    id: 'airbag_check',
    code: 'AIRBAG_CHECK',
    name: 'Airbag Kontrol Testi',
    icon: 'shield-alert',
    color: '#BE123C',
  },
  'CONTA KAÇAK TESTİ': {
    id: 'head_gasket_leak_test',
    code: 'HEAD_GASKET_LEAK_TEST',
    name: 'Conta Kaçak Testi',
    icon: 'droplets',
    color: '#0E7490',
  },
};

const groupOrder = Object.keys(groupDefinitions);

const requiredMediaKeywords = [
  'Karalama Kağıdı',
  'Araç Alt Ön Kısım Fotoğrafı',
  'Araç Alt Orta Kısım Fotoğrafı',
  'Araç Alt Arka Kısım Fotoğrafı',
  'OBD Test Çıktısı Görseli',
  'Araca Ait Anlık Fren/Süspansiyon Test Çıktısı',
  'Araca Ait Anlık Dinamometre Ölçüm Çıktısı',
  'Araç Satıcısı/Vekili İzin Formu Fotoğrafı',
  'Araçta Noktasal Ezik-Çizik Mevcut mu? Fotoğraf',
];

function normalizeText(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\bSAĞ\b/g, 'Sağ')
    .replace(/\bSOL\b/g, 'Sol')
    .replace(/\bÖN\b/g, 'Ön')
    .replace(/\bARKA\b/g, 'Arka')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTurkish(value) {
  return value
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u');
}

function slug(value, fallback) {
  const base = stripTurkish(normalizeText(value))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 82);
  return base || fallback;
}

function jsString(value) {
  return JSON.stringify(String(value ?? ''));
}

function dartString(value) {
  return JSON.stringify(String(value ?? ''));
}

function sqlString(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function hasRequiredMedia(name) {
  return requiredMediaKeywords.some((keyword) =>
    normalizeText(name).toLocaleLowerCase('tr-TR').includes(
      keyword.toLocaleLowerCase('tr-TR'),
    ),
  );
}

function classifyRiskCategory(groupCode, itemName) {
  const lower = normalizeText(itemName).toLocaleLowerCase('tr-TR');
  if (/vergi|rehin|ruhsat|ceza|haciz/.test(lower)) return 'legal_financial';
  if (/tramer|hasar|ağır hasar|kaza/.test(lower)) return 'accident_damage';
  if (/km|kilometre/.test(lower)) return 'mileage';
  if (/airbag|hava yast|srs|emniyet kemer/.test(lower)) return 'airbag_safety';
  if (/obd|beyin|elektronik|abs|esp|motor ışığı/.test(lower)) return 'electronic';
  if (/foto|resim|görsel|çıktı/.test(lower)) return 'media';
  if (/lastik|fren|süspansiyon/.test(lower)) return 'brake_suspension';
  if (/kaporta|boya|çamurluk|kapı|tavan|kaput|panel|şasi/.test(lower)) {
    return 'body_paint';
  }
  if (/motor|turbo|yağ|radyatör|conta|egzoz|antifriz/.test(lower)) {
    return 'engine';
  }
  if (/şanzıman|debriyaj|diferansiyel|aks|rot|amortisör/.test(lower)) {
    return 'mechanical';
  }
  if (groupCode === 'INTERIOR_CHECKUP') return 'interior';
  if (groupCode === 'EXTERIOR_CONDITION') return 'exterior';
  return 'document';
}

function categoryFromGroup(groupCode) {
  return {
    WORK_ORDER_ACCEPTANCE: 'acceptance',
    VEHICLE_FILE_CHECK: 'file_check',
    MOTOR_CHECKUP: 'engine',
    MECHANICAL_CHECKUP: 'mechanical',
    BODY_PAINT_CHECKUP: 'body_paint',
    OBD_ECU_TEST: 'electronic',
    BRAKE_SUSPENSION_TEST: 'brake_suspension',
    DYNO_ROAD_TEST: 'road_test',
    EXTERIOR_CONDITION: 'exterior',
    INTERIOR_CHECKUP: 'interior',
    AIRBAG_CHECK: 'airbag_safety',
    HEAD_GASKET_LEAK_TEST: 'engine',
  }[groupCode] || 'general';
}

function inputTypeFor(item, requiresMedia) {
  const options = Array.isArray(item.secenekler) ? item.secenekler : [];
  const inputs = Array.isArray(item.inputAlanlari) ? item.inputAlanlari : [];
  const hasRadio = options.some((opt) => String(opt.inputName || '') === 'Noktaradio');
  const hasCheckbox = inputs.some(
    (input) =>
      String(input.type || '').toLowerCase() === 'checkbox' ||
      String(input.name || '') === 'Noktacheckbox',
  );
  const hasField = inputs.some((input) =>
    ['text', 'number', 'date', 'tel', 'email'].includes(
      String(input.type || '').toLowerCase(),
    ),
  );
  const hasImage = Array.isArray(item.resimAlanlari) && item.resimAlanlari.length > 0;
  const name = normalizeText(item.maddeAdi);
  const documentLike = /çıktı|obd|dinamometre|fren\/süspansiyon|belge/i.test(name);

  if (requiresMedia && documentLike) return 'document_or_image';
  if (requiresMedia && !hasRadio && !hasCheckbox && !hasField) return 'media';
  if (hasRadio && hasField) return 'radio_with_field';
  if (hasCheckbox && hasField) return 'checkbox_with_field';
  if (hasRadio) return 'radio';
  if (hasCheckbox) return 'checkbox';
  if (hasField) return 'field';
  if (hasImage) return 'note';
  return 'note';
}

function optionSeverity(option, itemName) {
  const label = normalizeText(option.label || option.secenekAdi || option.value);
  const className = String(option.className || option.class || '');
  let severity = 'neutral';
  let color = 'gray';
  let scoreImpact = 0;
  let isNegative = false;
  let requiresDescription = false;

  if (className.includes('renk-yesil')) {
    severity = 'good';
    color = 'green';
    scoreImpact = 1;
  } else if (className.includes('renk-kirmizi')) {
    severity = 'critical';
    color = 'red';
    scoreImpact = -1;
    isNegative = true;
    requiresDescription = true;
  } else if (className.includes('renk-turuncu')) {
    severity = 'warning';
    color = 'orange';
    isNegative = true;
    requiresDescription = true;
  }

  const context = normalizeText(itemName).toLocaleLowerCase('tr-TR');
  const value = label.toLocaleLowerCase('tr-TR');
  const criticalVarContexts = ['vergi borcu', 'ağır hasar', 'rehinli', 'haciz'];
  if (criticalVarContexts.some((text) => context.includes(text))) {
    if (['var', 'evet'].includes(value)) {
      severity = 'critical';
      color = 'red';
      scoreImpact = -1;
      isNegative = true;
      requiresDescription = true;
    }
    if (['yok', 'hayır', 'hayir'].includes(value)) {
      severity = 'good';
      color = 'green';
      scoreImpact = 1;
      isNegative = false;
    }
  }
  if (context.includes('yedek anahtar')) {
    if (value === 'var') {
      severity = 'good';
      color = 'green';
      scoreImpact = 1;
      isNegative = false;
    }
    if (value === 'yok') {
      severity = 'warning';
      color = 'orange';
      isNegative = true;
      requiresDescription = true;
    }
  }
  if (context.includes('tramer') && value === 'var') {
    severity = 'warning';
    color = 'orange';
    isNegative = true;
    requiresDescription = true;
  }
  return { label, severity, color, scoreImpact, isNegative, requiresDescription };
}

function packageAvailabilityFor(groupCode) {
  const standard = [
    'BODY_PAINT_CHECKUP',
    'MOTOR_CHECKUP',
    'MECHANICAL_CHECKUP',
    'BRAKE_SUSPENSION_TEST',
  ].includes(groupCode);
  const mini = ['MOTOR_CHECKUP', 'MECHANICAL_CHECKUP', 'BRAKE_SUSPENSION_TEST'].includes(
    groupCode,
  );
  const esnaf = [
    'BODY_PAINT_CHECKUP',
    'MOTOR_CHECKUP',
    'MECHANICAL_CHECKUP',
    'OBD_ECU_TEST',
  ].includes(groupCode);
  return {
    mini,
    esnaf,
    standard,
    full: true,
    premium: true,
    corporate: true,
    kaportaBoya: ['BODY_PAINT_CHECKUP', 'EXTERIOR_CONDITION'].includes(groupCode),
    mekanik: [
      'MOTOR_CHECKUP',
      'MECHANICAL_CHECKUP',
      'BRAKE_SUSPENSION_TEST',
      'HEAD_GASKET_LEAK_TEST',
    ].includes(groupCode),
    hizliKontrol: ['EXTERIOR_CONDITION', 'MOTOR_CHECKUP', 'BRAKE_SUSPENSION_TEST'].includes(
      groupCode,
    ),
  };
}

function estimatedSeconds(groupCode, inputType) {
  if (inputType === 'media') return 35;
  if (inputType === 'document_or_image') return 120;
  if (groupCode === 'BODY_PAINT_CHECKUP') return 45;
  if (groupCode === 'MOTOR_CHECKUP' || groupCode === 'MECHANICAL_CHECKUP') return 70;
  if (groupCode === 'OBD_ECU_TEST' || groupCode === 'DYNO_ROAD_TEST') return 100;
  return 40;
}

const seenGroupNames = [...new Set(rawItems.map((item) => item.grupAdi))];
const inspectionGroups = seenGroupNames.map((legacyName, index) => {
  const definition = groupDefinitions[legacyName] || {
    id: slug(legacyName, `group_${index + 1}`),
    code: slug(legacyName, `group_${index + 1}`).toUpperCase(),
    name: normalizeText(legacyName),
    icon: 'list-checks',
    color: '#64748B',
  };
  return {
    id: definition.id,
    legacyName,
    name: definition.name,
    displayName: definition.name,
    code: definition.code,
    sortOrder: groupOrder.includes(legacyName) ? groupOrder.indexOf(legacyName) + 1 : index + 1,
    isActive: true,
    description: '',
    icon: definition.icon,
    color: definition.color,
  };
});

const groupByLegacyName = new Map(
  inspectionGroups.map((group) => [group.legacyName, group]),
);

const inspectionItems = [];
const inspectionOptions = [];
const inspectionInputFields = [];
const inspectionMediaRequirements = [];
const sampleReportAnswers = [];
const legacyMapping = { groups: {}, items: {}, options: {} };
const itemNameCount = new Map();
const optionIdCount = new Map();
const duplicateItemNames = [];
const missingCheckboxLabelItems = [];
const potentialConflicts = [];

for (const [index, rawItem] of rawItems.entries()) {
  const group = groupByLegacyName.get(rawItem.grupAdi);
  const legacyNoktaId = Number(rawItem.noktaID || rawItem.noktaId || index + 1);
  const cleanName = normalizeText(rawItem.maddeAdi || rawItem.modalBaslik);
  const cleanLegacyName = normalizeText(rawItem.maddeAdi);
  const itemIdBase = `${group.id}_${slug(cleanName, `item_${legacyNoktaId}`)}`;
  const itemId = `${itemIdBase}_${legacyNoktaId}`;
  const requiresMedia = hasRequiredMedia(cleanName);
  const inputType = inputTypeFor(rawItem, requiresMedia);
  const internalOpinion =
    cleanName.toLocaleLowerCase('tr-TR').includes('kendinize ya da bir akrabanıza') ||
    cleanName.toLocaleLowerCase('tr-TR').includes('usta kanaati');
  const riskCategory = internalOpinion
    ? 'internal_opinion'
    : classifyRiskCategory(group.code, cleanName);
  const mediaRequirementId = `media_${legacyNoktaId}`;
  const packageAvailability = packageAvailabilityFor(group.code);
  const estimatedDurationSeconds = estimatedSeconds(group.code, inputType);
  const groupItemKey = `${group.id}:${cleanName.toLocaleLowerCase('tr-TR')}`;
  itemNameCount.set(groupItemKey, (itemNameCount.get(groupItemKey) || 0) + 1);
  if (itemNameCount.get(groupItemKey) > 1) duplicateItemNames.push(cleanName);

  const rawInputs = Array.isArray(rawItem.inputAlanlari) ? rawItem.inputAlanlari : [];
  const checkboxInputs = rawInputs.filter(
    (input) =>
      String(input.type || '').toLowerCase() === 'checkbox' ||
      String(input.name || '') === 'Noktacheckbox',
  );
  const legacyCheckboxOptionIds = checkboxInputs
    .map((input) => Number(input.value))
    .filter((value) => Number.isFinite(value));

  const needsOptionLabelRecovery =
    inputType.includes('checkbox') &&
    (!Array.isArray(rawItem.secenekler) || rawItem.secenekler.length === 0) &&
    legacyCheckboxOptionIds.length > 0;
  if (needsOptionLabelRecovery) missingCheckboxLabelItems.push(cleanName);

  const item = {
    id: itemId,
    legacyNoktaId,
    groupId: group.id,
    groupCode: group.code,
    name: cleanName,
    legacyName: cleanLegacyName,
    sortOrder: Number(rawItem.sira || index + 1),
    inputType,
    isRequired: true,
    requiresDescription: false,
    descriptionRequiredWhen: ['warning', 'critical'],
    requiresMedia,
    maxImages: Array.isArray(rawItem.resimAlanlari) ? Math.max(rawItem.resimAlanlari.length, 3) : 3,
    requiredImageCount: requiresMedia ? 1 : 0,
    isScored: !internalOpinion,
    isVisibleInReport: !internalOpinion,
    isTechnicianOnly: internalOpinion,
    category: categoryFromGroup(group.code),
    riskCategory,
    severityMode: 'option_based',
    legacyFormUrl: rawItem.formUrl || '',
    packageAvailability,
    estimatedDurationSeconds,
    reportFieldKey: `report.${group.id}.${slug(cleanName, `item_${legacyNoktaId}`)}`,
    mediaRequirementId,
    needsOptionLabelRecovery,
    legacyCheckboxOptionIds,
    suggestedOptions: needsOptionLabelRecovery
      ? ['İyi', 'Orta', 'Kötü', 'Yağ Kaçağı Var', 'Eksik / Yok', 'Kontrol Edilemedi']
      : [],
  };
  inspectionItems.push(item);
  legacyMapping.items[String(legacyNoktaId)] = item.id;

  inspectionMediaRequirements.push({
    id: mediaRequirementId,
    itemId,
    legacyNoktaId,
    maxImages: item.maxImages,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
    requiredImageCount: item.requiredImageCount,
    requiresMediaWhenSeverity: ['critical', 'warning'],
  });

  for (const input of rawInputs) {
    const type = String(input.type || '').toLowerCase();
    if (type === 'checkbox') continue;
    if (!type && !input.name) continue;
    const fieldName = input.name || input.id || 'EkAlan';
    let fieldType = type || 'text';
    const placeholder = normalizeText(input.placeholder || input.value || cleanName);
    if (placeholder.toLocaleLowerCase('tr-TR') === 'tarih') fieldType = 'date';
    const lowerName = cleanName.toLocaleLowerCase('tr-TR');
    const unit = lowerName.includes('akü')
      ? '%'
      : lowerName.includes('lastik diş')
        ? 'mm'
        : lowerName.includes('motor güç')
          ? 'kW / hp'
          : lowerName.includes('motor tork')
            ? 'Nm / kgm'
            : '';
    inspectionInputFields.push({
      id: `field_${legacyNoktaId}_${slug(fieldName, 'ekalan')}`,
      itemId,
      legacyNoktaId,
      fieldName,
      type: lowerName.includes('lastik yılı') ? 'year' : fieldType,
      label: placeholder || cleanName,
      placeholder,
      required: false,
      unit,
      validation: fieldType === 'number' ? { numeric: true } : {},
    });
  }

  const options = Array.isArray(rawItem.secenekler) ? rawItem.secenekler : [];
  for (const [optionIndex, rawOption] of options.entries()) {
    const legacyOptionId = Number(rawOption.secenekID || rawOption.id || rawOption.value);
    if (Number.isFinite(legacyOptionId)) {
      optionIdCount.set(legacyOptionId, (optionIdCount.get(legacyOptionId) || 0) + 1);
    }
    const converted = optionSeverity(rawOption, cleanName);
    if (String(rawOption.className || '').includes('renk-kirmizi') && !converted.isNegative) {
      potentialConflicts.push(`${cleanName} / ${converted.label}`);
    }
    const option = {
      id: `opt_${legacyNoktaId}_${Number.isFinite(legacyOptionId) ? legacyOptionId : optionIndex + 1}`,
      legacyOptionId: Number.isFinite(legacyOptionId) ? legacyOptionId : null,
      legacyNoktaId,
      itemId,
      label: converted.label,
      legacyLabel: normalizeText(rawOption.label || rawOption.secenekAdi || rawOption.value),
      sortOrder: optionIndex + 1,
      severity: converted.severity,
      color: converted.color,
      scoreImpact: converted.scoreImpact,
      isNegative: converted.isNegative,
      requiresDescription: converted.requiresDescription,
      requiresMedia: converted.isNegative,
      isDefault: false,
    };
    inspectionOptions.push(option);
    if (Number.isFinite(legacyOptionId)) {
      legacyMapping.options[String(legacyOptionId)] = option.id;
    }
    if (rawOption.checked === true || String(rawOption.checked).toLowerCase() === 'true') {
      sampleReportAnswers.push({
        legacyNoktaId,
        selectedLegacyOptionId: option.legacyOptionId,
        selectedLabel: option.label,
        description: normalizeText(rawItem.aciklama || rawItem.description || ''),
      });
    }
  }
}

for (const group of inspectionGroups) {
  legacyMapping.groups[group.legacyName] = group.id;
}

const inspectionRules = [
  {
    id: 'critical_requires_description',
    title: 'Kırmızı seçenek açıklama ister',
    when: { severity: 'critical' },
    then: { requiresDescription: true },
  },
  {
    id: 'warning_recommends_description',
    title: 'Turuncu seçenek açıklama önerir',
    when: { severity: 'warning' },
    then: { requiresDescription: true },
  },
  {
    id: 'required_media_items_need_photo',
    title: 'Görsel/cihaz çıktısı maddelerinde kanıt zorunlu',
    when: { inputType: ['media', 'document_or_image'] },
    then: { requiredImageCount: 1 },
  },
  {
    id: 'internal_opinion_hidden_from_report',
    title: 'İç görüş müşteri raporunda görünmez',
    when: { riskCategory: 'internal_opinion' },
    then: { isVisibleInReport: false, isTechnicianOnly: true },
  },
  {
    id: 'external_queries_disclosed',
    title: 'Tramer ve KM sorgusu kaynak/saat ile rapora işlenir',
    when: { riskCategory: ['accident_damage', 'mileage'] },
    then: { reportDisclosureRequired: true },
  },
];

const packages = [
  {
    code: 'MINI',
    name: 'Mini Ekspertiz',
    durationMinutes: 35,
    price: 'Demo',
    groupCodes: ['MOTOR_CHECKUP', 'MECHANICAL_CHECKUP', 'BRAKE_SUSPENSION_TEST'],
  },
  {
    code: 'ESNAF',
    name: 'Esnaf Ekspertiz',
    durationMinutes: 50,
    price: 'Demo',
    groupCodes: ['BODY_PAINT_CHECKUP', 'MOTOR_CHECKUP', 'MECHANICAL_CHECKUP', 'OBD_ECU_TEST'],
  },
  {
    code: 'STANDARD',
    name: 'Standart Ekspertiz',
    durationMinutes: 60,
    price: 'Demo',
    groupCodes: ['BODY_PAINT_CHECKUP', 'MOTOR_CHECKUP', 'MECHANICAL_CHECKUP', 'BRAKE_SUSPENSION_TEST'],
  },
  {
    code: 'FULL',
    name: 'Full Ekspertiz',
    durationMinutes: 85,
    price: 'Demo',
    groupCodes: [
      'BODY_PAINT_CHECKUP',
      'MOTOR_CHECKUP',
      'MECHANICAL_CHECKUP',
      'OBD_ECU_TEST',
      'BRAKE_SUSPENSION_TEST',
      'DYNO_ROAD_TEST',
      'AIRBAG_CHECK',
      'HEAD_GASKET_LEAK_TEST',
    ],
  },
  {
    code: 'PREMIUM',
    name: 'OTOTR Premium 360',
    durationMinutes: 110,
    price: 'Demo',
    groupCodes: [
      'BODY_PAINT_CHECKUP',
      'MOTOR_CHECKUP',
      'MECHANICAL_CHECKUP',
      'OBD_ECU_TEST',
      'BRAKE_SUSPENSION_TEST',
      'DYNO_ROAD_TEST',
      'EXTERIOR_CONDITION',
      'INTERIOR_CHECKUP',
      'AIRBAG_CHECK',
      'HEAD_GASKET_LEAK_TEST',
    ],
  },
  {
    code: 'CORPORATE',
    name: 'Kurumsal / Filo Paketi',
    durationMinutes: 105,
    price: 'Demo',
    groupCodes: [
      'WORK_ORDER_ACCEPTANCE',
      'VEHICLE_FILE_CHECK',
      'BODY_PAINT_CHECKUP',
      'MOTOR_CHECKUP',
      'MECHANICAL_CHECKUP',
      'OBD_ECU_TEST',
      'BRAKE_SUSPENSION_TEST',
      'DYNO_ROAD_TEST',
      'EXTERIOR_CONDITION',
      'INTERIOR_CHECKUP',
      'AIRBAG_CHECK',
      'HEAD_GASKET_LEAK_TEST',
    ],
  },
  {
    code: 'KAPORTA_BOYA',
    name: 'Kaporta Boya',
    durationMinutes: 40,
    price: 'Demo',
    groupCodes: ['BODY_PAINT_CHECKUP', 'EXTERIOR_CONDITION'],
  },
  {
    code: 'MEKANIK',
    name: 'Mekanik',
    durationMinutes: 50,
    price: 'Demo',
    groupCodes: ['MOTOR_CHECKUP', 'MECHANICAL_CHECKUP', 'BRAKE_SUSPENSION_TEST', 'HEAD_GASKET_LEAK_TEST'],
  },
  {
    code: 'HIZLI_KONTROL',
    name: 'Hızlı Kontrol',
    durationMinutes: 25,
    price: 'Demo',
    groupCodes: ['EXTERIOR_CONDITION', 'MOTOR_CHECKUP', 'BRAKE_SUSPENSION_TEST'],
  },
].map((pkg) => {
  const groups = inspectionGroups.filter((group) => pkg.groupCodes.includes(group.code));
  return {
    ...pkg,
    scope: groups.map((group) => group.displayName),
    tasks: groups.map((group) => {
      const items = inspectionItems.filter((item) => item.groupCode === group.code);
      return {
        taskId: group.id,
        taskTypeCode: group.code,
        title: group.displayName,
        owner: ownerForGroup(group.code),
        description: `${items.length} JSON kontrol maddesi`,
        estimatedMinutes: Math.max(
          1,
          Math.round(
            items.reduce((sum, item) => sum + item.estimatedDurationSeconds, 0) / 60,
          ),
        ),
        reportFieldKey: `report.section.${group.id}`,
        checklistItems: items.map((item) => ({
          itemId: item.id,
          title: item.name,
          reportFieldKey: item.reportFieldKey,
          requiresMediaOnRisk: true,
          requiresMediaAlways: item.requiresMedia,
          inputType: item.inputType,
          riskCategory: item.riskCategory,
        })),
      };
    }),
  };
});

function ownerForGroup(groupCode) {
  if (['BODY_PAINT_CHECKUP', 'EXTERIOR_CONDITION', 'INTERIOR_CHECKUP'].includes(groupCode)) {
    return 'Kaporta Ustası';
  }
  if (['MOTOR_CHECKUP', 'MECHANICAL_CHECKUP', 'HEAD_GASKET_LEAK_TEST'].includes(groupCode)) {
    return 'Mekanik Usta';
  }
  if (['OBD_ECU_TEST', 'AIRBAG_CHECK'].includes(groupCode)) return 'OBD Ustası';
  if (['BRAKE_SUSPENSION_TEST', 'DYNO_ROAD_TEST'].includes(groupCode)) {
    return 'Test Operatörü';
  }
  return 'Usta Havuzu';
}

function itemsForGroup(groupCode) {
  return inspectionItems.filter((item) => item.groupCode === groupCode);
}

function reportRowsFor(groupCode, mapper) {
  return itemsForGroup(groupCode).map(mapper);
}

const reportRows = {
  bodyPaintRows: reportRowsFor('BODY_PAINT_CHECKUP', (item) => [
    item.name,
    'Usta girişi bekliyor',
    '-',
    '-',
    item.requiresMedia ? 'Kanıt zorunlu' : 'Şema',
    'JSON şemasından gelen kontrol maddesi',
    '-',
  ]),
  mechanicalRows: reportRowsFor('MOTOR_CHECKUP', (item) => [
    item.name,
    'Bekliyor',
    item.requiresMedia ? 'Kanıt zorunlu' : 'JSON',
    'Usta girişi sonrası rapora işlenecek.',
    '-',
  ]),
  underbodyRows: reportRowsFor('MECHANICAL_CHECKUP', (item) => [
    item.name,
    'Bekliyor',
    item.requiresMedia ? 'Kanıt zorunlu' : 'JSON',
    'Usta girişi sonrası rapora işlenecek.',
    '-',
  ]),
  obdRows: reportRowsFor('OBD_ECU_TEST', (item) => [
    item.name,
    'Bekliyor',
    '-',
    'Usta girişi sonrası rapora işlenecek.',
    '-',
    item.requiresMedia ? 'Cihaz çıktısı/kanıt zorunlu' : 'Şema kuralı',
  ]),
  airbagRows: reportRowsFor('AIRBAG_CHECK', (item) => [
    item.name,
    'Bekliyor',
    'JSON',
    'Usta girişi sonrası rapora işlenecek.',
    '-',
  ]),
  brakeRows: reportRowsFor('BRAKE_SUSPENSION_TEST', (item) => [
    item.name,
    'Bekliyor',
    '-',
    'Şema limiti',
    'Bekliyor',
    item.requiresMedia ? 'Cihaz çıktısı zorunlu' : 'Şema kuralı',
  ]),
  dynoRows: reportRowsFor('DYNO_ROAD_TEST', (item) => [
    item.name,
    'Bekliyor',
    item.requiresMedia ? 'Cihaz çıktısı zorunlu' : 'Usta girişi sonrası rapora işlenecek.',
  ]),
  exteriorRows: reportRowsFor('EXTERIOR_CONDITION', (item) => [
    item.name,
    'Bekliyor',
    item.riskCategory,
    'Usta girişi sonrası rapora işlenecek.',
  ]),
  interiorRows: reportRowsFor('INTERIOR_CHECKUP', (item) => [
    item.name,
    'Bekliyor',
    item.riskCategory,
    'Usta girişi sonrası rapora işlenecek.',
  ]),
  records: reportRowsFor('VEHICLE_FILE_CHECK', (item) => [
    item.name,
    'Dış sorgu bekliyor',
    'Portal verisi rapora işlenecek.',
  ]),
};

const metadata = {
  raporID: raw.raporID || '',
  generatedAt: new Date().toISOString(),
  source: path.basename(sourcePath),
  totalGroups: inspectionGroups.length,
  totalItems: inspectionItems.length,
  totalOptions: inspectionOptions.length,
};

const normalized = {
  metadata,
  inspectionGroups,
  inspectionItems,
  inspectionOptions,
  inspectionInputFields,
  inspectionMediaRequirements,
  inspectionRules,
  legacyMapping,
  sampleReportAnswers,
  packages,
  reportRows,
};

writeJson('inspection_schema_normalized.json', normalized);
writeJson('inspection_groups.json', inspectionGroups);
writeJson('inspection_items.json', inspectionItems);
writeJson('inspection_options.json', inspectionOptions);
writeJson('inspection_firestore_seed.json', firestoreSeed());
writeText('inspection_sql_schema.sql', sqlSchema());
writeText('inspection_seed.sql', sqlSeed());
writeText(path.join('..', 'docs', 'inspection_schema_report.md'), schemaReport());
writeText(path.join('..', 'docs', 'inspection_ui_behavior.md'), uiBehavior());
writeText('inspection_schema_web.js', webSchema());
writeText(path.join('..', 'lib', 'data', 'generated', 'inspection_schema_catalog.dart'), dartCatalog());

console.log(
  `Normalized ${inspectionGroups.length} groups, ${inspectionItems.length} items, ${inspectionOptions.length} options.`,
);

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(dataDir, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(fileName, value) {
  const outputPath = path.normalize(path.join(dataDir, fileName));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, value, 'utf8');
}

function firestoreSeed() {
  const seed = {};
  for (const group of inspectionGroups) {
    const groupPath = `inspectionGroups/${group.id}`;
    seed[groupPath] = group;
    for (const item of inspectionItems.filter((entry) => entry.groupId === group.id)) {
      const itemPath = `${groupPath}/items/${item.id}`;
      seed[itemPath] = item;
      for (const option of inspectionOptions.filter((entry) => entry.itemId === item.id)) {
        seed[`${itemPath}/options/${option.id}`] = option;
      }
    }
  }
  return seed;
}

function sqlSchema() {
  return `CREATE TABLE IF NOT EXISTS inspection_groups (
  id text PRIMARY KEY,
  legacy_name text NOT NULL,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  sort_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inspection_items (
  id text PRIMARY KEY,
  legacy_nokta_id integer UNIQUE NOT NULL,
  group_id text NOT NULL REFERENCES inspection_groups(id),
  group_code text NOT NULL,
  name text NOT NULL,
  input_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  requires_media boolean NOT NULL DEFAULT false,
  required_image_count integer NOT NULL DEFAULT 0,
  is_visible_in_report boolean NOT NULL DEFAULT true,
  is_technician_only boolean NOT NULL DEFAULT false,
  category text NOT NULL,
  risk_category text NOT NULL,
  report_field_key text NOT NULL,
  package_availability jsonb NOT NULL,
  estimated_duration_seconds integer NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_options (
  id text PRIMARY KEY,
  legacy_option_id integer,
  legacy_nokta_id integer NOT NULL,
  item_id text NOT NULL REFERENCES inspection_items(id),
  label text NOT NULL,
  severity text NOT NULL,
  color text NOT NULL,
  score_impact integer NOT NULL DEFAULT 0,
  is_negative boolean NOT NULL DEFAULT false,
  requires_description boolean NOT NULL DEFAULT false,
  requires_media boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_input_fields (
  id text PRIMARY KEY,
  item_id text NOT NULL REFERENCES inspection_items(id),
  legacy_nokta_id integer NOT NULL,
  field_name text NOT NULL,
  type text NOT NULL,
  label text NOT NULL,
  placeholder text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  unit text NOT NULL DEFAULT '',
  validation jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS inspection_media_requirements (
  id text PRIMARY KEY,
  item_id text NOT NULL REFERENCES inspection_items(id),
  legacy_nokta_id integer NOT NULL,
  max_images integer NOT NULL DEFAULT 3,
  allowed_mime_types jsonb NOT NULL,
  required_image_count integer NOT NULL DEFAULT 0,
  requires_media_when_severity jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_rules (
  id text PRIMARY KEY,
  title text NOT NULL,
  rule jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id text NOT NULL,
  package_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz
);

CREATE TABLE IF NOT EXISTS inspection_report_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES inspection_reports(id),
  item_id text NOT NULL REFERENCES inspection_items(id),
  option_id text REFERENCES inspection_options(id),
  value text,
  note text,
  severity text,
  report_field_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_report_answer_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES inspection_report_answers(id),
  field_key text NOT NULL,
  local_path text,
  remote_url text,
  hash text,
  captured_at timestamptz,
  uploaded_at timestamptz,
  uploaded_by text
);
`;
}

function sqlSeed() {
  const lines = ['BEGIN;'];
  for (const group of inspectionGroups) {
    lines.push(
      `INSERT INTO inspection_groups (id, legacy_name, name, code, sort_order, is_active, description, icon, color) VALUES (${[
        sqlString(group.id),
        sqlString(group.legacyName),
        sqlString(group.name),
        sqlString(group.code),
        group.sortOrder,
        group.isActive,
        sqlString(group.description),
        sqlString(group.icon),
        sqlString(group.color),
      ].join(', ')}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;`,
    );
  }
  for (const item of inspectionItems) {
    lines.push(
      `INSERT INTO inspection_items (id, legacy_nokta_id, group_id, group_code, name, input_type, is_required, requires_media, required_image_count, is_visible_in_report, is_technician_only, category, risk_category, report_field_key, package_availability, estimated_duration_seconds) VALUES (${[
        sqlString(item.id),
        item.legacyNoktaId,
        sqlString(item.groupId),
        sqlString(item.groupCode),
        sqlString(item.name),
        sqlString(item.inputType),
        item.isRequired,
        item.requiresMedia,
        item.requiredImageCount,
        item.isVisibleInReport,
        item.isTechnicianOnly,
        sqlString(item.category),
        sqlString(item.riskCategory),
        sqlString(item.reportFieldKey),
        sqlString(JSON.stringify(item.packageAvailability)),
        item.estimatedDurationSeconds,
      ].join(', ')}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;`,
    );
  }
  for (const option of inspectionOptions) {
    lines.push(
      `INSERT INTO inspection_options (id, legacy_option_id, legacy_nokta_id, item_id, label, severity, color, score_impact, is_negative, requires_description, requires_media, sort_order) VALUES (${[
        sqlString(option.id),
        option.legacyOptionId === null ? 'NULL' : option.legacyOptionId,
        option.legacyNoktaId,
        sqlString(option.itemId),
        sqlString(option.label),
        sqlString(option.severity),
        sqlString(option.color),
        option.scoreImpact,
        option.isNegative,
        option.requiresDescription,
        option.requiresMedia,
        option.sortOrder,
      ].join(', ')}) ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;`,
    );
  }
  lines.push('COMMIT;');
  return `${lines.join('\n')}\n`;
}

function schemaReport() {
  const radioCount = inspectionItems.filter((item) => item.inputType.includes('radio')).length;
  const checkboxCount = inspectionItems.filter((item) => item.inputType.includes('checkbox')).length;
  const requiredMediaCount = inspectionItems.filter((item) => item.requiresMedia).length;
  const internalCount = inspectionItems.filter((item) => item.isTechnicianOnly).length;
  const duplicateOptions = [...optionIdCount.entries()].filter(([, count]) => count > 1);
  return `# OTOTR Inspection Schema Report

Kaynak rapor ID: ${metadata.raporID}

- Grup sayısı: ${inspectionGroups.length}
- Madde sayısı: ${inspectionItems.length}
- Seçenek sayısı: ${inspectionOptions.length}
- Radio madde sayısı: ${radioCount}
- Checkbox madde sayısı: ${checkboxCount}
- Ek alan sayısı: ${inspectionInputFields.length}
- Fotoğraf/çıktı zorunlu madde sayısı: ${requiredMediaCount}
- İç denetim maddesi sayısı: ${internalCount}
- Tekrar eden noktaID: ${new Set(inspectionItems.map((item) => item.legacyNoktaId)).size === inspectionItems.length ? 'Yok' : 'Var'}
- Tekrar eden secenekID: ${duplicateOptions.length ? duplicateOptions.map(([id]) => id).join(', ') : 'Yok'}

## Checkbox Etiketi Kaynaktan Tamamlanacak Maddeler

${missingCheckboxLabelItems.length ? missingCheckboxLabelItems.map((name) => `- ${name}`).join('\n') : '- Yok'}

## Aynı Grup İçinde Tekrar Eden Madde Adları

${duplicateItemNames.length ? duplicateItemNames.map((name) => `- ${name}`).join('\n') : '- Yok'}

## Manuel Kontrol Önerileri

- Otorapor renk sınıfları ana kaynak kabul edildi, fakat "Var/Yok/Evet/Hayır" mantığı bağlama göre ayrıca düzeltildi.
- checked=true cevapları master seçenek modeli içine default olarak yazılmadı, sampleReportAnswers altında tutuldu.
- Eksik checkbox etiketleri canlı ERP kaynağından netleştirilmeden müşteri rapor dili olarak kullanılmamalı.
- OTOTR paket kapsamları ilk fazda grup bazlı üretildi; canlı paket satış kurgusunda backend paket görev seti nihai kaynak olmalı.
`;
}

function uiBehavior() {
  return `# OTOTR Mobil Usta Form Davranışı

- Usta uygulaması iş emrini önce paket ve görev grupları halinde gösterir.
- Her grup kartında toplam madde, gönderilen madde, tahmini süre ve blokaj durumu görünür.
- Başlangıç kanıtı tamamlanmadan teknik grup içeriği düzenlenmez.
- Madde kartında radio, checkbox, alan, medya veya cihaz çıktısı davranışı JSON şemasındaki inputType değerinden üretilir.
- Kırmızı veya turuncu seçenek seçildiğinde açıklama ve kanıt kontrolü çalışır.
- media ve document_or_image maddelerinde en az bir fotoğraf veya cihaz çıktısı beklenir.
- Usta "Başlığı Gönder" dediğinde eksikler açık Türkçe liste halinde gösterilir.
- İç görüş ve usta kanaati müşteri raporundan ayrılır, audit iziyle saklanır.
- Offline durumda form cevabı, fotoğraf metadata ve dosya yükleme kuyruğa alınır; aynı idempotencyKey ikinci kez rapora yazılmaz.
- Rapor basımı kilitli kayıt üretir; sonradan revizyon yönetici onayıyla yeni revizyon olarak açılır.
- QR doğrulamada cevaplar reportFieldKey, itemId, optionId, kanıt hash ve audit kaydıyla izlenebilir.
`;
}

function webSchema() {
  return `window.OTOTR_INSPECTION_SCHEMA = ${JSON.stringify(
    { metadata, inspectionGroups, inspectionItems, inspectionOptions, packages, reportRows },
    null,
    2,
  )};\n`;
}

function dartCatalog() {
  const packageLines = packages
    .map(
      (pkg) => `  InspectionPackageDefinition(
    code: ${dartString(pkg.code)},
    name: ${dartString(pkg.name)},
    durationMinutes: ${pkg.durationMinutes},
    includedModules: ${dartList(pkg.scope)},
  ),`,
    )
    .join('\n');

  const taskLines = packages
    .flatMap((pkg) =>
      pkg.tasks.map(
        (task) => `  InspectionTaskCatalog(
    packageCode: ${dartString(pkg.code)},
    taskId: ${dartString(`${pkg.code.toLowerCase()}_${task.taskId}`)},
    taskTypeCode: ${dartString(task.taskTypeCode)},
    title: ${dartString(task.title)},
    owner: ${dartString(task.owner)},
    reportFieldKey: ${dartString(task.reportFieldKey)},
    estimatedMinutes: ${task.estimatedMinutes},
    checklistItems: [
${task.checklistItems
  .map(
    (item) => `      InspectionChecklistCatalogItem(
        itemId: ${dartString(item.itemId)},
        title: ${dartString(item.title)},
        reportFieldKey: ${dartString(item.reportFieldKey)},
        requiresMediaOnRisk: ${item.requiresMediaOnRisk},
        requiresMediaAlways: ${item.requiresMediaAlways},
        inputType: ${dartString(item.inputType)},
        riskCategory: ${dartString(item.riskCategory)},
      ),`,
  )
  .join('\n')}
    ],
  ),`,
      ),
    )
    .join('\n');

  return `// GENERATED CODE - DO NOT EDIT BY HAND.
// Source: ${raw.raporID || 'unknown'} Otorapor schema normalized for OTOTR.

class InspectionPackageDefinition {
  const InspectionPackageDefinition({
    required this.code,
    required this.name,
    required this.durationMinutes,
    required this.includedModules,
  });

  final String code;
  final String name;
  final int durationMinutes;
  final List<String> includedModules;
}

class InspectionTaskCatalog {
  const InspectionTaskCatalog({
    required this.packageCode,
    required this.taskId,
    required this.taskTypeCode,
    required this.title,
    required this.owner,
    required this.reportFieldKey,
    required this.estimatedMinutes,
    required this.checklistItems,
  });

  final String packageCode;
  final String taskId;
  final String taskTypeCode;
  final String title;
  final String owner;
  final String reportFieldKey;
  final int estimatedMinutes;
  final List<InspectionChecklistCatalogItem> checklistItems;
}

class InspectionChecklistCatalogItem {
  const InspectionChecklistCatalogItem({
    required this.itemId,
    required this.title,
    required this.reportFieldKey,
    required this.requiresMediaOnRisk,
    required this.requiresMediaAlways,
    required this.inputType,
    required this.riskCategory,
  });

  final String itemId;
  final String title;
  final String reportFieldKey;
  final bool requiresMediaOnRisk;
  final bool requiresMediaAlways;
  final String inputType;
  final String riskCategory;
}

const inspectionPackageDefinitions = [
${packageLines}
];

const inspectionTaskCatalog = [
${taskLines}
];

InspectionPackageDefinition inspectionPackageByCode(String code) {
  final normalized = code.trim().toUpperCase().replaceAll('-', '_');
  return inspectionPackageDefinitions.firstWhere(
    (package) => package.code == normalized,
    orElse: () => inspectionPackageDefinitions.firstWhere(
      (package) => package.code == 'STANDARD',
    ),
  );
}

List<InspectionTaskCatalog> inspectionTaskCatalogForPackage(String packageCode) {
  final normalized = packageCode.trim().toUpperCase().replaceAll('-', '_');
  return inspectionTaskCatalog
      .where((task) => task.packageCode == normalized)
      .toList(growable: false);
}
`;
}

function dartList(values) {
  if (!values.length) return 'const []';
  return `[${values.map((value) => dartString(value)).join(', ')}]`;
}
