import { RssNewsSource } from './rss-news-source.mjs';

export const TRT_HABER_SOURCE_CONFIG = Object.freeze({
  id: 'trt-haber',
  name: 'TRT Haber — Türkiye',
  type: 'rss_news',
  enabled: true,
  baseUrl: 'https://www.trthaber.com/',
  feedUrl: 'https://www.trthaber.com/turkiye_articles.rss',
  allowedHosts: ['www.trthaber.com', 'trthaber.com'],
  defaultTerms: [
    'kaza',
    'kazalı',
    'trafik kazası',
    'çarpıştı',
    'çarpışma',
    'takla attı',
    'kontrolden çıktı',
    'devrildi',
    'zincirleme kaza',
  ],
  excludedTerms: ['oyun', 'film', 'dizi', 'reklam'],
  rateLimitMs: 1500,
  maxArticlesPerScan: 25,
  supportsDateRange: true,
});

export function createTrtHaberSource(overrides = {}) {
  return new RssNewsSource({ ...TRT_HABER_SOURCE_CONFIG, ...overrides });
}
