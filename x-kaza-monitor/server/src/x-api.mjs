import { normalizeDateTime, redactPostText } from '../../core.mjs';

export class XApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'XApiError';
    this.status = details.status ?? 500;
    this.code = details.code ?? 'X_API_ERROR';
    this.response = details.response ?? null;
  }
}

function requireToken(config) {
  if (!config.xBearerToken) {
    throw new XApiError('X_BEARER_TOKEN tanımlı değil.', {
      status: 503,
      code: 'X_TOKEN_MISSING',
    });
  }
}

async function xFetch(url, config, options = {}) {
  requireToken(config);
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.xBearerToken}`,
      'User-Agent': 'OtoTR-OpenSourceVehicleIncident-MVP/0.1',
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.detail || payload?.title || `X API isteği başarısız (${response.status}).`;
    throw new XApiError(message, {
      status: response.status,
      code: payload?.type || 'X_API_HTTP_ERROR',
      response: payload,
    });
  }
  return payload;
}

function buildSearchUrl(rule, config, paginationToken = null) {
  const endpoint = rule.mode === 'full_archive' ? config.xAllSearchUrl : config.xRecentSearchUrl;
  const url = new URL(endpoint);
  const maxResults = Math.max(10, Math.min(100, Number(rule.pageSize || 100)));
  url.searchParams.set('query', rule.query);
  url.searchParams.set('max_results', String(maxResults));
  url.searchParams.set('tweet.fields', 'id,text,author_id,created_at,lang,attachments,possibly_sensitive');
  url.searchParams.set('expansions', 'author_id,attachments.media_keys');
  url.searchParams.set('media.fields', 'media_key,type,url,preview_image_url,width,height,alt_text');
  url.searchParams.set('user.fields', 'id,name,username');

  const startTime = normalizeDateTime(rule.startTime);
  const endTime = normalizeDateTime(rule.endTime);
  if (startTime) url.searchParams.set('start_time', startTime);
  if (endTime) url.searchParams.set('end_time', endTime);
  if (paginationToken) url.searchParams.set('pagination_token', paginationToken);
  return url;
}

function indexBy(items, key) {
  return new Map((items ?? []).map((item) => [String(item[key]), item]));
}

function mapSearchPage(payload) {
  const users = indexBy(payload.includes?.users, 'id');
  const media = indexBy(payload.includes?.media, 'media_key');

  return (payload.data ?? []).map((post) => {
    const author = users.get(String(post.author_id)) ?? null;
    const mediaItems = (post.attachments?.media_keys ?? [])
      .map((key) => media.get(String(key)))
      .filter(Boolean)
      .map((item) => ({
        mediaKey: item.media_key,
        type: item.type,
        url: item.url ?? null,
        previewImageUrl: item.preview_image_url ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
        altText: item.alt_text ?? null,
      }));

    return {
      postId: String(post.id),
      text: redactPostText(post.text, 1000),
      createdAt: post.created_at ?? null,
      language: post.lang ?? null,
      possiblySensitive: post.possibly_sensitive === true,
      author: author
        ? { id: String(author.id), name: author.name, username: author.username }
        : null,
      sourceUrl: author?.username
        ? `https://x.com/${encodeURIComponent(author.username)}/status/${post.id}`
        : `https://x.com/i/status/${post.id}`,
      media: mediaItems,
    };
  });
}

export async function searchXPosts(rule, config) {
  const maximum = Math.max(1, Math.min(config.maxPostsPerScan, Number(rule.maxPosts || 100)));
  const posts = [];
  let nextToken = null;
  let requests = 0;

  do {
    const url = buildSearchUrl(rule, config, nextToken);
    const payload = await xFetch(url, config);
    posts.push(...mapSearchPage(payload));
    nextToken = payload.meta?.next_token ?? null;
    requests += 1;
  } while (nextToken && posts.length < maximum && requests < 20);

  return {
    posts: posts.slice(0, maximum),
    requests,
    newestId: posts[0]?.postId ?? null,
  };
}

export async function lookupXPosts(postIds, config) {
  const ids = [...new Set((postIds ?? []).map(String).filter(Boolean))].slice(0, 100);
  if (ids.length === 0) return { posts: [], errors: [] };

  const url = new URL(config.xPostLookupUrl);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('tweet.fields', 'id,text,author_id,created_at,lang,attachments,possibly_sensitive');
  url.searchParams.set('expansions', 'author_id,attachments.media_keys');
  url.searchParams.set('media.fields', 'media_key,type,url,preview_image_url,width,height,alt_text');
  url.searchParams.set('user.fields', 'id,name,username');

  const payload = await xFetch(url, config);
  return {
    posts: mapSearchPage(payload),
    errors: payload.errors ?? [],
  };
}

function validateMediaUrl(value, config) {
  const url = value instanceof URL ? value : new URL(value);
  if (url.protocol !== 'https:') {
    throw new XApiError('Yalnız HTTPS medya adresleri işlenebilir.', { status: 400, code: 'MEDIA_URL_INVALID' });
  }
  if (!config.mediaHostAllowlist.has(url.hostname.toLowerCase())) {
    throw new XApiError(`Medya alan adı izin listesinde değil: ${url.hostname}`, {
      status: 400,
      code: 'MEDIA_HOST_NOT_ALLOWED',
    });
  }
  return url;
}

async function fetchWithValidatedRedirects(initialUrl, config) {
  let url = validateMediaUrl(initialUrl, config);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OtoTR-OpenSourceVehicleIncident-MVP/0.1' },
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirectCount === 3) {
        throw new XApiError('Medya yönlendirmesi güvenli biçimde tamamlanamadı.', {
          status: 502,
          code: 'MEDIA_REDIRECT_FAILED',
        });
      }
      url = validateMediaUrl(new URL(location, url), config);
      continue;
    }
    return response;
  }
  throw new XApiError('Medya yönlendirme sınırı aşıldı.', { status: 502, code: 'MEDIA_REDIRECT_LIMIT' });
}

export async function fetchXImageBuffer(imageUrl, config) {
  const response = await fetchWithValidatedRedirects(imageUrl, config);
  if (!response.ok) {
    throw new XApiError(`Medya indirilemedi (${response.status}).`, {
      status: response.status,
      code: 'MEDIA_FETCH_FAILED',
    });
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new XApiError(`Beklenmeyen medya türü: ${contentType || 'bilinmiyor'}`, {
      status: 415,
      code: 'MEDIA_TYPE_INVALID',
    });
  }

  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > config.maxImageBytes) {
    throw new XApiError('Görsel izin verilen boyut sınırını aşıyor.', {
      status: 413,
      code: 'MEDIA_TOO_LARGE',
    });
  }

  if (!response.body) {
    throw new XApiError('Medya yanıt gövdesi bulunamadı.', { status: 502, code: 'MEDIA_BODY_MISSING' });
  }
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > config.maxImageBytes) {
      await reader.cancel();
      throw new XApiError('Görsel izin verilen boyut sınırını aşıyor.', {
        status: 413,
        code: 'MEDIA_TOO_LARGE',
      });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes);
}
