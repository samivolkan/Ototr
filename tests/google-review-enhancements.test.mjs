import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../assets/google-review-enhancements.js', import.meta.url), 'utf8');
function fixture(extra = {}) {
  const nodes = new Map();
  const doc = {
    getElementById: id => nodes.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createTextNode: text => ({ nodeType: 3, textContent: text }),
    createElement: tagName => ({ tagName, nodeType: 1, textContent: '', children: [], replaceChildren(...children) { this.children = children; } })
  };
  const context = { document: doc, ...extra };
  context.window = context;
  vm.runInNewContext(code, context);
  return { api: context.OTOTRReviewEnhancements, context, nodes };
}

test('same display name history stays within selected branch and live/demo environment', () => {
  const { api } = fixture();
  const branches = [{ city: 'Bursa', name: 'Nilüfer', live: true }, { city: 'Kocaeli', name: 'Gebze', live: false }];
  const reviews = [
    { id: -1, author: 'Ali', store: 'Bursa Nilüfer', demo: false },
    { id: -2, author: 'Ali', store: 'Bursa Nilüfer', demo: false },
    { id: 3, author: 'Ali', store: 'Bursa Nilüfer', demo: true },
    { id: 4, author: 'Ali', store: 'Kocaeli Gebze', demo: true },
    { id: -5, author: 'Ayşe', store: 'Bursa Nilüfer', demo: false }
  ];
  const complaints = [{ id: 'live', erpItemId: 'a', customer: 'Ali', branchIdx: 0 }, { id: 'demo', customer: 'Ali', branchIdx: 1 }];
  const data = { branches, reviews, complaints, legalCases: [] };
  const before = JSON.stringify(data);
  const history = api.relatedRecords('-1', data);
  assert.deepEqual(Array.from(history.reviews, row => row.id), [-1, -2]);
  assert.deepEqual(Array.from(history.complaints, row => row.id), ['live']);
  assert.equal(JSON.stringify(data), before, 'history must not mutate source records');
  assert.equal(api.relatedRecords('unknown', data), null);
});

test('history honors canonical branch IDs over similar names and omits unscoped records', () => {
  const { api } = fixture();
  const reviews = [
    { id: 1, branchId: 'bursa', store: 'Merkez', author: 'Ali', demo: false },
    { id: 2, branch_id: 'gebze', store: 'Merkez', author: 'Ali', demo: false },
    { id: 3, author: 'Ali', demo: false }
  ];
  assert.deepEqual(Array.from(api.relatedRecords(1, { reviews }).reviews, row => row.id), [1]);
});

test('escaped author strings decode once without interpreting HTML or invalid code points', () => {
  const { api } = fixture();
  assert.equal(api.displayText('A&#39;B &lt;img src=x&gt; &amp;lt;'), "A'B <img src=x> &lt;");
  assert.equal(api.displayText('&#x110000; &#0; &#xD800;'), '&#x110000; &#0; &#xD800;');
  assert.equal(api.displayText('&#x1f642;'), '🙂');
});

test('search uses literal text and safe DOM nodes for HTML-shaped customer input', () => {
  const { api } = fixture();
  const value = '<img src=x onerror=alert(1)> [.+] <script>evil()</script>';
  const node = { textContent: value, replaceChildren(...children) { this.children = children; } };
  api.highlightText(node, '<script>');
  assert.deepEqual(node.children.filter(child => child.nodeType === 1).map(child => child.tagName), ['mark']);
  assert.equal(node.children.map(child => child.textContent).join(''), value);
  assert.equal(node.children.find(child => child.tagName === 'mark').textContent, '<script>');
  assert.equal(api.matchSegments(value, '[.+]').filter(part => part.match).length, 1, 'regex metacharacters are literal');
});

test('Turkish matching preserves text and empty query creates no marks', () => {
  const { api } = fixture();
  const parts = api.matchSegments('İNEGÖL iyi', 'inegöl');
  assert.equal(parts[0].text, 'İNEGÖL');
  assert.equal(parts[0].match, true);
  assert.equal(api.matchSegments('x', ' ').some(part => part.match), false);
});

test('row filters show scoped counts and reset visibility without touching underlying data', () => {
  const { api } = fixture();
  const row = text => ({ cells: [{ textContent: 'a' }, { textContent: 'b' }, { textContent: text }], hidden: false });
  const rows = [row('review'), row('legal'), { cells: [{ textContent: 'Kayıt yok' }], hidden: false }];
  let count = api.filterTableRows(rows, 'legal', 2);
  assert.equal(count.visible, 1); assert.equal(count.total, 2);
  assert.equal(rows[0].hidden, true); assert.equal(rows[1].hidden, false);
  count = api.filterTableRows(rows, '', 2);
  assert.equal(count.visible, 2); assert.equal(rows[0].hidden, false);
});

test('last-loaded wrappers retain existing bridge callbacks and return values', () => {
  const calls = [];
  const { context } = fixture({
    renderReviews: (...args) => { calls.push(['reviews', ...args]); return 'bridge-result'; },
    renderComplaint: () => { calls.push(['complaint']); return 42; },
    renderAudit: () => { calls.push(['audit']); return true; }
  });
  assert.equal(context.renderReviews('refresh'), 'bridge-result');
  assert.equal(context.renderComplaint(), 42);
  assert.equal(context.renderAudit(), true);
  assert.deepEqual(calls, [['reviews', 'refresh'], ['complaint'], ['audit']]);
});

test('audit reset clears entity filter and delegates to existing reset callback', () => {
  let called = false;
  const f = fixture({ resetAudit: () => { called = true; return 'reset'; } });
  const filter = { value: 'legal' }; f.nodes.set('auditEntityF', filter);
  assert.equal(f.context.resetAudit(), 'reset');
  assert.equal(filter.value, ''); assert.equal(called, true);
});

test('enhancement module never writes browser storage or calls live mutation APIs', () => {
  assert.doesNotMatch(code, /\b(?:fetch|saveState|localStorage|sessionStorage|manageReview|createTask)\s*[.(]/);
  assert.doesNotMatch(code, /\.innerHTML\s*=/);
});
