const { test } = require('node:test');
const assert = require('node:assert/strict');
const { monthsFor, periodRows, monthKey, scopedRows, targetSeries, progress, BRANCH_IDS } = require('../assets/google-review-alternative.js');
const now = Date.parse('2026-11-16T20:00:00Z');

test('period boundaries use Istanbul months and include the current month', () => {
  assert.equal(monthKey('2026-10-31T22:00:00Z'), '2026-11');
  assert.deepEqual(monthsFor('quarter', now), ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(monthsFor('month', now), ['2026-11']);
  assert.equal(monthsFor('ytd', now).length, 11);
  assert.equal(monthsFor('year', now)[0], '2025-12');
});
test('period filter excludes invalid dates and future records', () => {
  const rows = ['2026-10-31T22:00:00Z', '2026-10-01', '2026-11-17', null, 'bad'].map(createdAt => ({ createdAt }));
  assert.equal(periodRows(rows, 'month', now).length, 1);
  assert.equal(periodRows(rows, 'quarter', now).length, 2);
});
test('Nilüfer live never includes demo or another branch', () => {
  const rows = [
    { id: 1, branchId: BRANCH_IDS[0], demo: false },
    { id: 2, branchId: BRANCH_IDS[0], demo: true },
    { id: 3, branchId: BRANCH_IDS[1], demo: true },
    { id: 4, branchId: BRANCH_IDS[1], demo: false },
    { id: 5, store: 'Bursa İnegöl', demo: true },
    { id: 6, store: 'Kocaeli Gebze', demo: true },
    // A display name must never override an explicit record identity.
    { id: 7, branch_id: 'unknown-branch', store: 'Bursa Nilüfer', demo: false },
    { id: 8, branch_id: 'unknown-branch', store: 'Kocaeli Gebze', demo: true }
  ];
  assert.deepEqual(scopedRows(rows, BRANCH_IDS[0]).map(r => r.id), [1]);
  assert.deepEqual(scopedRows(rows, BRANCH_IDS[1]).map(r => r.id), [3, 6]);
  assert.deepEqual(scopedRows(rows, BRANCH_IDS[2]).map(r => r.id), [5]);
  assert.deepEqual(scopedRows(rows, 'unrecognized'), []);
});
test('a current live target cannot be fabricated as historical target data', () => {
  const targets = [{ branch_id: BRANCH_IDS[0], month: '2026-11-01', target: 200 }, { branch_id: BRANCH_IDS[1], month: '2026-10-01', target: 99 }];
  assert.deepEqual(targetSeries(['2026-09', '2026-10', '2026-11'], targets, BRANCH_IDS[0], 999), [null, null, 200]);
  assert.deepEqual(targetSeries(['2026-11'], [], BRANCH_IDS[0], 200), [null]);
  assert.deepEqual(targetSeries(['2026-10', '2026-11'], [], BRANCH_IDS[1], 40), [40, 40]);
});
test('progress is honest for missing targets, zero actual and overachievement', () => {
  assert.equal(progress(14, 200), 7);
  assert.equal(progress(0, 200), 0);
  assert.equal(progress(15, null), null);
  assert.equal(progress(250, 200), 125);
});
