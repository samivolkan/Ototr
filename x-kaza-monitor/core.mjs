const TURKISH_TO_ASCII = Object.freeze({
  Ç: 'C', Ğ: 'G', İ: 'I', I: 'I', Ö: 'O', Ş: 'S', Ü: 'U',
  ç: 'C', ğ: 'G', ı: 'I', i: 'I', ö: 'O', ş: 'S', ü: 'U',
});

export const DEFAULT_ACCIDENT_TERMS = Object.freeze([
  'kaza',
  'kazalı',
  'trafik kazası',
  'çarpıştı',
  'çarpışma',
  'takla attı',
  'zincirleme kaza',
  'araç devrildi',
]);

export const DEFAULT_EXCLUDED_TERMS = Object.freeze([
  'oyun',
  'simülasyon',
  'film',
  'dizi',
  'reklam',
]);

export function asciiUpper(value = '') {
  return String(value)
    .split('')
    .map((character) => TURKISH_TO_ASCII[character] ?? character)
    .join('')
    .toUpperCase();
}

export function normalizePlate(value = '') {
  return asciiUpper(value).replace(/[^A-Z0-9]/g, '');
}

export function parseTurkishPlate(value = '') {
  const normalized = normalizePlate(value);
  const match = normalized.match(/^(0[1-9]|[1-7][0-9]|8[01])([A-Z]{1,3})([0-9]{2,4})$/);
  if (!match) return null;

  const [, province, letters, numbers] = match;
  const suffixIsPlausible =
    (letters.length === 1 && numbers.length === 4) ||
    (letters.length === 2 && numbers.length >= 3 && numbers.length <= 4) ||
    (letters.length === 3 && numbers.length >= 2 && numbers.length <= 3);

  if (!suffixIsPlausible) return null;

  return Object.freeze({
    normalized,
    province,
    letters,
    numbers,
    formatted: `${province} ${letters} ${numbers}`,
  });
}

export function isValidTurkishPlate(value = '') {
  return parseTurkishPlate(value) !== null;
}

export function formatPlate(value = '') {
  return parseTurkishPlate(value)?.formatted ?? normalizePlate(value);
}

export function extractPlateCandidates(ocrText = '', confidence = null) {
  const text = asciiUpper(ocrText);
  const expression = /(0[1-9]|[1-7][0-9]|8[01])\s*[-_.:/]?\s*([A-Z]{1,3})\s*[-_.:/]?\s*([0-9]{2,4})/g;
  const unique = new Map();

  for (const match of text.matchAll(expression)) {
    const raw = match[0];
    const parsed = parseTurkishPlate(`${match[1]}${match[2]}${match[3]}`);
    if (!parsed) continue;

    const key = parsed.normalized;
    if (!unique.has(key)) {
      unique.set(key, {
        plate: parsed.formatted,
        normalized: parsed.normalized,
        raw,
        confidence: Number.isFinite(Number(confidence))
          ? Math.max(0, Math.min(100, Math.round(Number(confidence))))
          : null,
      });
    }
  }

  return [...unique.values()];
}

function cleanList(values = []) {
  const list = Array.isArray(values) ? values : String(values).split(/[\n,;]/);
  return [...new Set(list.map((value) => String(value).trim()).filter(Boolean))];
}

function quoteQueryValue(value) {
  const sanitized = String(value).replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) return '';
  return /\s/.test(sanitized) ? `"${sanitized}"` : sanitized;
}

function orGroup(values) {
  const terms = cleanList(values).map(quoteQueryValue).filter(Boolean);
  if (terms.length === 0) return '';
  return terms.length === 1 ? terms[0] : `(${terms.join(' OR ')})`;
}

export function buildXQuery(rule = {}) {
  const positiveTerms = orGroup(rule.terms ?? DEFAULT_ACCIDENT_TERMS);
  if (!positiveTerms) {
    throw new Error('En az bir tarama kelimesi gereklidir.');
  }

  const locationTerms = orGroup(rule.locations ?? []);
  const excluded = cleanList(rule.excludedTerms ?? []).map((term) => `-${quoteQueryValue(term)}`);
  const mediaOperator = rule.mediaType === 'video' ? 'has:videos' : 'has:images';
  const language = String(rule.language ?? 'tr').trim();
  const parts = [positiveTerms];

  if (locationTerms) parts.push(locationTerms);
  parts.push(mediaOperator);
  if (language) parts.push(`lang:${language}`);
  if (rule.excludeRetweets !== false) parts.push('-is:retweet');
  if (rule.excludeReplies === true) parts.push('-is:reply');
  parts.push(...excluded);

  const query = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (query.length > 1024) {
    throw new Error(`X sorgusu 1024 karakter sınırını aşıyor (${query.length}).`);
  }
  return query;
}

export function normalizeDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function canApproveCandidate(candidate = {}, review = {}) {
  const selectedPlate = review.selectedPlate ?? candidate.selectedPlate;
  const sourceAvailable = review.sourceAvailable ?? candidate.sourceAvailable;
  const reasons = [];

  if (!isValidTurkishPlate(selectedPlate)) reasons.push('Geçerli bir Türkiye plakası seçilmedi.');
  if (review.plateFullyVisible !== true) reasons.push('Plakanın tam görünür olduğu doğrulanmadı.');
  if (review.belongsToDamagedVehicle !== true) reasons.push('Plakanın kazalı araca ait olduğu doğrulanmadı.');
  if (review.accidentContextConfirmed !== true) reasons.push('Görselin gerçek kaza bağlamı doğrulanmadı.');
  if (sourceAvailable === false || candidate.status === 'source_removed') {
    reasons.push('Kaynak paylaşım erişilebilir değil.');
  }

  const availableCandidates = (candidate.plateCandidates ?? []).map((item) => normalizePlate(item.plate ?? item));
  const selectedNormalized = normalizePlate(selectedPlate);
  if (availableCandidates.length > 0 && !availableCandidates.includes(selectedNormalized) && review.manualPlateOverride !== true) {
    reasons.push('Seçilen plaka OCR adayları arasında değil; manuel düzeltme onayı gerekli.');
  }

  return Object.freeze({ allowed: reasons.length === 0, reasons });
}

export function createId(prefix = 'id') {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${randomPart}`;
}

export function redactPostText(text = '', maxLength = 280) {
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

export function statusLabel(status = '') {
  return ({
    ocr_pending: 'OCR bekliyor',
    review_pending: 'İnsan onayı bekliyor',
    approved_internal: 'Usta kullanımına onaylı',
    approved_customer: 'Alıcı gösterimine onaylı',
    rejected: 'Geçersiz eşleşme',
    source_removed: 'Kaynak kaldırıldı',
  })[status] ?? status;
}
