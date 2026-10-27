import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const callbackUrl = 'https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-business-oauth';
const erpUrl = 'https://samivolkan.github.io/Ototr/?google_oauth=success#google-reviews';

function bytesToBase64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function base64ToBytes(value: string) { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
async function cryptoKey() {
  const raw = base64ToBytes(Deno.env.get('GOOGLE_TOKEN_ENCRYPTION_KEY') || '');
  if (raw.length !== 32) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY 32 bayt base64 olmalıdır.');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cryptoKey(), encoder.encode(value)));
  return `${bytesToBase64(iv)}.${bytesToBase64(encrypted)}`;
}
async function decrypt(value: string) {
  const [iv, data] = value.split('.');
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(iv) }, await cryptoKey(), base64ToBytes(data));
  return decoder.decode(clear);
}
async function hmac(value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(Deno.env.get('GOOGLE_OAUTH_STATE_SECRET') || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
async function makeState(userId: string) {
  const payload = bytesToBase64(encoder.encode(JSON.stringify({ userId, exp: Date.now() + 10 * 60_000 }))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return `${payload}.${await hmac(payload)}`;
}
async function verifyState(state: string) {
  const [payload, signature] = state.split('.');
  if (!payload || !signature || signature !== await hmac(payload)) throw new Error('Geçersiz OAuth state.');
  const normalized = payload.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  const data = JSON.parse(decoder.decode(base64ToBytes(normalized)));
  if (!data.userId || data.exp < Date.now()) throw new Error('OAuth state süresi doldu.');
  return data.userId as string;
}
function env(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} tanımlı değil.`); return value; }
function injectedSupabaseKey(legacyName: string, dictionaryName: string) {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  const dictionary = env(dictionaryName);
  const environmentName = JSON.parse(dictionary)?.default;
  if (typeof environmentName !== 'string' || !environmentName) throw new Error(`${dictionaryName}.default tanımlı değil.`);
  const value = Deno.env.get(environmentName);
  if (!value) throw new Error(`${environmentName} tanımlı değil.`);
  return value;
}
function admin() { return createClient(env('SUPABASE_URL'), injectedSupabaseKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS'), { auth: { persistSession: false, autoRefreshToken: false } }); }
async function currentUser(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new RequestError('ERP oturumu gerekli.', 401);
  const client = createClient(env('SUPABASE_URL'), injectedSupabaseKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS'), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new RequestError('ERP oturumu geçersiz.', 401);
  return data.user;
}
async function accessToken(refreshToken: string, signal?: AbortSignal) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', ...(signal ? { signal } : {}), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env('GOOGLE_OAUTH_CLIENT_ID'), client_secret: env('GOOGLE_OAUTH_CLIENT_SECRET'), refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token yenileme başarısız.');
  return data.access_token as string;
}
async function googleJson(url: string, token: string, init: RequestInit = {}, strictJson = false) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const data = await response.json().catch(error => {
    if (strictJson && response.ok) throw init.signal?.aborted ? error : new GoogleApiError('Google veri yanıtı okunamadı. Tam veri alınamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
    return {};
  });
  if (!response.ok) throw new GoogleApiError(data.error?.message || data.error_description || 'Google Business Profile API hatası.', response.status, data.error?.status || 'GOOGLE_API_ERROR');
  return data;
}
class GoogleApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message); this.status = status; this.code = code;
  }
}
class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
async function authorizedConnection(db: ReturnType<typeof admin>, userId: string) {
  const { data: connection, error } = await db.from('google_business_connections').select('*').eq('id', 'ototr-primary').maybeSingle();
  if (error) throw new RequestError('Google bağlantı kaydı okunamadı.', 503);
  const allowedUsers = (Deno.env.get('GOOGLE_BUSINESS_ADMIN_USER_IDS') || '').split(',').map(value => value.trim()).filter(Boolean);
  // A browser role or editable user metadata must never grant access to the shared Google account.
  if (connection?.connected_by !== userId && !allowedUsers.includes(userId)) {
    throw new RequestError('Google yorum yönetimi yalnızca yetkilendirilmiş genel merkez hesabına açıktır.', 403);
  }
  return connection;
}
function paginatedUrl(base: string, pageToken: unknown) {
  const url = new URL(base);
  if (pageToken !== undefined && pageToken !== null && pageToken !== '') {
    if (typeof pageToken !== 'string' || pageToken.length > 8192) throw new RequestError('Geçersiz sayfalama anahtarı.', 400);
    url.searchParams.set('pageToken', pageToken);
  }
  return url.toString();
}

const workTable = 'google_review_work_items';
const connectionId = 'ototr-primary';
const branches: Record<string, { name: string; storeCode: string }> = {
  'branch-google-nilufer': { name: 'OTOTR Bursa Nilüfer Şube', storeCode: '13674839659006303129' },
  'branch-google-gebze': { name: 'OTOTR Gebze Şube', storeCode: '05971556162544786377' },
  'branch-google-inegol': { name: 'OTOTR Bursa İnegöl Şube', storeCode: '03710924650104046695' },
};
function syncBranchIds(value: unknown): string[] {
  if (value === undefined) return Object.keys(branches);
  if (!Array.isArray(value) || !value.length || value.length > 3 || value.some(id => typeof id !== 'string' || !Object.hasOwn(branches, id))) {
    throw new RequestError('Geçersiz senkronizasyon şubesi.', 400);
  }
  return [...new Set(value)];
}
async function googlePages(base: string, field: string, token: string, signal: AbortSignal) {
  const items: any[] = [], seen = new Set<string>();
  let pageToken = '', first: any;
  do {
    const page = await googleJson(paginatedUrl(base, pageToken), token, { signal }, true);
    if (!page || typeof page !== 'object' || Array.isArray(page) || (page[field] != null && !Array.isArray(page[field]))) {
      throw new GoogleApiError('Google veri yanıtı okunamadı. Tam veri alınamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
    }
    first ||= page;
    items.push(...(page[field] || []));
    const next = page.nextPageToken;
    if (next != null && (typeof next !== 'string' || next.length > 8192)) throw new GoogleApiError('Google sayfalama anahtarı geçersiz.', 502, 'INVALID_GOOGLE_RESPONSE');
    pageToken = next || '';
    if (pageToken && (seen.has(pageToken) || seen.size >= 500)) throw new GoogleApiError('Google sayfalaması tamamlanamadı. Önceki veriler korunuyor.', 502, 'INCOMPLETE_PAGINATION');
    if (pageToken) seen.add(pageToken);
  } while (pageToken);
  return { ...first, [field]: items };
}
async function mapThree<T, R>(items: T[], request: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await request(items[index]);
    }
  }));
  return results;
}
async function syncReviews(targets: string[], token: string, signal: AbortSignal) {
  // One request-scoped token; no global token or customer-data cache. Reads only.
  const accountPage = await googlePages('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20', 'accounts', token, signal);
  const accounts = [...new Set<string>(accountPage.accounts.map((account: any) => String(account?.name || '')))];
  if (accounts.some(name => !/^accounts\/\d+$/.test(name))) throw new GoogleApiError('Google hesap kimliği okunamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
  const groups = await mapThree(accounts, async accountName => {
    const page = await googlePages(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storeCode,metadata&pageSize=100`, 'locations', token, signal);
    return page.locations.map((location: any) => ({ ...location, accountName }));
  });
  const locations = groups.flat();
  const results = await mapThree(targets, async branch_id => {
    try {
      const matching = locations.filter(location => location.storeCode === branches[branch_id].storeCode);
      if (matching.some(location => !/^locations\/\d+$/.test(String(location.name || '')))) throw new GoogleApiError('Google konum kimliği okunamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
      // The same location may be accessible through more than one account wrapper.
      // Keep the wrapper and location together; never match by a similar title.
      const distinct = new Map(matching.map(location => [location.name, location]));
      if (distinct.size !== 1) throw new GoogleApiError(distinct.size ? 'Mağaza kodu birden fazla Google konumuyla eşleşiyor.' : 'Şubenin mağaza kodu Google hesabında bulunamadı.', 409, distinct.size ? 'AMBIGUOUS_LOCATION' : 'LOCATION_NOT_FOUND');
      const selected: any = matching.find(location => location.accountName === 'accounts/114698852482564472140') || matching.sort((a, b) => a.accountName.localeCompare(b.accountName))[0];
      const account_id = selected.accountName.slice('accounts/'.length), location_id = selected.name.slice('locations/'.length);
      const base = `https://mybusiness.googleapis.com/v4/accounts/${account_id}/locations/${location_id}/reviews`;
      const page = await googlePages(`${base}?pageSize=50&orderBy=updateTime%20desc`, 'reviews', token, signal);
      const unique = new Map<string, any>();
      for (const review of page.reviews) {
        const id = typeof review?.reviewId === 'string' && review.reviewId ? review.reviewId : String(review?.name || '').split('/').at(-1);
        if (!id || id.length > 512 || (review.name && review.name !== `accounts/${account_id}/locations/${location_id}/reviews/${id}`)) throw new GoogleApiError('Google yorum kimliği okunamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
        const current = unique.get(id);
        const updated = (item: any) => Math.max(Date.parse(item?.updateTime || item?.createTime || '') || 0, Date.parse(item?.reviewReply?.updateTime || '') || 0);
        if (!current || updated(review) > updated(current)) unique.set(id, review);
      }
      const reviews = [...unique.values()];
      const totalReviewCount = Number.isSafeInteger(page.totalReviewCount) && page.totalReviewCount >= 0 ? page.totalReviewCount : null;
      const { accountName: _, ...location } = selected;
      return { branch: { branch_id, account_id, location_id, location, reviews, averageRating: page.averageRating ?? null, totalReviewCount, pagination_complete: true, review_count_matches: totalReviewCount === null ? null : totalReviewCount === reviews.length } };
    } catch (error) {
      const timedOut = signal.aborted;
      return { error: { branch_id, error: timedOut ? 'Google senkronizasyonu zaman aşımına uğradı. Önceki veriler korunuyor.' : error instanceof Error ? error.message : 'Google yorumları alınamadı.', status: timedOut ? 504 : error instanceof GoogleApiError ? error.status : 502, code: timedOut ? 'GOOGLE_SYNC_TIMEOUT' : error instanceof GoogleApiError ? error.code : 'GOOGLE_SYNC_FAILED', source: 'google' } };
    }
  });
  return { connected: true, branches: results.flatMap(result => result.branch ? [result.branch] : []), errors: results.flatMap(result => result.error ? [result.error] : []) };
}
const taskKinds = ['branch', 'complaint', 'legal', 'quality', 'crisis'];
function reviewUrl(item: { account_id: string; location_id: string; review_id: string }) {
  return `https://mybusiness.googleapis.com/v4/accounts/${item.account_id}/locations/${item.location_id}/reviews/${encodeURIComponent(item.review_id)}`;
}
function workIdentity(body: any) {
  const account_id = String(body.account_id || ''), location_id = String(body.location_id || ''), review_id = String(body.review_id || '');
  const branch_id = String(body.branch_id || '');
  if (!/^\d+$/.test(account_id) || !/^\d+$/.test(location_id) || !review_id || review_id.length > 512 || !Object.hasOwn(branches, branch_id)) {
    throw new RequestError('Geçerli hesap, şube ve Google yorum kimliği gerekli.', 400);
  }
  return { connection_id: connectionId, account_id, location_id, review_id, branch_id, branch_name: branches[branch_id].name };
}
function workId(body: any) {
  const id = String(body.item_id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new RequestError('Geçerli görev kimliği gerekli.', 400);
  return id;
}
function expectedVersion(body: any) {
  if (!Number.isSafeInteger(body.expected_version) || body.expected_version < 1) throw new RequestError('Kayıt sürümü eksik. Listeyi yenileyin.', 400);
  return body.expected_version;
}
function databaseFailure(error: any) {
  if (error) throw new RequestError('Yorum görevleri kaydedilemedi veya okunamadı. İş akışı veritabanı kurulumunu kontrol edin.', 503);
}
async function getWork(db: any, body: any) {
  const { data, error } = await db.from(workTable).select('*').eq('connection_id', connectionId).eq('id', workId(body)).maybeSingle();
  databaseFailure(error);
  if (!data) throw new RequestError('Yorum görevi bulunamadı.', 404);
  if (data.version !== expectedVersion(body)) throw new RequestError('Kayıt başka bir oturumda değişti. Listeyi yenileyin.', 409);
  return data;
}
function safeReviewReplyUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(value)) return '';
  try {
    const url = new URL(value), path = decodeURIComponent(url.pathname);
    const pathAllowed = url.hostname === 'search.google.com' ? /^\/local\/reviews\/?$/.test(path)
      : url.hostname === 'maps.google.com' ? path === '/' || /^\/maps(?:\/|$)/.test(path)
      : url.hostname === 'business.google.com' ? /^\/[a-z][a-z0-9_-]{0,31}\/[A-Za-z0-9_-]{1,512}\/reviews\/[A-Za-z0-9_-]{1,512}\/?$/.test(path)
      : ['google.com', 'www.google.com'].includes(url.hostname) && (/^\/maps(?:\/|$)/.test(path) || /^\/search\/?$/.test(path));
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !pathAllowed || /(?:^|\/)(?:url|redirect|out|imgres)(?:\/|$)/i.test(path)) return '';
    for (const key of url.searchParams.keys()) if (/^(?:url|u|qurl|target|dest|destination|redirect.*|continue|next|return.*|callback|link|followup)$/.test(key.toLowerCase().replace(/[-_]/g, ''))) return '';
    return url.toString();
  } catch (_) { return ''; }
}
function withReviewReplyUrl(snapshot: any, value: unknown) {
  const { review_reply_url: previous, ...rest } = snapshot;
  const url = safeReviewReplyUrl(value) || safeReviewReplyUrl(previous);
  return { ...rest, ...(url ? { review_reply_url: url } : {}) };
}
async function verifiedReview(identity: ReturnType<typeof workIdentity>, token: string, signal?: AbortSignal) {
  const location = await googleJson(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${identity.location_id}?readMask=name,title,storeCode`, token, signal ? { signal } : {}, Boolean(signal));
  if (String(location.storeCode || '') !== branches[identity.branch_id].storeCode) throw new RequestError('Google konumu seçilen OTOTR şubesiyle eşleşmiyor.', 409);
  const review = await googleJson(reviewUrl(identity), token, signal ? { signal } : {}, Boolean(signal));
  if (String(review.reviewId || review.name?.split('/').pop() || '') !== identity.review_id) throw new RequestError('Google yorum kimliği doğrulanamadı.', 409);
  const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return { snapshot: withReviewReplyUrl({ comment: String(review.comment || '').slice(0, 6000), rating: stars[review.starRating] || 0, reviewer_name: String(review.reviewer?.displayName || 'Google kullanıcısı').slice(0, 180), review_date: review.createTime || null }, review.reviewReplyUrl), expected_reply: String(review.reviewReply?.comment || '') };
}
async function preparationItem(db: any, identity: ReturnType<typeof workIdentity>) {
  const result = await db.from(workTable).select('*').eq('connection_id', connectionId).eq('location_id', identity.location_id).eq('review_id', identity.review_id).eq('kind', 'reply').maybeSingle();
  databaseFailure(result.error);
  if (result.data && (result.data.account_id !== identity.account_id || result.data.branch_id !== identity.branch_id)) throw new RequestError('Bu yorumun kayıtlı hesap veya şube eşleşmesi farklı. Mevcut kaydı kullanın.', 409);
  return result.data;
}
function preparationResult(item: any, extra: any = {}) {
  return { item, preparing: item.status === 'preparing', requires_retry: item.status === 'draft_failed', ...extra };
}
async function prepareDraft(db: any, user: any, body: any, connection: any, authorization: string) {
  const identity = workIdentity(body), now = new Date().toISOString(), attemptId = crypto.randomUUID();
  let existing = await preparationItem(db, identity), item: any;
  const stale = existing?.status === 'preparing' && Date.now() - Date.parse(existing.updated_at) > 120_000;
  if (existing) {
    if (body.retry === true && (existing.status === 'draft_failed' || stale)) {
      if (workId(body) !== existing.id || expectedVersion(body) !== existing.version) throw new RequestError('Taslak başka oturumda değişti. Listeyi yenileyin.', 409);
      const claim = await db.from(workTable).update({ status: 'preparing', attempt_id: attemptId, last_error: null, version: existing.version + 1, updated_by: user.id, updated_at: now }).eq('connection_id', connectionId).eq('id', existing.id).eq('version', existing.version).eq('status', existing.status).eq('updated_at', existing.updated_at).select('*').maybeSingle();
      databaseFailure(claim.error);
      if (!claim.data) throw new RequestError('Bu taslak için başka işlem başladı. Listeyi yenileyin.', 409);
      item = claim.data;
    } else {
      if (stale) {
        const recovered = await db.from(workTable).update({ status: 'draft_failed', attempt_id: null, last_error: 'Önceki taslak hazırlığı tamamlanamadı. Yeniden hazırlamak için tekrar deneyin.', version: existing.version + 1, updated_by: user.id, updated_at: now }).eq('connection_id', connectionId).eq('id', existing.id).eq('version', existing.version).eq('status', 'preparing').eq('updated_at', existing.updated_at).select('*').maybeSingle();
        databaseFailure(recovered.error); existing = recovered.data || await preparationItem(db, identity);
      }
      return preparationResult(existing, { existing: true });
    }
  } else {
    if (body.retry === true || body.item_id) throw new RequestError('Yeniden hazırlanacak taslak bulunamadı.', 404);
    const claim = await db.from(workTable).insert({ ...identity, kind: 'reply', status: 'preparing', reply_text: '', expected_reply: '', review_snapshot: {}, draft_source: 'manual', note: '', version: 1, attempt_id: attemptId, last_error: null, approved_by: null, approved_at: null, published_at: null, created_by: user.id, updated_by: user.id, updated_at: now }).select('*').single();
    if (claim.error?.code === '23505') return preparationResult(await preparationItem(db, identity), { existing: true });
    databaseFailure(claim.error); item = claim.data;
  }
  async function finish(changes: any) {
    const result = await db.from(workTable).update({ ...changes, version: item.version + 1, attempt_id: null, updated_at: new Date().toISOString() }).eq('connection_id', connectionId).eq('id', item.id).eq('version', item.version).eq('attempt_id', attemptId).eq('status', 'preparing').select('*').maybeSingle();
    databaseFailure(result.error);
    if (!result.data) throw new RequestError('Taslak hazırlığı başka oturumda değişti. Listeyi yenileyin.', 409);
    return result.data;
  }
  const signal = AbortSignal.timeout(35_000);
  let snapshot: any = {}, skipped = false;
  try {
    const token = await accessToken(await decrypt(connection.refresh_token_encrypted), signal);
    const verified = await verifiedReview(identity, token, signal);
    snapshot = withReviewReplyUrl(verified.snapshot, verified.snapshot.review_reply_url || item.review_snapshot?.review_reply_url);
    if (verified.expected_reply) { skipped = true; throw new RequestError('Bu yorum Google’da zaten yanıtlanmış. Mevcut yanıt korundu.', 409); }
    // Forward the same ERP identity to the existing AI service. Its authorization,
    // canonical prompt, moderation and signature validation remain the only path.
    const response = await fetch(`${env('SUPABASE_URL')}/functions/v1/google-review-ai`, { method: 'POST', signal, headers: { Authorization: authorization, apikey: injectedSupabaseKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS'), 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', branch: { id: identity.branch_id }, review: { rating: snapshot.rating, comment: snapshot.comment, reviewerName: snapshot.reviewer_name } }) });
    const draft = await response.json().catch(() => null);
    if (!response.ok) throw new RequestError(typeof draft?.error === 'string' ? draft.error.slice(0, 800) : 'AI taslağı hazırlanamadı. Yeniden deneyin.', response.status);
    if (!draft || typeof draft.reply !== 'string' || draft.reply.length > 4000 || !draft.reply.endsWith(`${identity.branch_name} ekibi`) || typeof draft.requires_human_review !== 'boolean') throw new RequestError('AI yanıtı doğrulanamadı. Yeniden deneyin.', 502);
    const current = await verifiedReview(identity, token, signal);
    if (current.expected_reply) { skipped = true; throw new RequestError('Hazırlık sırasında bu yoruma Google’da yanıt verilmiş. Mevcut yanıt korundu.', 409); }
    if (current.snapshot.comment !== snapshot.comment || current.snapshot.rating !== snapshot.rating || current.snapshot.reviewer_name !== snapshot.reviewer_name) throw new RequestError('Yorum hazırlık sırasında değişti. Güncel yorum için taslağı yeniden hazırlayın.', 409);
    snapshot = withReviewReplyUrl(snapshot, current.snapshot.review_reply_url);
    const ai_analysis = { tone: draft.tone, requires_human_review: draft.requires_human_review, risk_reason: draft.risk_reason, suggested_route: draft.suggested_route, quality_score: draft.quality_score };
    return preparationResult(await finish({ status: 'approval_pending', reply_text: draft.reply, draft_source: 'openai', review_snapshot: { ...snapshot, ai_analysis }, expected_reply: '', last_error: null }));
  } catch (error) {
    const message = signal.aborted ? 'AI taslağı hazırlığı zaman aşımına uğradı. Yeniden denemek için tekrar hazırlayın.' : error instanceof RequestError || error instanceof GoogleApiError ? error.message : 'AI taslağı hazırlanamadı. Yeniden denemek için tekrar hazırlayın.';
    return preparationResult(await finish({ status: 'draft_failed', reply_text: '', draft_source: 'manual', review_snapshot: snapshot, last_error: message.slice(0, 800) }), { ...(skipped ? { skipped: true } : {}) });
  }
}
async function saveWork(db: any, user: any, body: any, token: string) {
  const identity = workIdentity(body), isReply = body.action === 'save_draft';
  const kind = isReply ? 'reply' : String(body.kind || 'branch');
  if (!isReply && !taskKinds.includes(kind)) throw new RequestError('Geçersiz görev türü.', 400);
  const reply = isReply ? String(body.reply_text || '').trim() : '';
  if (isReply && (!reply || reply.length > 4000)) throw new RequestError('Yanıt 1–4000 karakter olmalıdır.', 400);
  const source = ['openai', 'local_template', 'manual'].includes(body.draft_source) ? body.draft_source : 'manual';
  const verified = await verifiedReview(identity, token);
  let existingQuery = db.from(workTable).select('*').eq('connection_id', connectionId).eq('location_id', identity.location_id).eq('review_id', identity.review_id).eq('kind', kind);
  const { data: existing, error } = await existingQuery.maybeSingle(); databaseFailure(error);
  if (existing && existing.account_id !== identity.account_id) throw new RequestError('Bu Google yorumu başka hesap eşleşmesiyle kayıtlı. Mevcut görevi kullanın; hedef otomatik değiştirilmedi.', 409);
  if (existing && !isReply) return { item: existing, existing: true };
  if (existing && !body.item_id) {
    if (existing.reply_text === reply && existing.status === 'approval_pending') return { item: existing, existing: true };
    throw new RequestError('Bu yorum için kayıtlı yanıt var. Onay kuyruğundan açıp düzenleyin.', 409);
  }
  if (existing && (workId(body) !== existing.id || expectedVersion(body) !== existing.version)) throw new RequestError('Taslak başka oturumda değişti. Listeyi yenileyin.', 409);
  if (existing && !['approval_pending', 'publish_failed', 'draft_failed'].includes(existing.status)) throw new RequestError('Yayımlanan veya yayın sonucu beklenen taslak değiştirilemez.', 409);
  if (!existing && body.item_id) throw new RequestError('Düzenlenecek taslak bulunamadı.', 404);
  const now = new Date().toISOString();
  const values = { ...identity, kind, review_snapshot: withReviewReplyUrl(verified.snapshot, verified.snapshot.review_reply_url || existing?.review_snapshot?.review_reply_url), expected_reply: verified.expected_reply, reply_text: reply, draft_source: source, status: isReply ? 'approval_pending' : 'open', note: String(body.note || '').trim().slice(0, 2000), version: existing ? existing.version + 1 : 1, updated_by: user.id, updated_at: now, last_error: null, attempt_id: null, approved_by: null, approved_at: null, published_at: null };
  const result = existing
    ? await db.from(workTable).update(values).eq('connection_id', connectionId).eq('id', existing.id).eq('version', existing.version).in('status', ['approval_pending', 'publish_failed', 'draft_failed']).select('*').maybeSingle()
    : await db.from(workTable).insert({ ...values, created_by: user.id }).select('*').single();
  if (result.error?.code === '23505') throw new RequestError('Bu yorum için görev zaten oluşturuldu. Listeyi yenileyin.', 409);
  databaseFailure(result.error);
  if (!result.data) throw new RequestError('Taslak değişti. Listeyi yenileyin.', 409);
  return { item: result.data };
}
async function finishPublication(db: any, item: any, attemptId: string, changes: any) {
  const result = await db.from(workTable).update({ ...changes, updated_at: new Date().toISOString() }).eq('connection_id', connectionId).eq('id', item.id).eq('version', item.version).eq('attempt_id', attemptId).eq('status', 'publishing').select('*').maybeSingle();
  databaseFailure(result.error);
  if (!result.data) throw new RequestError('Yayın kaydı eşzamanlı değişti. Sonucu kontrol edin.', 409);
  return result.data;
}
function sameGoogleReply(actual: string, expected: string) {
  if (actual === expected) return true;
  const marker = '\n\n(Translated by Google)\n';
  // Observed Google formatting only: the complete original text, unchanged,
  // followed by one translation block. Never use case folding or fuzzy matching.
  if (!expected || expected.includes('(Translated by Google)')) return false;
  const split = actual.indexOf(marker);
  if (split !== expected.length || actual.slice(0, split) !== expected) return false;
  const translation = actual.slice(split + marker.length);
  return Boolean(translation.trim()) && !translation.includes('(Translated by Google)') && !translation.includes('(Original)');
}
const sentPendingMessage = 'Yanıt gönderildi, kontrol ediliyor. Google’ın yayın kontrolü bekleniyor.';
const outcomePendingMessage = 'Gönderim sonucu kontrol ediliyor.';
async function publishWork(db: any, user: any, body: any, token: string) {
  const item = await getWork(db, body), verifyOnly = body.action === 'verify_reply';
  if (item.kind !== 'reply') throw new RequestError('Bu kayıt yanıt taslağı değil.', 400);
  if (!verifyOnly && body.approved !== true) throw new RequestError('Bu yanıtı Google’da yayımlamak için açık onay gerekli.', 400);
  if (!verifyOnly && item.review_snapshot?.reply_conflict) throw new RequestError('Google’daki farklı yanıtı inceleyin ve taslağı yeniden kaydedin. Yeniden onay olmadan üzerine yazılmaz.', 409);
  if (item.status === 'published') return { item, already_published: true };
  const stalePublishing = item.status === 'publishing' && Date.now() - new Date(item.updated_at).getTime() > 90_000;
  if (item.status === 'publishing' && !stalePublishing) throw new RequestError('Yayın işlemi sürüyor. Sonucu biraz sonra kontrol edin.', 409);
  if (stalePublishing && !verifyOnly) throw new RequestError('Önce önceki yayının sonucunu kontrol edin.', 409);
  const allowed = verifyOnly ? ['publish_unknown', 'publishing', ...(item.approved_by && item.approved_at ? ['publish_failed'] : [])] : ['approval_pending', 'publish_failed', 'publish_unknown'];
  if (!allowed.includes(item.status)) throw new RequestError('Bu kaydın durumu bu işleme uygun değil.', 409);
  const attemptId = crypto.randomUUID(), now = new Date().toISOString();
  const claim = await db.from(workTable).update({ status: 'publishing', attempt_id: attemptId, updated_at: now, updated_by: user.id, ...(!verifyOnly ? { approved_by: user.id, approved_at: now } : {}) }).eq('connection_id', connectionId).eq('id', item.id).eq('version', item.version).eq('status', item.status).eq('updated_at', item.updated_at).select('*').maybeSingle();
  databaseFailure(claim.error);
  if (!claim.data) throw new RequestError('Bu yanıt için başka bir işlem başladı. Listeyi yenileyin.', 409);
  const signal = AbortSignal.timeout(20_000);
  let replySnapshot = { ...item.review_snapshot };
  function reviewIdentity(review: any) {
    const prefix = `accounts/${item.account_id}/locations/${item.location_id}/reviews/`;
    const id = typeof review?.reviewId === 'string' ? review.reviewId : typeof review?.name === 'string' && review.name.startsWith(prefix) ? review.name.slice(prefix.length) : '';
    if (!id || id.length > 512 || (review.reviewId != null && typeof review.reviewId !== 'string') || (review.name != null && review.name !== `${prefix}${id}`) || (review.reviewReply?.comment != null && typeof review.reviewReply.comment !== 'string')) throw new GoogleApiError('Google yorum kimliği veya yanıtı doğrulanamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
    return id;
  }
  function replyDiagnostics(review: any) {
    const state = (value: any) => ['PENDING', 'REJECTED', 'APPROVED', 'REVIEW_REPLY_STATE_UNSPECIFIED'].includes(value) ? value : value ? 'OTHER' : '';
    const value = review.reviewReplyUrl, link: any = { reviewReplyUrl_present: Object.hasOwn(review, 'reviewReplyUrl'), reviewReplyUrl_type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value, reviewReplyUrl_accepted: Boolean(safeReviewReplyUrl(value)) };
    try { if (typeof value === 'string' && value.length <= 4096) { const url = new URL(value); Object.assign(link, { reviewReplyUrl_hostname: url.hostname.slice(0, 253), reviewReplyUrl_path: url.pathname.replace(/[^/]+/g, part => /^(?:local|reviews?|maps|search|place|writereview|r|url|redirect|out)$/i.test(part) ? part : ':segment').slice(0, 256), reviewReplyUrl_query_parameter_names: [...new Set(url.searchParams.keys())].filter(key => /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(key)).slice(0, 20) }); } } catch (_) { /* Never retain the raw URL, credentials or query values. */ }
    return { reviewReply_present: Object.hasOwn(review, 'reviewReply'), reviewReply_comment_length: typeof review.reviewReply?.comment === 'string' ? review.reviewReply.comment.length : null, reviewReply_state: state(review.reviewReply?.reviewReplyState), reply_present: Object.hasOwn(review, 'reply'), reply_comment_length: typeof review.reply?.comment === 'string' ? review.reply.comment.length : null, reply_state: state(review.reply?.reviewReplyState), ...link };
  }
  async function readReview() {
    const review = await googleJson(reviewUrl(item), token, { signal }, true);
    if (reviewIdentity(review) !== item.review_id) throw new GoogleApiError('Google yorum kimliği doğrulanamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
    replySnapshot = withReviewReplyUrl({ ...replySnapshot, verification_diagnostics: { get: replyDiagnostics(review) } }, review.reviewReplyUrl);
    const needsModerationState = replySnapshot.google_reply_state === 'PENDING' && !review.reviewReply?.reviewReplyState;
    if (review.reviewReply?.comment && !needsModerationState) {
      replySnapshot = { ...replySnapshot, verification_source: 'reviews.get', verification_at: new Date().toISOString() };
      return review;
    }
    // Google may omit a reply or a previously pending reply's moderation state
    // from reviews.get while its fresh list includes it.
    // Resolve only this exact review, with full pagination and identity checks;
    // a missing or ambiguous entry must never permit an overwrite.
    const page = await googlePages(`https://mybusiness.googleapis.com/v4/accounts/${item.account_id}/locations/${item.location_id}/reviews?pageSize=50&orderBy=updateTime%20desc`, 'reviews', token, signal);
    const matches = page.reviews.filter((candidate: any) => reviewIdentity(candidate) === item.review_id);
    if (matches.length !== 1) throw new GoogleApiError('Google yorum listesinde bu kayıt kesin olarak doğrulanamadı. Yeniden gönderim yapılmadı.', 502, 'REVIEW_NOT_CONFIRMED');
    replySnapshot = withReviewReplyUrl({ ...replySnapshot, verification_source: 'reviews.list', verification_at: new Date().toISOString(), verification_diagnostics: { ...replySnapshot.verification_diagnostics, list: replyDiagnostics(matches[0]) } }, matches[0].reviewReplyUrl);
    const directComment = review.reviewReply?.comment, listedComment = matches[0].reviewReply?.comment;
    if (directComment && listedComment && !sameGoogleReply(directComment, listedComment) && !sameGoogleReply(listedComment, directComment)) throw new GoogleApiError('Google yanıt metni okumalar arasında farklı. Yeniden göndermeden sonucu tekrar kontrol edin.', 409, 'GOOGLE_REPLY_CONTENT_CONFLICT');
    const directState = review.reviewReply?.reviewReplyState;
    if (directState && directState !== 'APPROVED' && directState !== matches[0].reviewReply?.reviewReplyState) throw new GoogleApiError('Google yanıtının moderasyon durumu okumalar arasında farklı. Yeniden göndermeden sonucu tekrar kontrol edin.', 409, 'GOOGLE_REPLY_STATE_CONFLICT');
    if (!matches[0].reviewReply?.comment && (directState || matches[0].reviewReply?.reviewReplyState)) throw new GoogleApiError('Google yanıt durumu mevcut ancak metin doğrulanamadı. Yeniden göndermeden sonucu tekrar kontrol edin.', 409, 'GOOGLE_REPLY_STATE_UNCONFIRMED');
    return matches[0];
  }
  function rememberReply(reply: any) {
    const state = String(reply?.reviewReplyState || replySnapshot.google_reply_state || '');
    replySnapshot = { ...replySnapshot, google_reply_state: state, google_reply_policy_violation: state === 'REJECTED' ? String(reply?.policyViolation || replySnapshot.google_reply_policy_violation || '').slice(0, 200) : '' };
  }
  async function matchedReply(reply: any, alreadyPublished = false) {
    rememberReply(reply);
    delete replySnapshot.reply_conflict; delete replySnapshot.current_reply;
    const state = replySnapshot.google_reply_state;
    if (state === 'REJECTED') return { item: await finishPublication(db, item, attemptId, { status: 'publish_failed', review_snapshot: { ...replySnapshot, google_reply_accepted: true }, last_error: `Google yanıtı reddetti${replySnapshot.google_reply_policy_violation ? ` (${replySnapshot.google_reply_policy_violation})` : ''}. Metni inceleyip yeniden kaydedin; yeni onay gerekir.` }) };
    if (state && state !== 'APPROVED') return { item: await finishPublication(db, item, attemptId, { status: 'publish_unknown', review_snapshot: { ...replySnapshot, google_reply_accepted: true }, last_error: sentPendingMessage }) };
    if (!claim.data.approved_by || !claim.data.approved_at) throw new RequestError('Kayıtlı insan onayı olmadan yayın doğrulanamaz.', 409);
    return { item: await finishPublication(db, item, attemptId, { status: 'published', review_snapshot: replySnapshot, published_at: reply.updateTime || now, last_error: null }), ...(alreadyPublished ? { already_published: true } : {}) };
  }
  let writeStarted = false, writeDefinitelyRejected = false;
  try {
    const live = await readReview();
    const currentReply = String(live.reviewReply?.comment || '');
    if (sameGoogleReply(currentReply, item.reply_text)) return await matchedReply(live.reviewReply, true);
    if (verifyOnly) {
      if (!sameGoogleReply(currentReply, item.expected_reply)) {
        return { item: await finishPublication(db, item, attemptId, {
          status: 'publish_failed',
          review_snapshot: { ...replySnapshot, reply_conflict: true, current_reply: currentReply },
          last_error: 'Google’da farklı bir yanıt bulundu ve korundu. Mevcut yanıtı inceleyip taslağı yeniden kaydedin; yeni sürüm için yeniden onay gerekir.',
        }) };
      }
      return { item: await finishPublication(db, item, attemptId, { status: item.status === 'publish_failed' ? 'publish_failed' : 'publish_unknown', review_snapshot: replySnapshot, last_error: replySnapshot.google_reply_accepted ? sentPendingMessage : outcomePendingMessage }) };
    }
    if (!sameGoogleReply(currentReply, item.expected_reply)) throw new RequestError('Google’daki mevcut yanıt değişmiş. Yayın durduruldu; taslağı yeniden inceleyin.', 409);
    if (replySnapshot.google_reply_accepted) return { item: await finishPublication(db, item, attemptId, { status: replySnapshot.google_reply_state === 'REJECTED' ? 'publish_failed' : 'publish_unknown', review_snapshot: replySnapshot, last_error: replySnapshot.google_reply_state === 'REJECTED' ? 'Google yanıtı reddetti. Metni inceleyip yeniden kaydedin; yeni onay gerekir.' : sentPendingMessage }) };
    writeStarted = true;
    try {
      const receipt = await googleJson(`${reviewUrl(item)}/reply`, token, { method: 'PUT', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: item.reply_text }) }, true);
      if (sameGoogleReply(String(receipt.comment || ''), item.reply_text)) {
        rememberReply(receipt); replySnapshot.google_reply_accepted = true;
      }
    } catch (error) {
      writeDefinitelyRejected = error instanceof GoogleApiError && error.status >= 400 && error.status < 500;
      throw error;
    }
    const verified = await readReview();
    if (sameGoogleReply(String(verified.reviewReply?.comment || ''), item.reply_text)) return await matchedReply(verified.reviewReply);
    return { item: await finishPublication(db, item, attemptId, { status: replySnapshot.google_reply_state === 'REJECTED' ? 'publish_failed' : 'publish_unknown', review_snapshot: replySnapshot, last_error: replySnapshot.google_reply_state === 'REJECTED' ? `Google yanıtı reddetti${replySnapshot.google_reply_policy_violation ? ` (${replySnapshot.google_reply_policy_violation})` : ''}. Taslağı inceleyip yeniden kaydedin.` : replySnapshot.google_reply_accepted ? sentPendingMessage : outcomePendingMessage }) };
  } catch (error) {
    const uncertain = !writeDefinitelyRejected && (writeStarted || verifyOnly || item.status === 'publish_unknown' || stalePublishing);
    try { await finishPublication(db, item, attemptId, { status: uncertain ? 'publish_unknown' : 'publish_failed', review_snapshot: replySnapshot, last_error: uncertain ? replySnapshot.google_reply_accepted ? sentPendingMessage : outcomePendingMessage : String(error instanceof Error ? error.message : 'Yayın doğrulanamadı.').slice(0, 800) }); } catch (_) { /* Leave the claim intact; later verification recovers it. */ }
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.searchParams.has('code')) {
      const userId = await verifyState(url.searchParams.get('state') || '');
      const db = admin();
      await authorizedConnection(db, userId);
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: url.searchParams.get('code') || '', client_id: env('GOOGLE_OAUTH_CLIENT_ID'), client_secret: env('GOOGLE_OAUTH_CLIENT_SECRET'), redirect_uri: callbackUrl, grant_type: 'authorization_code' }) });
      const tokens = await response.json();
      if (!response.ok || !tokens.refresh_token) throw new Error(tokens.error_description || 'Google kalıcı erişim anahtarı alınamadı.');
      const { error } = await db.from('google_business_connections').upsert({ id: 'ototr-primary', connected_by: userId, oauth_client_id: env('GOOGLE_OAUTH_CLIENT_ID'), refresh_token_encrypted: await encrypt(tokens.refresh_token), scope: tokens.scope || '', connected_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) throw error;
      return Response.redirect(erpUrl, 302);
    }
    if (req.method !== 'POST') return json({ error: 'Desteklenmeyen yöntem.' }, 405);
    const user = await currentUser(req);
    const body = await req.json();
    const db = admin();
    const connection = await authorizedConnection(db, user.id);
    if (body.action === 'start') {
      const state = await makeState(user.id);
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.search = new URLSearchParams({ client_id: env('GOOGLE_OAUTH_CLIENT_ID'), redirect_uri: callbackUrl, response_type: 'code', scope: 'https://www.googleapis.com/auth/business.manage', access_type: 'offline', prompt: 'consent', login_hint: 'dijital@ototr.com', state }).toString();
      return json({ auth_url: authUrl.toString() });
    }
    const clientMatches = Boolean(connection && connection.oauth_client_id === env('GOOGLE_OAUTH_CLIENT_ID'));
    if (body.action === 'status') return json({ connected: clientMatches, connected_at: connection?.connected_at || null, reconnection_required: Boolean(connection && !clientMatches) });
    if (!connection) return json({ error: 'Google Business Profile bağlantısı kurulmamış.' }, 409);
    if (body.action === 'workflow_list') {
      const offset = Number(body.offset || 0);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new RequestError('Geçersiz liste sayfası.', 400);
      const { data, error } = await db.from(workTable).select('*').eq('connection_id', connectionId).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 99);
      databaseFailure(error); return json({ items: data || [], next_offset: data?.length === 100 ? offset + 100 : null });
    }
    if (body.action === 'update_task') {
      const item = await getWork(db, body);
      if (!taskKinds.includes(item.kind) || !['open', 'done'].includes(body.status)) throw new RequestError('Geçersiz görev durumu.', 400);
      const { data, error } = await db.from(workTable).update({ status: body.status, note: String(body.note || '').trim().slice(0, 2000), version: item.version + 1, updated_by: user.id, updated_at: new Date().toISOString() }).eq('connection_id', connectionId).eq('id', item.id).eq('version', item.version).select('*').maybeSingle();
      databaseFailure(error); if (!data) throw new RequestError('Görev başka oturumda değişti. Listeyi yenileyin.', 409);
      return json({ item: data });
    }
    if (body.action === 'reply') throw new RequestError('Doğrudan yayın kapalı. Kayıtlı taslağı onay kuyruğundan yayımlayın.', 400);
    if (!clientMatches) return json({ error: 'Google uygulama bağlantısı değişti. Google Hesabını Bağla ile hesabınızı yeniden yetkilendirin.', reconnection_required: true }, 409);
    if (body.action === 'prepare_draft') return json(await prepareDraft(db, user, body, connection, req.headers.get('authorization') || ''));
    const syncTargets = body.action === 'sync_reviews' ? syncBranchIds(body.branch_ids) : null;
    if (syncTargets) {
      const signal = AbortSignal.timeout(25_000);
      try {
        const token = await accessToken(await decrypt(connection.refresh_token_encrypted), signal);
        return json(await syncReviews(syncTargets, token, signal));
      } catch (error) {
        if (signal.aborted) throw new GoogleApiError('Google senkronizasyonu zaman aşımına uğradı. Önceki veriler korunuyor.', 504, 'GOOGLE_SYNC_TIMEOUT');
        throw error;
      }
    }
    const token = await accessToken(await decrypt(connection.refresh_token_encrypted));
    if (['save_draft', 'create_task'].includes(body.action)) return json(await saveWork(db, user, body, token));
    if (['publish_reply', 'verify_reply'].includes(body.action)) return json(await publishWork(db, user, body, token));
    if (body.action === 'accounts') {
      const data = await googleJson(paginatedUrl('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', body.page_token), token);
      return json(data);
    }
    if (body.action === 'locations') {
      const accountId = String(body.account_id || '');
      if (!/^accounts\/\d+$/.test(accountId)) return json({ error: 'Geçersiz Google hesap kimliği.' }, 400);
      const data = await googleJson(paginatedUrl(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storeCode,metadata&pageSize=100`, body.page_token), token);
      return json(data);
    }
    if (body.action === 'reviews') {
      const locationId = String(body.location_id || '');
      const accountId = String(body.account_id || '');
      if (!/^\d+$/.test(locationId) || !/^\d+$/.test(accountId)) return json({ error: 'Geçersiz Google hesap/konum kimliği.' }, 400);
      return json(await googleJson(paginatedUrl(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`, body.page_token), token));
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    if (error instanceof GoogleApiError) return json({ error: error.message, code: error.code, source: 'google' }, error.status);
    return json({ error: error instanceof Error ? error.message : 'Beklenmeyen hata.' }, 500);
  }
});
