import { createHash } from 'node:crypto';
import { DEFAULT_ACCIDENT_TERMS } from '../../../core.mjs';

export class NewsSourceError extends Error {
  constructor(message, { code = 'NEWS_SOURCE_ERROR', status = 500 } = {}) {
    super(message);
    this.name = 'NewsSourceError';
    this.code = code;
    this.status = status;
  }
}

export function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

export function assertAllowedUrl(value, allowedHosts) {
  const url = value instanceof URL ? value : new URL(value);
  if (url.protocol !== 'https:') {
    throw new NewsSourceError('Yalnız HTTPS adresleri işlenebilir.', { code: 'URL_PROTOCOL_INVALID', status: 400 });
  }
  const hosts = new Set((allowedHosts ?? []).map((host) => host.toLowerCase()));
  if (!hosts.has(url.hostname.toLowerCase())) {
    throw new NewsSourceError(`Alan adı izin listesinde değil: ${url.hostname}`, { code: 'URL_HOST_NOT_ALLOWED', status: 400 });
  }
  return url;
}

async function fetchWithSafeRedirects(value, source, { timeoutMs = 20_000, maxRedirects = 3 } = {}) {
  let url = assertAllowedUrl(value, source.allowedHosts);
  for (let i = 0; i <= maxRedirects; i += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.1',
        'User-Agent': 'OtoTR-OpenSourceVehicleIncident/0.2 (+news-rss)',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || i === maxRedirects) {
        throw new NewsSourceError('Yönlendirme güvenli biçimde tamamlanamadı.', { code: 'REDIRECT_FAILED', status: 502 });
      }
      url = assertAllowedUrl(new URL(location, url), source.allowedHosts);
      continue;
    }
    return { response, finalUrl: url };
  }
  throw new NewsSourceError('Yönlendirme sınırı aşıldı.', { code: 'REDIRECT_LIMIT', status: 502 });
}

async function readTextLimited(response, maximumBytes) {
  if (!response.ok) {
    throw new NewsSourceError(`Kaynak isteği başarısız (${response.status}).`, { code: 'SOURCE_HTTP_ERROR', status: response.status });
  }
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared && declared > maximumBytes) {
    throw new NewsSourceError('Kaynak gövdesi boyut sınırını aşıyor.', { code: 'SOURCE_TOO_LARGE', status: 413 });
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new NewsSourceError('Kaynak gövdesi boyut sınırını aşıyor.', { code: 'SOURCE_TOO_LARGE', status: 413 });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total).toString('utf8');
}

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function stripTags(value = '') {
  return decodeXml(String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}

function firstTag(xml, tag) {
  const match = String(xml).match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

export function parseRss(xml, sourceId = 'rss') {
  const items = [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const block = match[1];
    const title = stripTags(firstTag(block, 'title'));
    const description = stripTags(firstTag(block, 'description'));
    const link = stripTags(firstTag(block, 'link'));
    const guid = stripTags(firstTag(block, 'guid')) || link || `${sourceId}-${index}`;
    const pubDate = stripTags(firstTag(block, 'pubDate'));
    const publishedAt = pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null;
    return { id: guid, guid, title, description, link, publishedAt };
  });
  return items.filter((item) => item.title && item.link);
}

function trLower(value = '') {
  return String(value).toLocaleLowerCase('tr-TR');
}

export function matchesTerms(item, terms = DEFAULT_ACCIDENT_TERMS, excludedTerms = []) {
  const haystack = trLower(`${item.title ?? ''} ${item.description ?? ''}`);
  const included = (terms ?? []).some((term) => haystack.includes(trLower(term)));
  const excluded = (excludedTerms ?? []).some((term) => haystack.includes(trLower(term)));
  return included && !excluded;
}

export function inDateRange(item, startTime = null, endTime = null) {
  if (!item.publishedAt) return !startTime && !endTime;
  const time = Date.parse(item.publishedAt);
  if (startTime && time < Date.parse(startTime)) return false;
  if (endTime && time > Date.parse(endTime)) return false;
  return true;
}

function absoluteUrl(value, baseUrl) {
  try { return new URL(value, baseUrl).toString(); } catch { return null; }
}

function collectJsonLdImages(value, output = []) {
  if (!value) return output;
  if (typeof value === 'string') return output;
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdImages(item, output);
    return output;
  }
  if (typeof value === 'object') {
    const image = value.image;
    if (typeof image === 'string') output.push(image);
    else if (Array.isArray(image)) {
      for (const entry of image) {
        if (typeof entry === 'string') output.push(entry);
        else if (entry?.url) output.push(entry.url);
      }
    } else if (image?.url) output.push(image.url);
    for (const child of Object.values(value)) {
      if (child !== image && typeof child === 'object') collectJsonLdImages(child, output);
    }
  }
  return output;
}

