import assert from 'node:assert/strict';
import test from 'node:test';
import { FRANCHISE_EVENT_CONTRACTS, FRANCHISE_INTEGRATIONS, createIntegrationOutboxEvent, processIntegrationEvent } from '../gm-franchise/integration-adapters.mjs';

test('all required department adapters are declared', () => {
  const required = ['finance','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture','tasks'];
  assert.deepEqual(Object.keys(FRANCHISE_INTEGRATIONS), required);
  for (const source of required) assert.deepEqual(Object.keys(FRANCHISE_EVENT_CONTRACTS[source]), FRANCHISE_INTEGRATIONS[source].events);
});

test('outbox rejects events that do not belong to their source adapter', () => {
  assert.throws(() => createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'finance', type: 'employee.hired' }), /uyumsuz/);
});

test('unconfigured real adapter fails visibly instead of pretending success', () => {
  const event = createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'it', type: 'account.provisioning_requested', payload: { branch_id: 'BR-1' } });
  const result = processIntegrationEvent(event);
  assert.equal(result.status, 'adapter_not_configured');
  assert.match(result.lastError, /staging/);
});

test('configured adapter records processed result', () => {
  const event = createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'hr', type: 'employee.hired', payload: { staff_id: 'STAFF-1', role_key: 'manager', branch_id: 'BR-1' } });
  const result = processIntegrationEvent(event, { hr: () => ({ externalId: 'HR-77' }) });
  assert.equal(result.status, 'processed');
  assert.equal(result.result.externalId, 'HR-77');
});

test('versioned payload contract rejects missing, unexpected and privacy-sensitive fields', () => {
  assert.throws(() => createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'finance', type: 'royalty_profile.created', payload: {} }), /zorunlu alan eksik/);
  assert.throws(() => createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'finance', type: 'royalty_profile.created', payload: { branch_id: 'BR-1', amount: 100 } }), /sözleşme dışı alan/);
  assert.throws(() => createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'finance', type: 'royalty_profile.created', payload: { branch_id: 'BR-1', nested: { iban: 'TR-SENTETIK' } } }), /yasaklı/);
  assert.throws(() => createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'finance', type: 'royalty_profile.created', payload: { branch_id: 'BR-1' }, contractVersion: 2 }), /sürümü/);
});

test('all 31 department event contracts accept their minimum synthetic payload', () => {
  let count = 0;
  for (const [source, events] of Object.entries(FRANCHISE_EVENT_CONTRACTS)) for (const [type, definition] of Object.entries(events)) {
    const payload = Object.fromEntries(definition.required.map((key) => [key, 'SENTETIK']));
    assert.equal(createIntegrationOutboxEvent({ franchiseCaseId: 'FR-CONTRACT', source, type, payload }).contractVersion, 1);
    count++;
  }
  assert.equal(count, 31);
});
