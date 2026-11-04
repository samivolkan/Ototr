import assert from 'node:assert/strict';
import test from 'node:test';
import { FRANCHISE_INTEGRATIONS, createIntegrationOutboxEvent, processIntegrationEvent } from '../gm-franchise/integration-adapters.mjs';

test('all required department adapters are declared', () => {
  const required = ['finance','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture','tasks'];
  assert.deepEqual(Object.keys(FRANCHISE_INTEGRATIONS), required);
});

test('outbox rejects events that do not belong to their source adapter', () => {
  assert.throws(() => createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'finance', type: 'employee.hired' }), /uyumsuz/);
});

test('unconfigured real adapter fails visibly instead of pretending success', () => {
  const event = createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'it', type: 'account.provisioning_requested' });
  const result = processIntegrationEvent(event);
  assert.equal(result.status, 'adapter_not_configured');
  assert.match(result.lastError, /staging/);
});

test('configured adapter records processed result', () => {
  const event = createIntegrationOutboxEvent({ franchiseCaseId: 'FR-1', source: 'hr', type: 'employee.hired' });
  const result = processIntegrationEvent(event, { hr: () => ({ externalId: 'HR-77' }) });
  assert.equal(result.status, 'processed');
  assert.equal(result.result.externalId, 'HR-77');
});
