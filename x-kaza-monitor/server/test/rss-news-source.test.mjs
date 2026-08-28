import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAllowedUrl,
  articleId,
  extractArticleImages,
  inDateRange,
  matchesTerms,
  normalizeUrl,
  parseRss,
} from '../src/sources/rss-news-source.mjs';

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss><channel>
<item>
<title><![CDATA[Bursa'da iki otomobil çarpıştı]]></title>
<link>https://www.trthaber.com/haber/turkiye/ornek-kaza-1.html</link>
<description><![CDATA[<p>Trafik kazasında iki kişi yaralandı.</p>]]></description>
<pubDate>Thu, 27 Aug 2026 10:30:00 +0300</pubDate>
<guid>trt-1</guid>
</item>
<item>
<title>Yeni dizi tanıtıldı</title>
<link>https://www.trthaber.com/haber/kultur-sanat/ornek-2.html</link>
<description>Film ve dizi haberi</description>
<pubDate>Thu, 27 Aug 2026 11:30:00 +0300</pubDate>
<guid>trt-2</guid>
</item>
</channel></rss>`;

test('RSS parser temel alanları çıkarır', () => {
  const items = parseRss(FIXTURE, 'trt-haber');
  assert.equal(items.length, 2);
  assert.equal(items[0].guid, 'trt-1');
  assert.equal(items[0].title, "Bursa'da iki otomobil çarpıştı");
  assert.match(items[0].description, /Trafik kazasında/);
  assert.equal(items[0].publishedAt, '2026-08-27T07:30:00.000Z');
});

test('anahtar kelime filtresi kaza haberini seçer ve hariç kelimeyi dışlar', () => {
  const items = parseRss(FIXTURE, 'trt-haber');
  assert.equal(matchesTerms(items[0], ['kaza', 'çarpıştı'], ['film']), true);
  assert.equal(matchesTerms(items[1], ['dizi'], ['film']), false);
});

test('RSS tarih filtresi aralık dışı kaydı eler', () => {
  const item = parseRss(FIXTURE)[0];
  assert.equal(inDateRange(item, '2026-08-27T07:00:00Z', '2026-08-27T08:00:00Z'), true);
  assert.equal(inDateRange(item, '2026-08-28T00:00:00Z', null), false);
});

test('host allowlist HTTPS dışını ve yabancı hostu reddeder', () => {
  assert.equal(assertAllowedUrl('https://www.trthaber.com/a', ['www.trthaber.com']).hostname, 'www.trthaber.com');
  assert.throws(() => assertAllowedUrl('http://www.trthaber.com/a', ['www.trthaber.com']), /HTTPS/);
  assert.throws(() => assertAllowedUrl('https://evil.example/a', ['www.trthaber.com']), /izin listesinde/);
});

test('HTML og:image ve JSON-LD görsellerini çıkarır ve tekrarları engeller', () => {
  const html = `
  <html><head>
    <meta property="og:image" content="https://www.trthaber.com/images/kaza-main.jpg">
    <script type="application/ld+json">{"@type":"NewsArticle","image":["https://www.trthaber.com/images/kaza-main.jpg",{"url":"/images/kaza-2.jpg"}]}</script>
  </head><body>
    <img src="/images/logo.png">
    <img data-src="/images/kaza-3.jpg">
  </body></html>`;
  const images = extractArticleImages(html, 'https://www.trthaber.com/haber/turkiye/x.html');
  assert.deepEqual(images, [
    'https://www.trthaber.com/images/kaza-main.jpg',
    'https://www.trthaber.com/images/kaza-2.jpg',
    'https://www.trthaber.com/images/kaza-3.jpg',
  ]);
});

test('URL normalizasyonu takip parametrelerini siler ve article id kararlı kalır', () => {
  const first = normalizeUrl('https://www.trthaber.com/haber/x.html?utm_source=a&x=1#bolum');
  const second = normalizeUrl('https://www.trthaber.com/haber/x.html?x=1');
  assert.equal(first, second);
  assert.equal(articleId('trt-haber', first), articleId('trt-haber', second));
});
