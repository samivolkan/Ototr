import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildXQuery,
  canApproveCandidate,
  extractPlateCandidates,
  formatPlate,
  isValidTurkishPlate,
  normalizePlate,
  parseTurkishPlate,
} from '../../core.mjs';

test('Türkiye plakalarını normalize eder ve biçimlendirir', () => {
  assert.equal(normalizePlate(' 16-otr 26 '), '16OTR26');
  assert.equal(formatPlate('34ab1234'), '34 AB 1234');
  assert.deepEqual(parseTurkishPlate('06 KAZ 26'), {
    normalized: '06KAZ26',
    province: '06',
    letters: 'KAZ',
    numbers: '26',
    formatted: '06 KAZ 26',
  });
});

test('yaygın Türkiye plaka düzenlerini kabul eder', () => {
  for (const plate of ['34 A 1234', '34 AB 123', '34 AB 1234', '34 ABC 12', '34 ABC 123', '01 AA 123']) {
    assert.equal(isValidTurkishPlate(plate), true, plate);
  }
});

test('geçersiz il kodu ve son ekleri reddeder', () => {
  for (const plate of ['00 ABC 123', '82 ABC 123', '34 A 123', '34 ABC 1234', '34 ABCD 12', '34 123 ABC']) {
    assert.equal(isValidTurkishPlate(plate), false, plate);
  }
});

test('OCR metninden tekilleştirilmiş plaka adayları çıkarır', () => {
  const candidates = extractPlateCandidates('Araç: 16 OTR 26\nTekrar 16-OTR-26\nDiğer: 34 AB 1234', 87.4);
  assert.deepEqual(candidates.map((item) => item.plate), ['16 OTR 26', '34 AB 1234']);
  assert.equal(candidates[0].confidence, 87);
});

test('X sorgusunu kelime, konum, medya ve hariç tutmalarla kurar', () => {
  const query = buildXQuery({
    terms: ['kaza', 'trafik kazası'],
    locations: ['Bursa', 'İzmir yolu'],
    excludedTerms: ['oyun', 'film sahnesi'],
    mediaType: 'image',
    language: 'tr',
  });
  assert.match(query, /\(kaza OR "trafik kazası"\)/);
  assert.match(query, /\(Bursa OR "İzmir yolu"\)/);
  assert.match(query, /has:images/);
  assert.match(query, /lang:tr/);
  assert.match(query, /-is:retweet/);
  assert.match(query, /-oyun/);
  assert.match(query, /-"film sahnesi"/);
});

test('insan onayı kapısı tüm zorunlu doğrulamaları arar', () => {
  const candidate = {
    selectedPlate: '16 OTR 26',
    sourceAvailable: true,
    status: 'review_pending',
    plateCandidates: [{ plate: '16 OTR 26' }],
  };
  const incomplete = canApproveCandidate(candidate, {
    selectedPlate: '16 OTR 26',
    plateFullyVisible: true,
    belongsToDamagedVehicle: false,
    accidentContextConfirmed: true,
  });
  assert.equal(incomplete.allowed, false);
  assert.ok(incomplete.reasons.some((reason) => reason.includes('kazalı araca')));

  const complete = canApproveCandidate(candidate, {
    selectedPlate: '16 OTR 26',
    plateFullyVisible: true,
    belongsToDamagedVehicle: true,
    accidentContextConfirmed: true,
  });
  assert.equal(complete.allowed, true);
});

test('OCR dışı plaka düzeltmesinde manuel override ister', () => {
  const candidate = {
    sourceAvailable: true,
    status: 'review_pending',
    plateCandidates: [{ plate: '16 OTR 26' }],
  };
  const review = {
    selectedPlate: '16 OTR 27',
    plateFullyVisible: true,
    belongsToDamagedVehicle: true,
    accidentContextConfirmed: true,
  };
  assert.equal(canApproveCandidate(candidate, review).allowed, false);
  assert.equal(canApproveCandidate(candidate, { ...review, manualPlateOverride: true }).allowed, true);
});
