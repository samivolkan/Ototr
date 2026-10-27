import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const begin = html.indexOf('    const googleReputationState=');
const end = html.indexOf('    window.OTOTRGetLiveSession=', begin);
assert.ok(begin >= 0 && end > begin);

function screen(controller) {
  const page = { innerHTML: '' };
  const context = vm.createContext({ URL, window: { OTOTRGoogleReviewAI: controller },
    document: { getElementById: id => id === 'page-google-reviews' ? page : null },
    icon: () => '', pageHeader: () => '', deptPlan: () => '', toast: () => {}, setTimeout: () => 0,
    localStorage: { getItem: () => null, setItem: () => {} },
  });
  vm.runInContext(html.slice(begin, end), context);
  const read = expression => vm.runInContext(expression, context);
  const api = context.window.OTOTRGoogleReputation;
  function addReview(branchId = 'branch-google-nilufer', extra = {}) {
    context.fixtureRaw = { reviewId: `fixture-${api.demoReviews.length}`, starRating: 'FIVE',
      comment: 'SENTETİK TEST: Açıklamalar anlaşılırdı, teşekkür ederim.', reviewer: { displayName: 'TEST MÜŞTERİ' },
      createTime: '2026-10-28T09:30:00Z', ...extra };
    context.fixtureBranchId = branchId;
    const review = read('googleLiveReviewModel(fixtureRaw,getGoogleBranchById(fixtureBranchId))');
    api.demoReviews.push(review);
    return review;
  }
  return { page, api, read, addReview, context, render() { api.render(); return page.innerHTML; } };
}

test('each review renders its customer context on the left and its own controller draft on the right', () => {
  const calls = [];
  const h = screen({ renderReplyCard(review, branch) {
    calls.push({ review, branch });
    return `<div class="google-reply-heading">Hazır AI yanıtı</div><p class="google-reply-text">DRAFT-${review.id}</p>`;
  } });
  const first = h.addReview(), second = h.addReview(undefined, { reviewId: 'second', starRating: 'TWO', comment: 'SENTETİK TEST: Bekleme süresi uzundu.' });
  const result = h.render();
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.branch.id === 'branch-google-nilufer'));
  assert.equal((result.match(/data-testid="google-review-left"/g) || []).length, 2);
  assert.equal((result.match(/data-testid="google-review-right"/g) || []).length, 2);
  for (const review of [first, second]) {
    const article = result.split(`data-review-id="${review.id}"`)[1].split('</article>')[0];
    assert.ok(article.indexOf('google-review-source') < article.indexOf('google-reply-panel'));
    assert.match(article, /Müşteri yorumu/);
    assert.match(article, /OTOTR Oto Ekspertiz Bursa Nilüfer/);
    assert.match(article, /TEST MÜŞTERİ/);
    assert.match(article, /<time[^>]*datetime="2026-10-28T09:30:00Z"/);
    assert.ok(article.includes(`DRAFT-${review.id}`));
    assert.ok(article.indexOf('Diğer işlemler') > article.indexOf('google-reply-panel'));
  }
});

test('answered reviews show the existing escaped Google answer without an automatic draft or approval fallback', () => {
  const h = screen();
  h.addReview(undefined, { reviewReply: { comment: 'Mevcut gerçek yanıt <script>not-executed</script>' } });
  const result = h.render();
  assert.match(result, /Google’daki yanıt/);
  assert.match(result, /data-tone="published">Yayımlandı/);
  assert.match(result, /Mevcut gerçek yanıt &lt;script&gt;not-executed&lt;\/script&gt;/);
  assert.doesNotMatch(result, /<script>not-executed/);
  assert.doesNotMatch(result, /type="checkbox"|Yanıt Taslağı Oluştur|AI yanıt taslağı/);
});

test('rendering cards itself never generates or publishes a reply', () => {
  let generated = 0, published = 0;
  const h = screen({ generate() { generated++; }, publishReply() { published++; } });
  h.addReview(); h.render();
  assert.equal(generated, 0); assert.equal(published, 0);
  assert.match(h.page.innerHTML, /Yanıt bölümü yükleniyor/);
  assert.doesNotMatch(h.page.innerHTML, /type="checkbox"/);
});

test('the compact summary and task-only section do not repeat the approval reply list', () => {
  let options;
  const h = screen({
    renderAutoDraftSummary: id => `<div class="google-auto-draft-summary">${id}: 2 hazır taslak</div>`,
    renderWorkflow: (id, config) => { options = config; return config?.tasksOnly ? '<div>TASK-ONLY</div>' : '<div>DUPLICATE-REPLIES</div>'; },
  });
  h.addReview(); const result = h.render();
  assert.equal(options.tasksOnly, true);
  assert.match(result, /<details class="google-branch-tasks"><summary>Şube görevleri ve incelemeler<\/summary>/);
  assert.match(result, /TASK-ONLY/); assert.doesNotMatch(result, /DUPLICATE-REPLIES/);
  assert.equal((result.match(/2 hazır taslak/g) || []).length, 1);
});

test('branch and reply-status filters continue selecting the correct paired cards', () => {
  const h = screen();
  const pending = h.addReview();
  const answered = h.addReview(undefined, { reviewId: 'answered', reviewReply: { comment: 'Yanıtlandı' } });
  const other = h.addReview('branch-google-gebze');
  h.api.setFilter('unreplied'); const filtered = h.render();
  assert.ok(filtered.includes(`data-review-id="${pending.id}"`));
  assert.ok(!filtered.includes(`data-review-id="${answered.id}"`));
  assert.ok(!filtered.includes(`data-review-id="${other.id}"`));
  h.api.selectBranch('branch-google-gebze'); const branchScreen = h.render();
  assert.ok(branchScreen.includes(`data-review-id="${other.id}"`));
  assert.ok(!branchScreen.includes(`data-review-id="${pending.id}"`));
});

test('customer text is escaped and every task action remains attached to its own review', () => {
  const h = screen();
  const item = h.addReview(undefined, { comment: '<img src=x onerror=attack()>', reviewer: { displayName: '<iframe>TEST</iframe>' } });
  const result = h.render();
  assert.doesNotMatch(result, /<img src=x|<iframe>/);
  assert.match(result, /&lt;img src=x onerror=attack\(\)&gt;/);
  assert.match(result, /&lt;iframe&gt;TEST&lt;\/iframe&gt;/);
  for (const action of ['assignTaskToBranch', 'convertGoogleReviewToComplaint', 'sendToLegal', 'openQualityAudit']) {
    assert.ok(result.includes(`onclick="OTOTRGoogleReputation.${action}(&quot;${item.id}&quot;)"`));
  }
});

test('card styles provide desktop columns, mobile stacking and readable wrap-safe reply controls', () => {
  const css = html.match(/<style id="google-review-pair-styles">([\s\S]*?)<\/style>/)?.[1];
  assert.ok(css);
  assert.match(css, /grid-template-columns:minmax\(0,\.95fr\) minmax\(0,1\.05fr\)/);
  assert.match(css, /@media\(max-width:760px\)\{\.google-review-card\.premium\.google-review-pair\{grid-template-columns:1fr\}/);
  assert.match(css, /\.google-reply-text\{[^}]*white-space:pre-wrap;overflow-wrap:anywhere/);
  assert.match(css, /\.google-reply-editor\{[^}]*width:100%;[^}]*box-sizing:border-box/);
  assert.match(css, /\.google-reply-approval input\{[^}]*width:17px/);
  assert.match(css, /\.google-reply-primary:disabled/);
});
