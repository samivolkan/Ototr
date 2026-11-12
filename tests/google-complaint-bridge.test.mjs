import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../assets/google-complaint-bridge.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, { window, URL, Date, String, Number, Math, Object });
const bridge = window.OTOTRGoogleComplaintBridge;

test('positive wording that quotes a fraud term is not classified as critical', () => {
  const risk = bridge.riskFor({ rating: 5, comment: 'Aracımı sattım, henüz alalı 2 ay olmuştu alırken expertise sokmuştum meğer dolandırılmışım onuda burada öğrendim gerçekten işini bilen bir ekip benim için zararlı oldu ama hem alıcı rahat etti hemde ben aracımı gördüm' });
  assert.equal(risk.riskLevel, 'positive');
  assert.equal(risk.critical, false);
  assert.equal(risk.legal, false);
});

test('a high-star review with explicit unresolved complaint intent is still escalated', () => {
  const risk = bridge.riskFor({ rating: 5, comment: 'Mağdur oldum, çözüm bekliyorum; sahte rapor iddiam incelensin.' });
  assert.equal(risk.riskLevel, 'critical');
  assert.equal(risk.critical, true);
});

test('an unresolved complaint overrides unrelated positive wording', () => {
  const risk = bridge.riskFor({ rating: 5, comment: 'İşini bilen ekip ama mağdur oldum, çözüm bekliyorum; sahte rapor iddiam var.' });
  assert.equal(risk.riskLevel, 'critical');
  assert.equal(risk.critical, true);
});

test('a high-star unresolved complaint remains negative without a critical keyword', () => {
  const risk = bridge.riskFor({ rating: 5, comment: 'Memnun değilim, mağdur oldum ve çözüm bekliyorum.' });
  assert.equal(risk.riskLevel, 'negative');
  assert.equal(risk.critical, false);
});

test('one-star complaint becomes a persistent P0 ticket with masked customer data', () => {
  const item = {
    id: '12345678-abcd-4000-8000-000000000001',
    kind: 'complaint',
    status: 'open',
    branch_id: 'branch-google-nilufer',
    branch_name: 'OTOTR Oto Ekspertiz Bursa Nilüfer',
    review_id: 'google-review-live-1',
    created_at: '2026-11-13T08:00:00.000Z',
    updated_at: '2026-11-13T08:05:00.000Z',
    review_snapshot: {
      rating: 1,
      reviewer_name: 'Asaf Aslan',
      comment: 'Asaf Aslan, 16 ABC 123 plakalı araç için beni 0532 111 22 33 numarasından arayın; mağdur oldum.',
      review_date: '2026-11-12T18:00:00.000Z',
      review_reply_url: 'https://business.google.com/local/example/reviews/example'
    }
  };
  const ticket = bridge.ticketFor(item, { name: item.branch_name, region: 'Marmara' }, Date.parse('2026-11-13T11:00:00.000Z'));
  assert.equal(ticket.id, 'GGL-12345678ABCD');
  assert.equal(ticket.customer, 'A*** A***');
  assert.equal(ticket.source, 'Google');
  assert.equal(ticket.priority, 'P0');
  assert.equal(ticket.sla, 'Aşıldı');
  assert.equal(ticket.isLiveGoogle, true);
  assert.match(ticket.reviewComment, /\[telefon gizlendi\]/);
  assert.match(ticket.reviewComment, /\[plaka gizlendi\]/);
  assert.match(ticket.reviewComment, /A\*\*\* A\*\*\*/);
  assert.doesNotMatch(ticket.reviewComment, /0532|111 22 33|16 ABC 123|Asaf Aslan/);
  assert.equal(ticket.googleReviewId, 'google-review-live-1');
  assert.match(ticket.correlationId, /^GGL-COR-/);
});

test('unsafe external links are rejected and completed work maps to a closed ticket', () => {
  const item = {
    id: 'abcdef12-abcd-4000-8000-000000000001', kind: 'complaint', status: 'done', review_id: 'review-2',
    created_at: '2026-11-13T08:00:00.000Z', updated_at: '2026-11-13T09:00:00.000Z',
    review_snapshot: { rating: 2, reviewer_name: 'Google kullanıcısı', comment: 'Memnun değilim.', review_reply_url: 'https://evil.example/review' }
  };
  const ticket = bridge.ticketFor(item, { name: 'OTOTR Oto Ekspertiz Bursa Nilüfer', region: 'Marmara' });
  assert.equal(ticket.status, 'Kapandı');
  assert.equal(ticket.sla, 'İçinde');
  assert.equal(ticket.googleReviewUrl, '');
});

test('completed complaints retain an SLA breach when closure exceeded the threshold', () => {
  const item = {
    id: 'deadbeef-abcd-4000-8000-000000000001', kind: 'complaint', status: 'done', review_id: 'review-late',
    created_at: '2026-11-13T08:00:00.000Z', updated_at: '2026-11-13T11:01:00.000Z',
    review_snapshot: { rating: 1, reviewer_name: 'Müşteri', comment: 'Çözüm bekliyorum.' }
  };
  assert.equal(bridge.ticketFor(item, { name: 'Bursa Nilüfer', region: 'Marmara' }).sla, 'Aşıldı');
});

test('common phone, identity, IBAN and URL formats are redacted in the UI snapshot', () => {
  const masked = bridge.maskComment('Ara: (0532) 111 22 33 T.C. 123 456 789 01 TR12 3456 7890 1234 5678 9012 34 https://example.com');
  assert.match(masked, /\[telefon gizlendi\]/);
  assert.match(masked, /\[kimlik no gizlendi\]/);
  assert.match(masked, /\[IBAN gizlendi\]/);
  assert.match(masked, /\[bağlantı gizlendi\]/);
  assert.doesNotMatch(masked, /0532|123 456|TR12|example\.com/);
});

test('a malformed snapshot is not promoted to a one-star P0 complaint', () => {
  const item = { id: 'feedbeef-abcd-4000-8000-000000000001', kind: 'complaint', status: 'open', review_id: 'review-3', review_snapshot: { comment: 'Puan yok.' } };
  assert.equal(bridge.riskFor(item.review_snapshot).critical, false);
  assert.equal(bridge.ticketFor(item, {}), null);
});
