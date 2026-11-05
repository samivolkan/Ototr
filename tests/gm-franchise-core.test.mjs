import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REQUIRED_ROLES,
  activateFranchiseCase,
  createFranchiseCase,
  OPENING_EVIDENCE_GATES,
  hireStaff,
  openingBlockers,
  requestException,
  reviewException,
  reviewOpeningEvidence,
  submitOpeningEvidence,
  updateStaffCompliance
} from '../gm-franchise/franchise-core.mjs';

const completeEvidence = (franchiseCase) => {
  for (const gate of OPENING_EVIDENCE_GATES) {
    submitOpeningEvidence(franchiseCase, gate.code, { makerId: `${gate.ownerRole}-maker`, makerRole: gate.ownerRole, evidenceSha256: gate.code.padEnd(64, 'a').slice(0, 64).replace(/[^a-f0-9]/g, 'a'), sourceReference: `REF-${gate.code}` });
    reviewOpeningEvidence(franchiseCase, gate.code, { checkerId: 'gm-checker', checkerRole: 'gm', decision: 'approved' });
  }
};

const completeStaff = (franchiseCase) => {
  for (const role of REQUIRED_ROLES) {
    hireStaff(franchiseCase, role.key, `Sentetik ${role.label}`);
    updateStaffCompliance(franchiseCase, role.key, {
      employmentDocumentsComplete: true,
      contractSigned: true,
      academyAssigned: role.certification,
      academyCompleted: role.certification,
      certificateValidUntil: role.certification ? '2027-11-05' : null
    });
  }
};

test('new application produces one canonical franchise case and mandatory staffing plan', () => {
  const c = createFranchiseCase({ id: 'FR-TEST-1', applicationId: 'APP-TEST-1', candidate: 'Sentetik Aday' });
  assert.equal(c.applicationId, 'APP-TEST-1');
  assert.equal(c.staffing.length, 10);
  assert.equal(c.stage, 0);
});

test('activation fails closed while documents and staffing are incomplete', () => {
  const c = createFranchiseCase({ id: 'FR-TEST-2', consents: 3, documents: 12, documentsTotal: 17, paid: 100, stage: 12 });
  const result = activateFranchiseCase(c, { taskDone: true });
  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((x) => x.includes('Zorunlu belgeler eksik')));
  assert.equal(c.branch, null);
  assert.equal(c.accessAccounts.length, 0);
});

test('role certification is required before access can become ready', () => {
  const c = createFranchiseCase({ id: 'FR-TEST-3' });
  hireStaff(c, 'manager', 'Sentetik Müdür');
  updateStaffCompliance(c, 'manager', { employmentDocumentsComplete: true, contractSigned: true });
  assert.equal(c.staffing.find((x) => x.roleKey === 'manager').accessStatus, 'blocked');
  updateStaffCompliance(c, 'manager', { academyCompleted: true, certificateValidUntil: '2027-11-05' });
  assert.equal(c.staffing.find((x) => x.roleKey === 'manager').accessStatus, 'ready');
});

test('atomic activation creates branch, ten scoped accounts and 30/60/90 tasks', () => {
  const c = createFranchiseCase({ id: 'FR-TEST-4', name: 'Test OTOTR', consents: 3, documents: 17, documentsTotal: 17, paid: 100, stage: 12 });
  completeStaff(c);
  completeEvidence(c);
  assert.deepEqual(openingBlockers(c, { taskDone: true }), []);
  const result = activateFranchiseCase(c, { taskDone: true, branchId: 'BR-TEST-4' });
  assert.equal(result.ok, true);
  assert.equal(c.stage, 13);
  assert.equal(c.branch.id, 'BR-TEST-4');
  assert.equal(c.accessAccounts.length, 10);
  assert.deepEqual(c.followUps.map((x) => x.day), [30, 60, 90]);
  assert.ok(c.staffing.every((x) => x.branchId === 'BR-TEST-4' && x.accessStatus === 'active'));
  const repeated = activateFranchiseCase(c, { taskDone: true, branchId: 'BR-OTHER' });
  assert.equal(repeated.alreadyActive, true);
  assert.equal(c.branch.id, 'BR-TEST-4');
  assert.equal(c.accessAccounts.length, 10);
  assert.equal(c.followUps.length, 3);
});

test('maker-checker rejects self approval and protects non-waivable gates', () => {
  const c = createFranchiseCase({ id: 'FR-TEST-5' });
  assert.throws(() => requestException(c, { type: 'payment', reason: 'Tahsilat kapısı', requesterId: 'u1', requesterRole: 'fd' }), /istisnaya kapalıdır/);
  const ex = requestException(c, { id: 'EX-1', reason: 'Kritik olmayan takvim sapması', requesterId: 'u1', requesterRole: 'fd' });
  assert.throws(() => reviewException(c, ex.id, { reviewerId: 'u1', reviewerRole: 'gm', decision: 'approved' }), /kendi istisnasını/);
  reviewException(c, ex.id, { reviewerId: 'u2', reviewerRole: 'gm', decision: 'approved' });
  assert.equal(ex.status, 'approved');
  assert.equal(openingBlockers(c).includes('İkinci onay bekleyen istisna bulunuyor'), false);
});

test('opening evidence requires department maker and independent checker', () => {
  const c = createFranchiseCase({ id: 'FR-TEST-6' });
  assert.throws(() => submitOpeningEvidence(c, 'entry_fee_payment', { makerId: 'legal-1', makerRole: 'hk', evidenceSha256: 'a'.repeat(64), sourceReference: 'PAY-1' }), /ilgili departman/);
  submitOpeningEvidence(c, 'entry_fee_payment', { makerId: 'finance-1', makerRole: 'fn', evidenceSha256: 'a'.repeat(64), sourceReference: 'PAY-1' });
  assert.throws(() => reviewOpeningEvidence(c, 'entry_fee_payment', { checkerId: 'finance-1', checkerRole: 'gm', decision: 'approved' }), /kendi kaydını/);
  reviewOpeningEvidence(c, 'entry_fee_payment', { checkerId: 'gm-1', checkerRole: 'gm', decision: 'approved' });
  assert.equal(c.openingEvidence.find((item) => item.code === 'entry_fee_payment').status, 'approved');
});
