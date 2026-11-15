const test = require('node:test');
const assert = require('node:assert/strict');
const { aggregateReviews, monthlySeries, scopeRows, scopeRecords, timestamp, monthKey } = require('../assets/google-review-live-views.js');

const now = Date.parse('2026-11-15T12:00:00Z');
const branches = [{ city: 'Bursa', name: 'Nilüfer' }, { city: 'Kocaeli', name: 'Gebze' }, { city: 'Bursa', name: 'İnegöl' }];

test('scope keeps Bursa live records and each demo branch separate', () => {
  const rows = [
    { id: 1, erpReviewId: 'google-1', demo: false, store: 'Bursa Nilüfer' },
    { id: 2, demo: true, store: 'Kocaeli Gebze' },
    { id: 3, demo: true, store: 'Bursa İnegöl' },
    { id: 4, demo: false, store: 'Bursa Nilüfer' }, // no authoritative ERP ID
    { id: 5, demo: true, store: 'Bursa Nilüfer' }, // malformed demo cannot leak live
    { id: 6, demo: false, erpReviewId: 'another-live-branch', store: 'Other live branch' },
  ];
  assert.deepEqual(scopeRows(rows, 'live', branches).map(r => r.id), [1]);
  assert.deepEqual(scopeRows(rows, 'gebze', branches).map(r => r.id), [2]);
  assert.deepEqual(scopeRows(rows, 'inegol', branches).map(r => r.id), [3]);
  assert.equal(rows.length, 6);
});

test('task scoping requires authoritative live task identity and branch', () => {
  const records = [{ id: 'a', branchIdx: 0, erpItemId: 'erp-a' }, { id: 'b', branchIdx: 0 }, { id: 'c', branchIdx: 1 }, { id: 'd', branchIdx: 1, erpItemId: 'wrong-scope' }, { id: 'e', branchIdx: 2 }];
  assert.deepEqual(scopeRecords(records, 'live').map(r => r.id), ['a']);
  assert.deepEqual(scopeRecords(records, 'gebze').map(r => r.id), ['c']);
  assert.deepEqual(scopeRecords(records, 'inegol').map(r => r.id), ['e']);
});

test('empty data and missing policy do not fabricate SLA success or averages', () => {
  const a = aggregateReviews([], { now });
  assert.equal(a.count, 0);
  assert.equal(a.average, null);
  assert.equal(a.responseRate, null);
  assert.equal(a.slaRate, null);
  assert.equal(a.overdue, null);
  assert.equal(a.slaHours, null);
  assert.deepEqual(a.ratingCounts, [0, 0, 0, 0, 0]);
});

test('SLA uses real dated responses and excludes invalid, reversed and future timestamps', () => {
  const a = aggregateReviews([
    { stars: 5, status: 'gonderildi', createdAt: '2026-11-14T08:00:00Z', replyDate: '2026-11-14T10:00:00Z' },
    { stars: 2, status: 'gonderildi', createdAt: '2026-11-12T08:00:00Z', replyDate: '2026-11-14T09:00:00Z' },
    { stars: 3, status: 'gonderildi', createdAt: '2026-11-14T08:00:00Z', replyDate: null },
    { stars: 4, status: 'gonderildi', createdAt: '2026-11-14T08:00:00Z', replyDate: '2026-11-13T08:00:00Z' },
    { stars: 1, status: 'bekliyor', createdAt: '2026-11-10T00:00:00Z' },
    { stars: 1, status: 'bekliyor', createdAt: 'bad-date' },
    { stars: 1, status: 'bekliyor', createdAt: '2026-12-10T00:00:00Z' },
  ], { now, slaHours: 24 });
  assert.equal(a.timedAnswers, 2);
  assert.equal(a.slaRate, 50);
  assert.equal(a.datedPending, 1);
  assert.equal(a.overdue, 1);
  assert.equal(a.pending, 3);
  assert.deepEqual(a.durationBuckets, [0, 1, 0, 0, 1]);
  assert.equal(a.monthCount, 5);
});

test('monthly series uses Istanbul year boundaries and does not convert missing dates to today', () => {
  const series = monthlySeries([{ createdAt: '2025-12-31T20:59:59Z' }, { createdAt: '2025-12-31T23:59:59Z' }, { createdAt: '2026-01-01T00:00:00Z' }, { createdAt: null }, { createdAt: 'not-a-date' }, { createdAt: '2026-02-01T00:00:00Z' }], Date.parse('2026-01-15T00:00:00Z'), 3);
  assert.deepEqual(series.map(m => m.key), ['2025-11', '2025-12', '2026-01']);
  assert.deepEqual(series.map(m => m.count), [0, 1, 2]);
  assert.equal(timestamp(null), null);
  assert.equal(timestamp(''), null);
});

test('monthly target and review count share Istanbul calendar month at UTC month end', () => {
  const boundary = Date.parse('2026-10-31T22:30:00Z');
  assert.equal(monthKey(boundary), '2026-11');
  assert.equal(aggregateReviews([{ createdAt: '2026-10-31T21:30:00Z', stars: 5 }], { now: boundary }).monthCount, 1);
  assert.equal(monthlySeries([{ createdAt: '2026-10-31T21:30:00Z' }], boundary, 1)[0].key, '2026-11');
});

test('all records are read without mutation or exposing review text in aggregates', () => {
  const input = Object.freeze([Object.freeze({ stars: 5, text: 'private customer text', author: 'private name', status: 'bekliyor', createdAt: '2026-11-15T00:00:00Z' })]);
  const a = aggregateReviews(input, { now, slaHours: 12 });
  assert.equal(a.average, 5);
  assert.equal(a.overdue, 0); // exact SLA boundary is not overdue
  assert.ok(!JSON.stringify(a).includes('private'));
});
