import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const begin = html.indexOf('    const googleReputationState=');
const end = html.indexOf('    window.OTOTRGetLiveSession=', begin);
assert.ok(begin >= 0 && end > begin);

function screen() {
  const page = { innerHTML: '' };
  const context = vm.createContext({ URL, window: {}, document: { getElementById: id => id === 'page-google-reviews' ? page : null },
    icon: () => '', pageHeader: () => '', deptPlan: () => '', toast: () => {}, setTimeout: () => 0,
    localStorage: { getItem: () => null, setItem: () => {} } });
  vm.runInContext(html.slice(begin, end), context);
  const read = expression => vm.runInContext(expression, context);
  const api = context.window.OTOTRGoogleReputation;
  function addReview(extra = {}, branchId = 'branch-google-nilufer') {
    context.fixtureRaw = { reviewId: `opaque-api-id-${api.demoReviews.length}`, starRating: 'FIVE', comment: 'SENTETİK TEST yorumu',
      reviewer: { displayName: 'SENTETİK MÜŞTERİ' }, createTime: '2026-10-27T10:00:00Z', ...extra };
    context.fixtureBranch = branchId;
    const review = read('googleLiveReviewModel(fixtureRaw,getGoogleBranchById(fixtureBranch))');
    api.demoReviews.push(review); return review;
  }
  return { api, page, context, read, addReview, render() { api.render(); return page.innerHTML; },
    validate(value) { context.fixtureUrl = value; return read('googleSafeReviewUrl(fixtureUrl)'); } };
}

test('official per-review URLs stay attached to their own review and open from the left card', () => {
  const h = screen();
  const firstUrl = 'https://search.google.com/local/reviews?placeid=PLACE&reviewId=FIRST&hl=tr';
  const secondUrl = 'https://www.google.com/maps/reviews/data=SECOND?authuser=1';
  const first = h.addReview({ reviewReplyUrl: firstUrl });
  const second = h.addReview({ reviewReplyUrl: secondUrl, reviewReply: { comment: 'SENTETİK yanıt' } });
  assert.equal(first.reviewReplyUrl, firstUrl); assert.equal(second.reviewReplyUrl, secondUrl);
  const result = h.render();
  for (const [review, token] of [[first, 'FIRST'], [second, 'SECOND']]) {
    const article = result.split(`data-review-id="${review.id}"`)[1].split('</article>')[0];
    const left = article.split('<div class="google-reply-panel"')[0];
    assert.match(left, /Google’da yorumu aç/);
    assert.ok(left.includes(token));
    assert.match(left, /target="_blank" rel="noopener noreferrer"/);
  }
  assert.match(result, /placeid=PLACE&amp;reviewId=FIRST&amp;hl=tr/);
});

test('missing or unsafe per-review URL uses an honestly labelled branch profile, never a fabricated review URL', () => {
  const h = screen();
  h.read("getGoogleBranchById('branch-google-nilufer').publicProfileUrl='https://maps.google.com/maps?cid=12345'");
  const missing = h.addReview(), invalid = h.addReview({ reviewReplyUrl: 'javascript:alert(1)' });
  assert.equal(missing.reviewReplyUrl, ''); assert.equal(invalid.reviewReplyUrl, '');
  const result = h.render();
  assert.equal((result.match(/Google’da şubeyi aç/g) || []).length, 2);
  assert.equal((result.match(/href="https:\/\/maps.google.com\/maps\?cid=12345"/g) || []).length, 2);
  assert.doesNotMatch(result, /Google’da yorumu aç|href="[^"]*opaque-api-id/);
});

test('a missing safe profile leaves a clear unavailable message instead of a dangerous link', () => {
  const h = screen(); h.read("getGoogleBranchById('branch-google-nilufer').publicProfileUrl='https://evil.example/maps'");
  h.addReview({ reviewReplyUrl: '//www.google.com/maps' });
  const result = h.render();
  assert.match(result, /Google bağlantısı henüz alınamadı/);
  assert.doesNotMatch(result, /data-testid="google-review-open"/);
});

test('only known HTTPS Google review/profile surfaces are accepted', () => {
  const h = screen();
  for (const url of [
    'https://www.google.com/maps/search/?api=1&query=OTOTR',
    'https://google.com/search?q=OTOTR&hl=tr&authuser=1',
    'https://maps.google.com/?cid=123',
    'https://search.google.com/local/reviews?placeid=123&reviewId=abc#review',
    'https://www.google.com:443/maps/reviews',
  ]) assert.ok(h.validate(url), url);
  for (const url of [null, {}, '', ' javascript:alert(1)', 'javascript:alert(1)', 'data:text/html,hello',
    '//www.google.com/maps', 'http://www.google.com/maps', 'https://www.google.com:8443/maps',
    'https://user:password@www.google.com/maps', 'https://www.google.com.evil.example/maps',
    'https://evil.example/?next=https://www.google.com/maps', 'https://www.google.com./maps',
    'https://accounts.google.com/ServiceLogin', 'https://www.google.com/url?q=https://evil.example',
    'https://www.google.com/maps/redirect?url=https://evil.example',
    'https://www.google.com/maps/%75rl?q=https://evil.example',
    'https://search.google.com/local/reviews?redirect_uri=https://evil.example',
    'https://www.google.com/maps?continue=https://evil.example',
    'https://www.google.com/maps?returnTo=https://evil.example',
    'https://www.google.com/maps?TARGET=https://evil.example',
    'https://www.google.com/maps\\@evil.example', 'https://www.google.com/ma\nps',
  ]) assert.equal(h.validate(url), '', String(url));
});

test('URL query characters cannot escape the link href', () => {
  const h = screen(); h.addReview({ reviewReplyUrl: 'https://search.google.com/local/reviews?reviewId=%22%20onclick=%22alert(1)&hl=tr' });
  const result = h.render();
  const link = result.match(/<a[^>]*data-testid="google-review-open"[^>]*>/)?.[0];
  assert.ok(link); assert.doesNotMatch(link, /\sonclick=/); assert.match(link, /&amp;hl=tr/);
});

test('batch sync retains the official review URL with its exact branch and review identity', async () => {
  const h = screen(), branch = h.api.getBranchById('branch-google-gebze');
  const direct = 'https://search.google.com/local/reviews?placeid=GEBZE&reviewId=ONLY';
  h.context.window.OTOTRGoogleReviewAI = { googleBusinessRequest: async () => ({ connected: true, errors: [], branches: [{
    branch_id: branch.id, account_id: '123', location_id: branch.googleBusinessLocationId,
    location: { name: `locations/${branch.googleBusinessLocationId}`, storeCode: branch.storeCode, metadata: { mapsUri: 'https://maps.google.com/maps?cid=9' } },
    reviews: [{ reviewId: 'exact-id', starRating: 'FIVE', reviewReplyUrl: direct, reviewer: { displayName: 'SENTETİK' } }],
    pagination_complete: true, totalReviewCount: 1, averageRating: 5,
  }] }) };
  await h.api.syncGoogleReviewsForBranch(branch.id);
  const review = h.api.demoReviews.find(row => row.googleReviewId === 'exact-id');
  assert.equal(review.branchId, branch.id); assert.equal(review.reviewReplyUrl, direct);
});
