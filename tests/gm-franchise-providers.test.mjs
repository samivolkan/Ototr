import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderRequest, deliverProviderRequest, redactProviderLog } from '../gm-franchise/provider-contracts.mjs';

const consent = (purpose, status = 'granted') => ({ id: `C-${purpose}`, subjectId: 'SUB-1', purpose, status, noticeVersion: '2026.11', capturedAt: '2026-11-04T12:00:00Z' });
const template = (variables) => ({ id: 'TPL-1', version: '3', status: 'approved', variables });

test('commercial message requires explicit commercial consent', () => {
  assert.throws(() => createProviderRequest({ franchiseCaseId: 'FR-1', businessKey: 'CAM-1', purpose: 'commercial_message', channel: 'whatsapp', recipientRef: 'CONTACT-1', consents: [consent('data_processing')], template: template(['candidateName', 'campaignName']), variables: { candidateName: 'Aday', campaignName: 'Test' } }), /commercial_communication/);
});

test('contract signature request is versioned and idempotent', () => {
  const input = { franchiseCaseId: 'FR-1', businessKey: 'CON-9', purpose: 'contract_signature', channel: 'esign', recipientRef: 'CONTACT-1', consents: [consent('data_processing')], template: template(['candidateName', 'contractNo', 'expiresAt']), variables: { candidateName: 'Aday', contractNo: 'S-9', expiresAt: '2026-11-12' } };
  const first = createProviderRequest(input);
  const second = createProviderRequest(input);
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.equal(first.templateVersion, '3');
});

test('withdrawn consent and incomplete template fail closed', () => {
  assert.throws(() => createProviderRequest({ franchiseCaseId: 'FR-1', businessKey: 'A-1', purpose: 'application_status', channel: 'sms', recipientRef: 'CONTACT-1', consents: [consent('data_processing', 'withdrawn')], template: template(['candidateName', 'applicationNo', 'status']), variables: { candidateName: 'A', applicationNo: 'APP-1', status: 'Ön değerlendirme' } }), /Aktif/);
  assert.throws(() => createProviderRequest({ franchiseCaseId: 'FR-1', businessKey: 'A-2', purpose: 'application_status', channel: 'email', recipientRef: 'CONTACT-1', consents: [consent('data_processing')], template: template(['candidateName']), variables: {} }), /Şablon değişkeni eksik/);
});

test('fake provider receives idempotency key and valid response is accepted', async () => {
  const request = createProviderRequest({ franchiseCaseId: 'FR-1', businessKey: 'R-1', purpose: 'appointment_reminder', channel: 'sms', recipientRef: 'CONTACT-1', consents: [consent('data_processing')], template: template(['candidateName', 'appointmentAt']), variables: { candidateName: 'A', appointmentAt: '2026-11-10T09:00:00+03:00' } });
  let received;
  const result = await deliverProviderRequest(request, { send: async (body, options) => { received = { body, options }; return { status: 'accepted', providerMessageId: 'FAKE-1' }; } });
  assert.equal(received.options.idempotencyKey, request.idempotencyKey);
  assert.equal(result.providerMessageId, 'FAKE-1');
});

test('invalid provider response is rejected and logs redact personal data', async () => {
  const request = { idempotencyKey: 'K' };
  await assert.rejects(deliverProviderRequest(request, { send: async () => ({ status: 'ok' }) }), /uyumsuz/);
  assert.deepEqual(redactProviderLog({ phone: '555', nested: { authorization: 'secret', status: 'failed' }, variables: { name: 'A' } }), { phone: '[REDACTED]', nested: { authorization: '[REDACTED]', status: 'failed' }, variables: '[REDACTED]' });
});
