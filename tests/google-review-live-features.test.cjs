const test = require('node:test');
const assert = require('node:assert/strict');
const { validateResource, savePayload, definitions, categorySummary, sameNameGroups } = require('../assets/google-review-live-features.js');

test('all required modules have persisted resource schemas', () => {
  for (const key of ['templates', 'experiments', 'escalation_rules', 'notification_rules', 'store_groups', 'branch_settings', 'delegations', 'legal_cases', 'complaints', 'compensations', 'retention_policy', 'user_permissions', 'ai_config']) assert.ok(definitions[key]);
});

test('template saves enforce branch scope and discard unknown secret fields', () => {
  const input = Object.freeze({ name: 'Teşekkür', category: 'Olumlu', body: 'Teşekkür ederiz.', scope: 'global', api_key: 'must-not-propagate' });
  const result = validateResource('templates', input);
  assert.equal(result.scope, 'branch');
  assert.equal(result.body, input.body);
  assert.equal(result.api_key, undefined);
  assert.equal(input.scope, 'global');
});

test('experiments validate real variants, status and allocation', () => {
  const valid = { name: 'Üslup', variant_a: 'Kısa ve net', variant_b: 'Empatik', status: 'running', traffic_percent: 50 };
  assert.equal(validateResource('experiments', valid).status, 'running');
  assert.throws(() => validateResource('experiments', { ...valid, traffic_percent: 0 }), /1–100/);
  assert.throws(() => validateResource('experiments', { ...valid, status: 'winner' }), /geçersiz/);
  assert.throws(() => validateResource('experiments', { ...valid, variant_b: '' }), /gerekli/);
});

test('SLA and retention reject NaN, missing values and unsafe boundaries', () => {
  const branch = { lifecycle: 'active', tone: 'inherit', sla_hours: 24 };
  for (const sla_hours of ['', 0, 169, 1.5, Infinity, 'NaN']) assert.throws(() => validateResource('branch_settings', { ...branch, sla_hours }));
  assert.equal(validateResource('branch_settings', branch).sla_hours, 24);
  assert.throws(() => validateResource('retention_policy', { review_days: 0, closed_task_days: 365, audit_days: 365 }));
});

test('delegations require distinct users and ordered real datetimes', () => {
  const data = { from_user_id: 'alice', to_user_id: 'bob', starts_at: '2026-11-15T09:00:00Z', ends_at: '2026-11-16T09:00:00Z', scope: 'tasks', active: true };
  assert.equal(validateResource('delegations', data).starts_at, '2026-11-15T09:00:00.000Z');
  assert.throws(() => validateResource('delegations', { ...data, ends_at: data.starts_at }), /sonra/);
  assert.throws(() => validateResource('delegations', { ...data, to_user_id: 'alice' }), /farklı/);
});

test('resource updates carry original version and task updates carry work version', () => {
  const data = { work_item_id: 'task-one', category: 'Gecikme', notes: 'İnceleniyor', stage: 'review' };
  const payload = savePayload('legal_cases', data, { id: 'resource-one', version: 4 }, 7);
  assert.equal(payload.expected_version, 4);
  assert.equal(payload.expected_work_version, 7);
  assert.equal(payload.id, 'resource-one');
  assert.throws(() => savePayload('legal_cases', data, { id: 'resource-one', version: 4 }), /güncel sürümü/);
  assert.throws(() => savePayload('legal_cases', data, { id: 'resource-one', version: 0 }, 7), /sürümü/);
});

test('new singleton and notification records use allowed defaults without invented IDs', () => {
  const policy = savePayload('retention_policy', { review_days: 365, closed_task_days: 400, audit_days: 700 });
  assert.equal(policy.expected_version, 0);
  assert.equal(policy.id, undefined);
  const notification = validateResource('notification_rules', { user_id: 'auth-user', event: 'legal_hold', enabled: true, channels: ['email', 'whatsapp'] });
  assert.deepEqual(notification.channels, ['in_app']);
});

test('compensation payload is a tracking record without payment fields', () => {
  const result = validateResource('compensations', { work_item_id: 'task-one', amount: '125.50', reason: 'İnceleme', status: 'proposed', iban: 'never-include', payment: true });
  assert.equal(result.amount, 125.5);
  assert.equal(result.currency, 'TRY');
  assert.equal(result.iban, undefined);
  assert.equal(result.payment, undefined);
  assert.throws(() => validateResource('compensations', { ...result, amount: -1 }));
});

test('AI phrases are preserved as arrays and cannot carry provider credentials', () => {
  const result = validateResource('ai_config', { persona: 'Empatik', banned_words: 'garanti\n\n  tazminat  ', knowledge_lock: 'Yalnız kayıtlı bilgiler', api_key: 'forbidden' });
  assert.deepEqual(result.banned_words, ['garanti', 'tazminat']);
  assert.equal(result.api_key, undefined);
});

test('new resources retain the caller UUID for an uncertain-response retry', () => {
  const data = { name: 'Tek kayıt' };
  const createId = '66e730cb-e85a-41d5-b235-c5fbe9c16c9e';
  const first = savePayload('store_groups', data, null, undefined, createId);
  const retry = savePayload('store_groups', data, null, undefined, createId);
  assert.equal(first.id, createId);
  assert.equal(first.expected_version, 0);
  assert.deepEqual(first, retry);
});

test('complaint categories count persisted stages and exclude archived metadata', () => {
  const result = categorySummary([
    { data: { category: 'Gecikme', stage: 'received' }, updated_at: '2026-11-15T10:00:00Z' },
    { data: { category: 'Gecikme', stage: 'resolved' }, updated_at: '2026-11-16T10:00:00Z' },
    { data: { category: 'Gecikme', stage: 'received' }, archived: true },
    { data: { category: 'Rapor', stage: 'in_progress' }, updated_at: 'bad' },
  ]);
  assert.deepEqual(result[0], { name: 'Gecikme', total: 2, resolved: 1, open: 1, updated: '2026-11-16T10:00:00Z' });
  assert.equal(result[1].updated, null);
});

test('same-display-name groups cannot mix demo branches, anonymous people or duplicate tasks', () => {
  const task = (id, name, patch = {}) => ({ id, branch_id: 'branch-google-nilufer', kind: 'complaint', status: 'open', review_snapshot: { reviewer_name: name }, ...patch });
  const result = sameNameGroups([task('a', 'Özgür'), task('a', 'Özgür'), task('b', 'Özgür', { status: 'done' }), task('c', 'Özgür', { branch_id: 'demo-gebze' }), task('d', 'Özgür', { kind: 'legal' }), task('e', 'Google kullanıcısı'), task('f', 'Google kullanıcısı')]);
  assert.deepEqual(result, [{ name: 'Özgür', ids: ['a', 'b'], open: 1 }]);
});
