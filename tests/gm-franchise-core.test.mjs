import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REQUIRED_ROLES,
  activateFranchiseCase,
  createFranchiseCase,
  hireStaff,
  openingBlockers,
  updateStaffCompliance
} from '../gm-franchise/franchise-core.mjs';

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
  assert.deepEqual(openingBlockers(c, { taskDone: true }), []);
  const result = activateFranchiseCase(c, { taskDone: true, branchId: 'BR-TEST-4' });
  assert.equal(result.ok, true);
  assert.equal(c.stage, 13);
  assert.equal(c.branch.id, 'BR-TEST-4');
  assert.equal(c.accessAccounts.length, 10);
  assert.deepEqual(c.followUps.map((x) => x.day), [30, 60, 90]);
  assert.ok(c.staffing.every((x) => x.branchId === 'BR-TEST-4' && x.accessStatus === 'active'));
});
