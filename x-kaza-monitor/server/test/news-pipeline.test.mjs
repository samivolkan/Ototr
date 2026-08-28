import test from 'node:test';
import assert from 'node:assert/strict';
import { scanNewsSource } from '../src/news-pipeline.mjs';

function fakeStore() {
  const state = { sources: [], articles: [], candidates: [], scans: [] };
  return {
    state,
    getSource(id) { return state.sources.find((item) => item.id === id) ?? null; },
    async upsertSource(value) {
      const index = state.sources.findIndex((item) => item.id === value.id);
      if (index >= 0) state.sources[index] = { ...state.sources[index], ...value };
      else state.sources.push(value);
      return value;
    },
    findArticleByCanonical(sourceId, url) { return state.articles.find((item) => item.sourceId === sourceId && item.articleUrl === url) ?? null; },
    async upsertArticle(value) {
      const index = state.articles.findIndex((item) => item.articleId === value.articleId);
      if (index >= 0) state.articles[index] = { ...state.articles[index], ...value };
      else state.articles.push(value);
      return value;
    },
    findNewsCandidate(sourceId, articleId, imageUrl, plate) {
      return state.candidates.find((item) => item.sourceId === sourceId && item.articleId === articleId && item.imageUrl === imageUrl && item.selectedPlateNormalized === plate) ?? null;
    },
    async upsertCandidate(value) { state.candidates.push(value); return value; },
    async addScan(value) { state.scans.push(value); return value; },
  };
}

const source = {
  metadata: {
    id: 'trt-haber', name: 'TRT Haber — Türkiye', type: 'rss_news', enabled: true,
    baseUrl: 'https://www.trthaber.com/', feedUrl: 'https://www.trthaber.com/turkiye_articles.rss',
    allowedHosts: ['www.trthaber.com'], rateLimitMs: 0, maxArticlesPerScan: 10,
  },
  async fetchItems() {
    return [{ id: 'g1', title: 'Kaza haberi', description: 'Trafik kazası', link: 'https://www.trthaber.com/haber/x.html', publishedAt: '2026-08-27T10:00:00Z' }];
  },
  async fetchArticle(item) {
    return { ...item, sourceId: 'trt-haber', sourceName: 'TRT Haber — Türkiye', articleId: 'a1', articleUrl: item.link, images: ['https://www.trthaber.com/images/kaza.jpg'] };
  },
};

test('haber metninde plaka olsa bile OCR adayı yoksa candidate oluşmaz', async () => {
  const store = fakeStore();
  source.fetchItems = async () => [{ id: 'g1', title: '16 ABC 123 plakalı araç kaza yaptı', description: '16 ABC 123', link: 'https://www.trthaber.com/haber/x.html', publishedAt: '2026-08-27T10:00:00Z' }];
  const scan = await scanNewsSource({
    source, store,
    fetchImage: async () => Buffer.from('image'),
    recognize: async () => ({ text: 'NO PLATE', confidence: 80, plateCandidates: [] }),
  });
  assert.equal(scan.candidatesCreated, 0);
  assert.equal(store.state.candidates.length, 0);
});

test('OCR geçerli plaka bulduğunda insan onayına candidate üretir ve duplicate engeller', async () => {
  const store = fakeStore();
  source.fetchItems = async () => [{ id: 'g1', title: 'Kaza haberi', description: 'Trafik kazası', link: 'https://www.trthaber.com/haber/x.html', publishedAt: '2026-08-27T10:00:00Z' }];
  const options = {
    source, store,
    fetchImage: async () => Buffer.from('image'),
    recognize: async () => ({ text: '16 ABC 123', confidence: 91, plateCandidates: [{ plate: '16 ABC 123', normalized: '16ABC123', confidence: 91 }] }),
  };
  const first = await scanNewsSource(options);
  const second = await scanNewsSource(options);
  assert.equal(first.candidatesCreated, 1);
  assert.equal(second.candidatesCreated, 0);
  assert.equal(second.duplicatesSkipped, 1);
  assert.equal(store.state.candidates.length, 1);
  assert.equal(store.state.candidates[0].sourcePlatform, 'NEWS');
  assert.equal(store.state.candidates[0].status, 'review_pending');
});