export function extractArticleImages(html, articleUrl, { maximum = 8 } = {}) {
  const candidates = [];
  const og = String(html).match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    ?? String(html).match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);
  if (og?.[1]) candidates.push(og[1]);

  for (const match of String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { collectJsonLdImages(JSON.parse(match[1]), candidates); } catch { /* malformed publisher JSON-LD */ }
  }

  for (const match of String(html).matchAll(/<img\b[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)) {
    candidates.push(match[1]);
  }

  const seen = new Set();
  const output = [];
  for (const raw of candidates) {
    const resolved = absoluteUrl(raw, articleUrl);
    if (!resolved) continue;
    const lower = resolved.toLowerCase();
    if (/logo|avatar|icon|sprite|banner|reklam|advert|tracking|pixel/.test(lower)) continue;
    const normalized = normalizeUrl(resolved);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
    if (output.length >= maximum) break;
  }
  return output;
}

export function articleId(sourceId, canonicalUrl) {
  return createHash('sha256').update(`${sourceId}\n${normalizeUrl(canonicalUrl)}`).digest('hex').slice(0, 24);
}

export class RssNewsSource {
  constructor(config) {
    this.config = Object.freeze({
      type: 'rss_news',
      enabled: true,
      defaultTerms: DEFAULT_ACCIDENT_TERMS,
      excludedTerms: [],
      rateLimitMs: 1200,
      maxArticlesPerScan: 25,
      maximumFeedBytes: 2 * 1024 * 1024,
      maximumArticleBytes: 4 * 1024 * 1024,
      maximumImagesPerArticle: 8,
      supportsDateRange: true,
      ...config,
    });
  }

  get metadata() { return this.config; }

  async fetchItems({ terms, excludedTerms, startTime, endTime } = {}) {
    const { response } = await fetchWithSafeRedirects(this.config.feedUrl, this.config);
    const xml = await readTextLimited(response, this.config.maximumFeedBytes);
    const parsed = parseRss(xml, this.config.id);
    return parsed
      .filter((item) => matchesTerms(item, terms ?? this.config.defaultTerms, excludedTerms ?? this.config.excludedTerms))
      .filter((item) => inDateRange(item, startTime, endTime))
      .slice(0, this.config.maxArticlesPerScan);
  }

  async fetchArticle(item) {
    const { response, finalUrl } = await fetchWithSafeRedirects(item.link, this.config);
    const html = await readTextLimited(response, this.config.maximumArticleBytes);
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);
    const canonicalUrl = canonicalMatch?.[1] ? normalizeUrl(new URL(canonicalMatch[1], finalUrl).toString()) : normalizeUrl(finalUrl.toString());
    const images = extractArticleImages(html, canonicalUrl, { maximum: this.config.maximumImagesPerArticle });
    return {
      ...item,
      sourceId: this.config.id,
      sourceName: this.config.name,
      articleId: articleId(this.config.id, canonicalUrl),
      articleUrl: canonicalUrl,
      images,
    };
  }
}
