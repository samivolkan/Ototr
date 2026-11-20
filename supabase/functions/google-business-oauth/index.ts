import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { handleReviewManagement, loadReviewAccess, assertReviewLifecycle } from '../_shared/review-management.ts';
import { verifyAiGeneration, recordAiOutcome, AiTelemetryError } from '../_shared/google-review-ai-telemetry.ts';

import { runAutomation, automationStatus } from '../_shared/review-automation.ts';

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
async function authorizedConnection(db: ReturnType<typeof admin>, userId: string, branchId?: string) {
  const connection = await loadGoogleConnection(db);
  const allowedUsers = (Deno.env.get('GOOGLE_BUSINESS_ADMIN_USER_IDS') || '').split(',').map(value => value.trim()).filter(Boolean);
  // A browser role or editable user metadata must never grant access to the shared Google account.
  const access = await loadReviewAccess({db,userId,connection,allowlist:allowedUsers,branchId});
  if (!access) {
    throw new RequestError('Google yorum yönetimi yalnızca yetkilendirilmiş genel merkez hesabına açıktır.', 403);
  }
  connection._reviewAccess = access;
  return connection;
}
async function loadGoogleConnection(db: ReturnType<typeof admin>) {
  const { data: connection, error } = await db.from('google_business_connections').select('*').eq('id', 'ototr-primary').maybeSingle();
  if (error) throw new RequestError('Google bağlantı kaydı okunamadı.', 503);
  if (!connection) throw new RequestError('Google bağlantı kaydı bulunamadı.', 404);
  return connection;
}
async function authorizedGoogleRole(db: ReturnType<typeof admin>, userId: string, action: 'publish_reply' | 'verify_reply' | 'bulk_route', branchId?: string) {
  const connection = await loadGoogleConnection(db);
  const allowlist=(Deno.env.get('GOOGLE_BUSINESS_ADMIN_USER_IDS') || '').split(',').map(value=>value.trim()).filter(Boolean);
  const access=await loadReviewAccess({db,userId,connection,allowlist,branchId});
  if(!access) throw new RequestError('Google yorum yetkisi gerekli.',403);
  if(action==='publish_reply' && !access.can_approve) throw new RequestError('Google yorumu yayınlamak için modül yöneticisi veya geçerli onay delegasyonu gerekir.',403);
  if(access.role==='viewer' && !(action==='verify_reply' && access.can_approve)) throw new RequestError('Bu işlem için görev yetkisi gerekli.',403);
  return {connection,role:access.role==='admin'?'ADMIN':access.can_approve?'DELEGATED_APPROVER':access.role.toUpperCase()};
}
async function writeGoogleAudit(db: ReturnType<typeof admin>, input: { userId: string; role: string; action: string; entityType: string; entityId: string; beforeState?: unknown; afterState?: unknown; detail?: string; requestId?: string }) {
  const result = await db.from('google_review_audit_log').insert({
    connection_id: connectionId,
    actor_id: input.userId,
    actor_role: input.role,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    request_id: input.requestId || null,
    before_state: input.beforeState || {},
    after_state: input.afterState || {},
    detail: String(input.detail || '').slice(0, 2000),
  });
  databaseFailure(result.error);
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
const branches: Record<string, { name: string; storeCode: string; locationId: string }> = {
  'branch-google-nilufer': { name: 'OTOTR Bursa Nilüfer Şube', storeCode: '13674839659006303129', locationId: '13476693615171033693' },
  'branch-google-gebze': { name: 'OTOTR Gebze Şube', storeCode: '05971556162544786377', locationId: '7218866682466737157' },
  'branch-google-inegol': { name: 'OTOTR Bursa İnegöl Şube', storeCode: '03710924650104046695', locationId: '16859471132010192752' },
};
const customBranchPattern = /^branch-custom-[A-Za-z0-9-]{8,80}$/;
type BranchRegistryRow = { id: string; name: string; city: string; region: string; account_id?: string | null; store_code?: string | null; location_id?: string | null; mode?: string; lifecycle?: string; interval_minutes?: number; sla_hours?: number; target?: number; active?: boolean; google_verified_at?: string | null; last_sync_at?: string | null; onboarding?: Record<string, unknown> | null };
async function loadBranchRegistry(db: ReturnType<typeof admin>): Promise<BranchRegistryRow[]> {
  let result: any;
  try {
    result = await db.from('google_review_branch_registry').select('id,name,city,region,account_id,store_code,location_id,mode,lifecycle,interval_minutes,sla_hours,target,active,google_verified_at,last_sync_at,onboarding,created_at,updated_at').eq('connection_id', connectionId).order('name');
  } catch (error) {
    // The built-in Bursa/demo view remains readable during the short window
    // before the lifecycle migration is applied. Other errors still surface.
    if (String((error as any)?.message || error).startsWith('Unexpected table google_review_branch_registry')) return [];
    throw error;
  }
  if (result?.error && ['42P01', 'PGRST205'].includes(String(result.error.code || ''))) return [];
  databaseFailure(result?.error);
  const rows = (result.data || []) as BranchRegistryRow[];
  for (const row of rows) branches[row.id] = { name: row.name, storeCode: String(row.store_code || ''), locationId: String(row.location_id || '') };
  return rows;
}
function branchIdOf(body: any) { return String(body?.branch_id || managementBranchId); }
function managedBranchId(id: unknown) { const value = String(id || ''); return value === managementBranchId || customBranchPattern.test(value); }
function registryRow(rows: BranchRegistryRow[], id: string) { return rows.find(row => row.id === id) || null; }
function branchCanRead(row: BranchRegistryRow | null) { return !row || row.active !== false; }
function branchCanPublish(row: BranchRegistryRow | null) { return !row || row.lifecycle === 'live' || row.lifecycle === 'active'; }
function branchCanSync(row: BranchRegistryRow | null) { return !row || (row.onboarding?.test !== true && row.active !== false && (row.lifecycle === 'live' || row.lifecycle === 'active')); }
function branchSetup(body: Record<string, any>, previous?: BranchRegistryRow | null) {
  const text = (key: string, max: number) => { const value=String(body[key] ?? previous?.[key as keyof BranchRegistryRow] ?? '').trim(); if(value.length<2 || value.length>max) throw new RequestError('Şube adı, il ve bölge uzunluğu geçersiz.',400); return value; };
  const integer = (key: string, fallback: number, max: number, min=1) => { const value=Number(body[key] ?? previous?.[key as keyof BranchRegistryRow] ?? fallback); if(!Number.isInteger(value)||value<min||value>max) throw new RequestError('Kontrol aralığı, SLA veya hedef geçersiz.',400); return value; };
  const googleId = (key: string, max: number) => { const value=String(body[key] ?? previous?.[key as keyof BranchRegistryRow] ?? '').trim(); if(value && !new RegExp('^\\d{1,'+max+'}$').test(value)) throw new RequestError('Google kimlikleri yalnızca sayılardan oluşmalı.',400); return value || null; };
  const test = previous ? previous.onboarding?.test === true : body.test_mode === true;
  const account_id=googleId('account_id',32), store_code=googleId('store_code',64), location_id=googleId('location_id',32);
  if(test && (account_id||store_code||location_id)) throw new RequestError('Test şubesine canlı Google kimliği bağlanamaz.',400);
  const rawMap = body.map === undefined ? previous?.onboarding?.map : body.map;
  let map: {lat:number;lng:number;address:string}|null = null;
  if(rawMap != null) {
    const lat=Number(rawMap.lat),lng=Number(rawMap.lng),address=String(rawMap.address||'').trim();
    if(rawMap.lat==null||rawMap.lng==null||rawMap.lat===''||rawMap.lng===''||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||address.length>300) throw new RequestError('Harita enlemi ve boylamı geçerli olmalı.',400);
    map={lat,lng,address};
  }
  return {name:text('name',160),city:text('city',80),region:text('region',80),account_id,store_code,location_id,interval_minutes:integer('interval_minutes',60,1440,5),sla_hours:integer('sla_hours',24,168),target:integer('target',30,10000),onboarding:{...(previous?.onboarding||{}),test,map,google_account:Boolean(account_id),google_location:Boolean(location_id),store_code:Boolean(store_code)}};
}
async function seedBranchDefaults(db: ReturnType<typeof admin>, row: BranchRegistryRow, userId: string) {
  const now = new Date().toISOString();
  const lifecycle = row.lifecycle || (row.mode === 'live_candidate' ? 'live_candidate' : 'demo');
  const defaults = [
    { kind: 'branch_settings', data: { lifecycle, tone: 'inherit', sla_hours: Number(row.sla_hours || 24) } },
    { kind: 'ai_config', data: { persona: '', banned_words: [], knowledge_lock: '' } },
    { kind: 'retention_policy', data: { review_days: 365, closed_task_days: 365, audit_days: 1825 } },
    { kind: 'escalation_rules', key: 'sla_overdue', data: { name: 'SLA aşımı', event: 'sla_overdue', after_hours: 0, to_role: 'admin', enabled: true } },
  ];
  for (const item of defaults) {
    const key = item.key || 'default';
    const result = await db.from('google_review_management_resources').upsert({ connection_id: connectionId, branch_id: row.id, kind: item.kind, key, data: item.data, version: 1, created_by: userId, updated_by: userId, updated_at: now }, { onConflict: 'connection_id,branch_id,kind,key', ignoreDuplicates: true });
    databaseFailure(result.error);
  }
  const monthParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const month = `${monthParts.find(p=>p.type==='year')!.value}-${monthParts.find(p=>p.type==='month')!.value}-01`;
  const target = await db.from('google_review_targets').upsert({ connection_id: connectionId, branch_id: row.id, month, target: Number(row.target || 30), version: 1, updated_by: userId, updated_at: now }, { onConflict: 'connection_id,branch_id,month', ignoreDuplicates: true });
  databaseFailure(target.error);
  const policy = await db.from('google_review_collection_policies').upsert({ connection_id: connectionId, branch_id: row.id, enabled: false, send_hour: 18, delay_minutes: 120, cooldown_days: 30, channel: 'sms', template: 'Merhaba {{musteri_adi}}, hizmet deneyiminizi değerlendirmek ister misiniz? {{yorum_linki}}', updated_by: userId, updated_at: now }, { onConflict: 'connection_id,branch_id', ignoreDuplicates: true });
  databaseFailure(policy.error);
}
async function activateBranchSettings(db: ReturnType<typeof admin>, branchId: string, userId: string) {
  const config=await db.from('google_review_management_resources').select('data,version').eq('connection_id',connectionId).eq('branch_id',branchId).eq('kind','branch_settings').eq('key','default').eq('archived',false).maybeSingle();
  databaseFailure(config.error);
  if(!config.data) throw new RequestError('Şube çalışma ayarı bulunamadı. Kurulumu tekrar kaydedin.',409);
  if(config.data.data?.lifecycle==='live')return;
  const updated=await db.from('google_review_management_resources').update({data:{...config.data.data,lifecycle:'live'},version:config.data.version+1,updated_by:userId,updated_at:new Date().toISOString()}).eq('connection_id',connectionId).eq('branch_id',branchId).eq('kind','branch_settings').eq('key','default').eq('version',config.data.version).eq('archived',false).select('version').maybeSingle();
  databaseFailure(updated.error);
  if(!updated.data)throw new RequestError('Şube çalışma ayarı değişti. Kurulumu yenileyin.',409);
}
function syncBranchIds(value: unknown): string[] {
  if (value === undefined) return ['branch-google-nilufer'];
  if (!Array.isArray(value) || !value.length || value.length > 3 || value.some(id => typeof id !== 'string' || (!Object.hasOwn(branches, id) && !/^branch-custom-[A-Za-z0-9-]{8,80}$/.test(id)))) {
    throw new RequestError('Geçersiz senkronizasyon şubesi.', 400);
  }
  return [...new Set(value)];
}
function syncBranchConfigs(value: unknown, targets: string[]) {
  if (value === undefined) return {} as Record<string, { account_id?: string; store_code?: string; location_id?: string }>;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Geçersiz şube bağlantı ayarları.', 400);
  const source = value as Record<string, unknown>;
  const result: Record<string, { account_id?: string; store_code?: string; location_id?: string }> = {};
  for (const branchId of targets) {
    const raw = source[branchId];
    if (raw === undefined) continue;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new RequestError('Geçersiz şube bağlantı ayarı.', 400);
    const config = raw as Record<string, unknown>;
    const account_id = String(config.account_id || '').trim();
    const store_code = String(config.store_code || '').trim();
    const location_id = String(config.location_id || '').trim();
    if ((account_id && !/^\d{1,32}$/.test(account_id)) || (store_code && !/^\d{1,64}$/.test(store_code)) || (location_id && !/^\d{1,32}$/.test(location_id))) {
      throw new RequestError('Google hesap, mağaza ve konum kimlikleri yalnızca sayılardan oluşmalı.', 400);
    }
    if (!Object.hasOwn(branches, branchId) && (!account_id || !store_code)) throw new RequestError('Yeni şube senkronizasyonu için Google hesap ID ve mağaza kodu gerekli.', 400);
    result[branchId] = { ...(account_id ? { account_id } : {}), ...(store_code ? { store_code } : {}), ...(location_id ? { location_id } : {}) };
  }
  return result;
}
function reviewUpdateEpoch(review: any) {
  return Math.max(
    Date.parse(review?.updateTime || review?.createTime || '') || 0,
    Date.parse(review?.reviewReply?.updateTime || '') || 0,
  );
}
async function googlePages(base: string, field: string, token: string, signal: AbortSignal, stopBefore = 0) {
  const items: any[] = [], seen = new Set<string>(); let stoppedEarly = false;
  let pageToken = '', first: any;
  do {
    const page = await googleJson(paginatedUrl(base, pageToken), token, { signal }, true);
    if (!page || typeof page !== 'object' || Array.isArray(page) || (page[field] != null && !Array.isArray(page[field]))) {
      throw new GoogleApiError('Google veri yanıtı okunamadı. Tam veri alınamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
    }
    first ||= page;
    const pageItems = page[field] || [];
    items.push(...pageItems);
    if (stopBefore && field === 'reviews' && pageItems.length && pageItems.every((item: any) => reviewUpdateEpoch(item) <= stopBefore)) { stoppedEarly = true; break; }
    const next = page.nextPageToken;
    if (next != null && (typeof next !== 'string' || next.length > 8192)) throw new GoogleApiError('Google sayfalama anahtarı geçersiz.', 502, 'INVALID_GOOGLE_RESPONSE');
    pageToken = next || '';
    if (pageToken && (seen.has(pageToken) || seen.size >= 500)) throw new GoogleApiError('Google sayfalaması tamamlanamadı. Önceki veriler korunuyor.', 502, 'INCOMPLETE_PAGINATION');
    if (pageToken) seen.add(pageToken);
  } while (pageToken);
  return { ...first, [field]: items, ...(field === 'reviews' ? { pagination_complete: !stoppedEarly } : {}) };
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
async function syncReviews(targets: string[], token: string, signal: AbortSignal, sinceByBranch: Record<string, number> = {}, branchConfigs: Record<string, { account_id?: string; store_code?: string; location_id?: string }> = {}) {
  // One request-scoped token; no global token or customer-data cache. Reads only.
  // An advanced connection with account + location IDs is an exact resource
  // reference. Do not enumerate every account/location on every refresh in
  // that case; it is both faster and avoids a false “store code not found”
  // result when the profile is visible only through the configured account.
  const exactConfigs = new Map<string, { account_id: string; location_id: string; store_code?: string }>();
  for (const branchId of targets) {
    const configured = branchConfigs[branchId] || {};
    if (configured.account_id && configured.location_id) {
      exactConfigs.set(branchId, { account_id: configured.account_id, location_id: configured.location_id, ...(configured.store_code ? { store_code: configured.store_code } : {}) });
    }
  }
  const needsDiscovery = targets.some(branchId => !exactConfigs.has(branchId));
  let accounts: string[] = [];
  let locations: any[] = [];
  if (needsDiscovery) {
    const accountPage = await googlePages('https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20', 'accounts', token, signal);
    accounts = [...new Set<string>(accountPage.accounts.map((account: any) => String(account?.name || '')))];
    if (accounts.some(name => !/^accounts\/\d+$/.test(name))) throw new GoogleApiError('Google hesap kimliği okunamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
    const configuredAccountNames = new Set(targets.map(branchId => branchConfigs[branchId]?.account_id ? `accounts/${branchConfigs[branchId].account_id}` : '').filter(Boolean));
    const accountsToDiscover = configuredAccountNames.size ? accounts.filter(account => configuredAccountNames.has(account)) : accounts;
    const groups = await mapThree(accountsToDiscover, async accountName => {
      const page = await googlePages(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storeCode,metadata&pageSize=100`, 'locations', token, signal);
      return page.locations.map((location: any) => ({ ...location, accountName }));
    });
    locations = groups.flat();
  }
  const results = await mapThree(targets, async branch_id => {
    try {
      const configured = branchConfigs[branch_id] || {};
      const baseBranch = branches[branch_id] || { name: branch_id, storeCode: '', locationId: '' };
      const expected = { ...baseBranch, ...(configured.store_code ? { storeCode: configured.store_code } : {}), ...(configured.location_id ? { locationId: configured.location_id } : {}) };
      const accountHint = configured.account_id ? `accounts/${configured.account_id}` : '';
      let matching: any[] = [];
      if (exactConfigs.has(branch_id)) {
        const exact = exactConfigs.get(branch_id)!;
        let direct: any;
        try {
          direct = await googleJson(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${exact.location_id}?readMask=name,title,storeCode,metadata`, token, { signal }, true);
        } catch (error) {
          if (error instanceof GoogleApiError && error.status === 404) throw new GoogleApiError('Bağlı Google hesabı bu şubenin kayıtlı işletme profiline erişemiyor (Google: kayıt bulunamadı). Gelişmiş bağlantı ayarlarındaki hesap/konum kimliklerini kontrol edin. Önceki veriler korunuyor.', 404, 'LOCATION_UNAVAILABLE');
          throw error;
        }
        if (direct?.name !== `locations/${exact.location_id}`) throw new GoogleApiError('Google konum kimliği doğrulanamadı. Önceki veriler korunuyor.', 502, 'INVALID_GOOGLE_RESPONSE');
        if (exact.store_code && String(direct.storeCode || '') !== exact.store_code) throw new GoogleApiError('Gelişmiş bağlantı ayarlarındaki mağaza kodu Google konumuyla eşleşmiyor. Önceki veriler korunuyor.', 409, 'STORE_CODE_MISMATCH');
        matching = [{ ...direct, accountName: accountHint }];
      }
      // Store codes are editable. A pinned Google resource ID is also an exact identity.
      // Never infer a branch from its title; reject conflicting known branch codes.
      if (!matching.length) matching = locations.filter(location => (location.storeCode === expected.storeCode || location.name === `locations/${expected.locationId}`) && (!accountHint || location.accountName === accountHint));
      const directAccount = accountHint || (accounts.includes('accounts/114698852482564472140') ? 'accounts/114698852482564472140' : '');
      if (!matching.length && expected.locationId && directAccount && accounts.includes(directAccount)) {
        let direct;
        try { direct = await googleJson(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${expected.locationId}?readMask=name,title,storeCode,metadata`, token, { signal }, true); }
        catch (error) {
          if (error instanceof GoogleApiError && error.status === 404) throw new GoogleApiError('Bağlı Google hesabı bu şubenin kayıtlı işletme profiline erişemiyor (Google: kayıt bulunamadı). İşletme erişimi, taşınma veya profil birleştirme durumu kontrol edilmeli. Önceki veriler korunuyor.', 404, 'LOCATION_UNAVAILABLE');
          throw error;
        }
        if (direct?.name === `locations/${expected.locationId}`) matching.push({ ...direct, accountName: directAccount });
      }
      if (matching.some(location => Object.entries(branches).some(([id, branch]) => id !== branch_id && (location.storeCode === branch.storeCode || location.name === `locations/${branch.locationId}`)))) throw new GoogleApiError('Google konum eşleşmesi başka bir şubeyle çakışıyor.', 409, 'AMBIGUOUS_LOCATION');
      if (matching.some(location => !/^locations\/\d+$/.test(String(location.name || '')))) throw new GoogleApiError('Google konum kimliği okunamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
      // The same location may be accessible through more than one account wrapper.
      // Keep the wrapper and location together; never match by a similar title.
      const distinct = new Map(matching.map(location => [location.name, location]));
      if (distinct.size !== 1) throw new GoogleApiError(distinct.size ? 'Mağaza kodu birden fazla Google konumuyla eşleşiyor.' : 'Şubenin mağaza kodu Google hesabında bulunamadı.', 409, distinct.size ? 'AMBIGUOUS_LOCATION' : 'LOCATION_NOT_FOUND');
      const selected: any = matching.find(location => location.accountName === accountHint) || matching.find(location => location.accountName === 'accounts/114698852482564472140') || matching.sort((a, b) => a.accountName.localeCompare(b.accountName))[0];
      const account_id = selected.accountName.slice('accounts/'.length), location_id = selected.name.slice('locations/'.length);
      const base = `https://mybusiness.googleapis.com/v4/accounts/${account_id}/locations/${location_id}/reviews`;
      const since = Number(sinceByBranch[branch_id] || 0);
      const page = await googlePages(`${base}?pageSize=50&orderBy=updateTime%20desc`, 'reviews', token, signal, since);
      const candidateReviews = since > 0 ? page.reviews.filter((review: any) => reviewUpdateEpoch(review) > since) : page.reviews;
      const unique = new Map<string, any>();
      for (const review of candidateReviews) {
        const id = typeof review?.reviewId === 'string' && review.reviewId ? review.reviewId : String(review?.name || '').split('/').at(-1);
        if (!id || id.length > 512 || (review.name && review.name !== `accounts/${account_id}/locations/${location_id}/reviews/${id}`)) throw new GoogleApiError('Google yorum kimliği okunamadı.', 502, 'INVALID_GOOGLE_RESPONSE');
        const current = unique.get(id);
        const updated = (item: any) => reviewUpdateEpoch(item);
        if (!current || updated(review) > updated(current)) unique.set(id, review);
      }
      const reviews = [...unique.values()];
      const totalReviewCount = Number.isSafeInteger(page.totalReviewCount) && page.totalReviewCount >= 0 ? page.totalReviewCount : null;
      const { accountName: _, ...location } = selected;
      const pagination_complete = page.pagination_complete !== false;
      return { branch: { branch_id, account_id, location_id, location, reviews, averageRating: page.averageRating ?? null, totalReviewCount, pagination_complete, incremental: since > 0, since, review_count_matches: totalReviewCount === null || !pagination_complete ? null : totalReviewCount === reviews.length } };
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
  if (!/^\d+$/.test(account_id) || !/^\d+$/.test(location_id) || !review_id || review_id.length > 512 || !managedBranchId(branch_id) || !Object.hasOwn(branches, branch_id)) {
    throw new RequestError('Geçerli hesap, şube ve Google yorum kimliği gerekli.', 400);
  }
  managementScope({ branch_id });
  return { connection_id: connectionId, account_id, location_id, review_id, branch_id, branch_name: branches[branch_id]?.name || branch_id };
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
const managementBranchId = 'branch-google-nilufer';
const policyColumns = 'auto_reply_enabled,default_sla_hours,approver_roles,updated_at';
function managementScope(body: any) {
  const branchId = branchIdOf(body);
  if (!managedBranchId(branchId)) throw new RequestError('Bu demo şube canlı yönetim kapsamına alınamaz. Önce yeni şubeyi onboarding akışından aktifleştirin.', 400);
}
function managementFields(body: any, fields: string[]) {
  const allowed = new Set(['action', 'entity', 'branch_id', ...fields]);
  if (Object.keys(body).some(key => !allowed.has(key))) throw new RequestError('Bu işlem desteklenmeyen bir alan içeriyor.', 400);
}
async function readManagement(db: any, user: any, body: any, connection: any, clientMatches: boolean) {
  managementScope(body);
  const branchId = branchIdOf(body);
  const results = await Promise.all([
    db.from('google_review_policies').select(policyColumns).eq('connection_id', connectionId).maybeSingle(),
    db.from('google_review_audit_log').select('id,actor_id,actor_role,action,entity_type,entity_id,before_state,after_state,detail,created_at').eq('connection_id', connectionId).order('created_at', { ascending: false }).limit(200),
    db.from('app_users').select('id,auth_user_id,full_name,role,is_active,branch_id').order('full_name').limit(500),
    db.from('google_review_bulk_jobs').select('id,job_type,status,total_count,processed_count,success_count,failure_count,created_at,started_at,finished_at').eq('connection_id', connectionId).order('created_at', { ascending: false }).limit(100),
    db.from('google_review_email_outbox').select('id,template_key,status,created_at,sent_at').eq('connection_id', connectionId).order('created_at', { ascending: false }).limit(100),
  ]);
  for (const result of results) databaseFailure(result.error);
  if (!results[0].data) throw new RequestError('Google yorum politikası bulunamadı.', 503);
  const registry = branchId === managementBranchId ? null : await db.from('google_review_branch_registry').select('sla_hours,lifecycle,active,updated_at').eq('connection_id', connectionId).eq('id', branchId).maybeSingle();
  if (registry) databaseFailure(registry.error);
  const policy = registry?.data ? { ...results[0].data, default_sla_hours: registry.data.sla_hours, updated_at: registry.data.updated_at } : results[0].data;
  const allowedUsers = new Set([connection.connected_by, ...(Deno.env.get('GOOGLE_BUSINESS_ADMIN_USER_IDS') || '').split(',').map(value => value.trim()).filter(Boolean)]);
  return {
    branch_id: branchId,
    policy,
    audit: results[1].data || [],
    users: (results[2].data || []).map((row: any) => ({ id: row.id, full_name: row.full_name, role: row.role, is_active: row.is_active, branch_id: row.branch_id, google_management_enabled: allowedUsers.has(row.auth_user_id) })),
    jobs: results[3].data || [], notifications: results[4].data || [], templates: [], escalations: [],
    capabilities: { policy_sla: true, task_status: true, legal_hold: true, reject_draft: true, audit: true, users_read: true, users_write: false, templates: false, escalation_rules: false, notifications_read: true, notification_rules: false, auto_reply: false },
    settings: { google_connected: clientMatches, connected_at: connection.connected_at || null, manual_approval_required: true, openai_configured: Boolean(Deno.env.get('OPENAI_API_KEY')), openai_model: Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini', lifecycle: registry?.data?.lifecycle || 'live', branch_active: registry?.data?.active !== false },
  };
}
async function replyLegalHold(db: any, user: any, task: any, hold: boolean) {
  const result = await db.from(workTable).select('*').eq('connection_id', connectionId).eq('location_id', task.location_id).eq('review_id', task.review_id).eq('kind', 'reply').maybeSingle();
  databaseFailure(result.error);
  const reply = result.data;
  if (!reply) return;
  if (hold && ['publishing', 'publish_unknown', 'preparing'].includes(reply.status)) throw new RequestError('Yanıt işlemi sürüyor veya sonucu belirsiz. Sonucu doğruladıktan sonra hukuki kilidi uygulayın.', 409);
  if (Boolean(reply.review_snapshot?.legal_hold) === hold) return;
  const updated = await db.from(workTable).update({ review_snapshot: { ...reply.review_snapshot, legal_hold: hold }, version: reply.version + 1, updated_by: user.id, updated_at: new Date().toISOString() }).eq('connection_id', connectionId).eq('id', reply.id).eq('version', reply.version).eq('status', reply.status).eq('updated_at', reply.updated_at).select('id').maybeSingle();
  databaseFailure(updated.error);
  if (!updated.data) throw new RequestError('Yanıt eşzamanlı değişti. Hukuki kilidi yeniden kontrol edin.', 409);
}
async function assertNoLegalHold(db: any, item: any) {
  if (item.review_snapshot?.legal_hold) throw new RequestError('Hukuki kilit açık. Yanıt yayımlanmadan önce hukuk dosyasındaki kilit kaldırılmalı.', 409);
  const result = await db.from(workTable).select('review_snapshot').eq('connection_id', connectionId).eq('location_id', item.location_id).eq('review_id', item.review_id).eq('kind', 'legal').eq('status', 'open').maybeSingle();
  databaseFailure(result.error);
  if (result.data?.review_snapshot?.legal_hold) throw new RequestError('Hukuki kilit açık. Yanıt yayımlanmadan önce hukuk dosyasındaki kilit kaldırılmalı.', 409);
}
async function updateManagementTask(db: any, user: any, body: any, requestId?: string) {
  managementScope(body);
  const branchId = branchIdOf(body);
  managementFields(body, ['item_id', 'expected_version', 'status', 'hold', 'note']);
  const item = await getWork(db, body);
  if (item.branch_id !== branchId || !taskKinds.includes(item.kind)) throw new RequestError('Bu kayıt seçili şubenin yönetim görevi değil.', 400);
  if (!['status', 'hold', 'note'].some(key => Object.hasOwn(body, key))) throw new RequestError('Değiştirilecek görev alanı gerekli.', 400);
  if (body.status !== undefined && !['open', 'done'].includes(body.status)) throw new RequestError('Geçersiz görev durumu.', 400);
  if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 2000)) throw new RequestError('Görev notu en fazla 2000 karakter olmalıdır.', 400);
  if (body.hold !== undefined && (typeof body.hold !== 'boolean' || item.kind !== 'legal')) throw new RequestError('Hukuki kilit yalnızca hukuk dosyasında değiştirilebilir.', 400);
  const hold = body.hold ?? Boolean(item.review_snapshot?.legal_hold), status = body.status ?? item.status;
  if (hold && status === 'done') throw new RequestError('Dosyayı kapatmadan önce hukuki kilidi kaldırın.', 409);
  // Persist the task first: newly created reply rows must observe the hold too.
  // Then bump any existing reply version to defeat an already-read approval.
  const values = { status, note: body.note === undefined ? item.note : body.note.trim(), review_snapshot: { ...item.review_snapshot, ...(body.hold !== undefined ? { legal_hold: hold } : {}) }, version: item.version + 1, updated_by: user.id, updated_at: new Date().toISOString() };
  const result = await db.from(workTable).update(values).eq('connection_id', connectionId).eq('id', item.id).eq('version', item.version).select('*').maybeSingle();
  databaseFailure(result.error);
  if (!result.data) throw new RequestError('Görev başka oturumda değişti. Listeyi yenileyin.', 409);
  await writeGoogleAudit(db, { userId: user.id, role: 'OPERATOR', action: 'update_task', entityType: 'review_work_item', entityId: item.id, beforeState: { status: item.status, version: item.version, legal_hold: Boolean(item.review_snapshot?.legal_hold) }, afterState: { status, version: result.data.version, legal_hold: hold }, detail: body.hold !== undefined ? hold ? 'Hukuki yayın kilidi açıldı.' : 'Hukuki yayın kilidi kaldırıldı.' : 'Görev durumu veya notu güncellendi.', requestId });
  if (body.hold !== undefined) {
    try { await replyLegalHold(db, user, result.data, hold); }
    catch (error) { throw new RequestError(`Hukuk dosyasındaki kilit tercihi kaydedildi; yanıt kilidi tamamlanamadı. Listeyi yenileyip aynı işlemi tekrar deneyin. ${error instanceof RequestError ? error.message : ''}`, error instanceof RequestError ? error.status : 503); }
  }
  return { item: result.data };
}
async function updateManagement(db: any, user: any, body: any, requestId?: string) {
  managementScope(body);
  const branchId = branchIdOf(body);
  if (body.entity === 'task') return await updateManagementTask(db, user, body, requestId);
  if (body.entity !== 'policy') throw new RequestError('Bu yönetim alanı sunucuda desteklenmiyor.', 400);
  managementFields(body, ['expected_updated_at', 'default_sla_hours']);
  if (!Number.isSafeInteger(body.default_sla_hours) || body.default_sla_hours < 1 || body.default_sla_hours > 168 || typeof body.expected_updated_at !== 'string' || !Number.isFinite(Date.parse(body.expected_updated_at))) throw new RequestError('SLA 1–168 saat ve güncel kayıt sürümü gerekli.', 400);
  if (branchId !== managementBranchId) {
    const registry = await db.from('google_review_branch_registry').select('id,sla_hours,active,lifecycle,updated_at').eq('connection_id', connectionId).eq('id', branchId).maybeSingle();
    databaseFailure(registry.error);
    if (!registry.data || registry.data.active === false) throw new RequestError('Şube kaydı bulunamadı veya pasif.', 404);
    if (!branchCanRead(registry.data)) throw new RequestError('Şube pasif.', 409);
    if (registry.data.updated_at !== body.expected_updated_at) throw new RequestError('Şube ayarı başka oturumda değişti. Yenileyin.', 409);
    const saved = await db.from('google_review_branch_registry').update({ sla_hours: body.default_sla_hours, updated_by: user.id, updated_at: new Date().toISOString() }).eq('connection_id', connectionId).eq('id', branchId).eq('updated_at', body.expected_updated_at).select('id,sla_hours,updated_at').maybeSingle();
    databaseFailure(saved.error);
    if (!saved.data) throw new RequestError('Şube ayarı başka oturumda değişti. Yenileyin.', 409);
    await writeGoogleAudit(db, { userId: user.id, role: 'OPERATOR', action: 'policy_update', entityType: 'google_review_branch_registry', entityId: branchId, beforeState: { default_sla_hours: registry.data.sla_hours }, afterState: { default_sla_hours: saved.data.sla_hours }, detail: `${branchId} şube SLA süresi güncellendi.`, requestId });
    return { policy: { connection_id: connectionId, branch_id: branchId, default_sla_hours: saved.data.sla_hours, updated_at: saved.data.updated_at } };
  }
  const before = await db.from('google_review_policies').select(policyColumns).eq('connection_id', connectionId).maybeSingle();
  databaseFailure(before.error);
  if (!before.data || before.data.updated_at !== body.expected_updated_at) throw new RequestError('Politika başka oturumda değişti. Ayarları yenileyin.', 409);
  const result = await db.from('google_review_policies').update({ default_sla_hours: body.default_sla_hours, updated_by: user.id, updated_at: new Date().toISOString() }).eq('connection_id', connectionId).eq('updated_at', body.expected_updated_at).select(policyColumns).maybeSingle();
  databaseFailure(result.error);
  if (!result.data) throw new RequestError('Politika başka oturumda değişti. Ayarları yenileyin.', 409);
  await writeGoogleAudit(db, { userId: user.id, role: 'OPERATOR', action: 'policy_update', entityType: 'google_review_policy', entityId: connectionId, beforeState: { default_sla_hours: before.data.default_sla_hours }, afterState: { default_sla_hours: result.data.default_sla_hours }, detail: 'Bursa yorum SLA süresi güncellendi.', requestId });
  return { policy: result.data };
}
async function rejectDraft(db: any, user: any, body: any, requestId?: string) {
  managementScope(body);
  const branchId = branchIdOf(body);
  managementFields(body, ['item_id', 'expected_version', 'reason']);
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000) throw new RequestError('1–1000 karakter ret gerekçesi gerekli.', 400);
  const item = await getWork(db, body);
  if (item.branch_id !== branchId || item.kind !== 'reply' || !['approval_pending', 'publish_failed'].includes(item.status)) throw new RequestError('Yalnızca seçili şubeye ait yayınlanmamış taslak reddedilebilir.', 409);
  const rejection = { reason: body.reason.trim(), rejected_at: new Date().toISOString(), rejected_by: user.id };
  // The current schema requires draft_failed to have an empty reply. Retain the
  // actual draft under publish_failed plus explicit rejection metadata instead.
  const result = await db.from(workTable).update({ status: 'publish_failed', review_snapshot: { ...item.review_snapshot, rejection }, last_error: `Taslak reddedildi: ${rejection.reason}`, approved_by: null, approved_at: null, published_at: null, attempt_id: null, version: item.version + 1, updated_by: user.id, updated_at: rejection.rejected_at }).eq('connection_id', connectionId).eq('id', item.id).eq('version', item.version).eq('status', item.status).eq('updated_at', item.updated_at).select('*').maybeSingle();
  databaseFailure(result.error);
  if (!result.data) throw new RequestError('Taslak başka oturumda değişti. Listeyi yenileyin.', 409);
  await writeGoogleAudit(db, { userId: user.id, role: 'OPERATOR', action: 'reject_draft', entityType: 'review_work_item', entityId: item.id, beforeState: { status: item.status, version: item.version }, afterState: { status: result.data.status, version: result.data.version, rejection }, detail: rejection.reason, requestId });
  return { item: result.data };
}
async function getWork(db: any, body: any) {
  const { data, error } = await db.from(workTable).select('*').eq('connection_id', connectionId).eq('id', workId(body)).maybeSingle();
  databaseFailure(error);
  if (!data) throw new RequestError('Yorum görevi bulunamadı.', 404);
  managementScope(data);
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
  const expected = branches[identity.branch_id];
  if (!expected || ((String(location.storeCode || '') !== expected.storeCode && !(identity.location_id === expected.locationId && location.name === `locations/${expected.locationId}`)) || Object.entries(branches).some(([id, branch]) => id !== identity.branch_id && branch.storeCode && (location.storeCode === branch.storeCode || location.name === `locations/${branch.locationId}`)))) throw new RequestError('Google konumu seçilen OTOTR şubesiyle eşleşmiyor.', 409);
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
  let snapshot: any = item.review_snapshot?.legal_hold ? { legal_hold: true } : {}, skipped = false;
  try {
    const token = await accessToken(await decrypt(connection.refresh_token_encrypted), signal);
    const verified = await verifiedReview(identity, token, signal);
    snapshot = withReviewReplyUrl({ ...verified.snapshot, ...(item.review_snapshot?.legal_hold ? { legal_hold: true } : {}) }, verified.snapshot.review_reply_url || item.review_snapshot?.review_reply_url);
    if (verified.expected_reply) { skipped = true; throw new RequestError('Bu yorum Google’da zaten yanıtlanmış. Mevcut yanıt korundu.', 409); }
    // Forward the same ERP identity to the existing AI service. Its authorization,
    // canonical prompt, moderation and signature validation remain the only path.
    const response = await fetch(`${env('SUPABASE_URL')}/functions/v1/google-review-ai`, { method: 'POST', signal, headers: { ...(authorization.startsWith('Worker ') ? {'x-ototr-worker-token':authorization.slice(7)} : {Authorization: authorization}), apikey: injectedSupabaseKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS'), 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', branch: { id: identity.branch_id }, review: { id: identity.review_id, rating: snapshot.rating, comment: snapshot.comment, reviewerName: snapshot.reviewer_name } }) });
    const draft = await response.json().catch(() => null);
    if (!response.ok) throw new RequestError(typeof draft?.error === 'string' ? draft.error.slice(0, 800) : 'AI taslağı hazırlanamadı. Yeniden deneyin.', response.status);
    const expectedSignature = identity.branch_id === 'branch-google-nilufer' ? 'OTOTR Bursa Nilüfer Otoekspertiz Ekibi' : `${identity.branch_name} ekibi`;
    if (!draft || typeof draft.reply !== 'string' || draft.reply.length > 4000 || typeof draft.requires_human_review !== 'boolean') throw new RequestError('AI yanıtı doğrulanamadı. Yeniden deneyin.', 502);
    // The AI function owns the canonical signature, but older deployed
    // versions may return the body without it. Normalize once here instead of
    // rejecting an otherwise valid draft.
    if (!draft.reply.trim().endsWith(expectedSignature)) draft.reply = `${draft.reply.trim()}\n\n${expectedSignature}`;
    const current = await verifiedReview(identity, token, signal);
    if (current.expected_reply) { skipped = true; throw new RequestError('Hazırlık sırasında bu yoruma Google’da yanıt verilmiş. Mevcut yanıt korundu.', 409); }
    if (current.snapshot.comment !== snapshot.comment || current.snapshot.rating !== snapshot.rating || current.snapshot.reviewer_name !== snapshot.reviewer_name) throw new RequestError('Yorum hazırlık sırasında değişti. Güncel yorum için taslağı yeniden hazırlayın.', 409);
    snapshot = withReviewReplyUrl(snapshot, current.snapshot.review_reply_url);
    const ai_analysis = { tone: draft.tone, requires_human_review: draft.requires_human_review, risk_reason: draft.risk_reason, suggested_route: draft.suggested_route, quality_score: draft.quality_score, generation_id:draft.generation_id,experiment_id:draft.experiment_id,variant:draft.variant,usage:draft.usage };
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
  let source = ['openai', 'local_template', 'manual'].includes(body.draft_source) ? body.draft_source : 'manual';
  const verified = await verifiedReview(identity, token);
  let existingQuery = db.from(workTable).select('*').eq('connection_id', connectionId).eq('location_id', identity.location_id).eq('review_id', identity.review_id).eq('kind', kind);
  const { data: existing, error } = await existingQuery.maybeSingle(); databaseFailure(error);
  if (source==='openai' && !body.generation_id && !(existing?.draft_source==='openai' && existing.reply_text===reply)) source='manual';
  if (existing && existing.account_id !== identity.account_id) throw new RequestError('Bu Google yorumu başka hesap eşleşmesiyle kayıtlı. Mevcut görevi kullanın; hedef otomatik değiştirilmedi.', 409);
  if (existing && !isReply) return { item: existing, existing: true };
  if (existing && !body.item_id) {
    if (existing.reply_text === reply && existing.status === 'approval_pending') return { item: existing, existing: true };
    throw new RequestError('Bu yorum için kayıtlı yanıt var. Onay kuyruğundan açıp düzenleyin.', 409);
  }
  if (existing && (workId(body) !== existing.id || expectedVersion(body) !== existing.version)) throw new RequestError('Taslak başka oturumda değişti. Listeyi yenileyin.', 409);
  if (existing && !['approval_pending', 'publish_failed', 'draft_failed'].includes(existing.status) && !(existing.status === 'published' && body.edit_published === true)) throw new RequestError('Yayımlanan veya yayın sonucu beklenen taslak değiştirilemez.', 409);
  if (!existing && body.item_id) throw new RequestError('Düzenlenecek taslak bulunamadı.', 404);
  const now = new Date().toISOString();
  let aiAnalysis = existing?.review_snapshot?.ai_analysis;
  if (isReply && body.generation_id) {
    const generation=await verifyAiGeneration(db,body.generation_id,{reviewId:identity.review_id,branchId:identity.branch_id,...(source==='openai'?{replyText:reply}:{})});
    aiAnalysis={generation_id:generation.id,experiment_id:generation.experiment_id,variant:generation.variant,quality_score:generation.quality_score,requires_human_review:generation.requires_human_review};
  }
  const values = { ...identity, kind, review_snapshot: withReviewReplyUrl({ ...verified.snapshot, ...(existing?.review_snapshot?.legal_hold ? { legal_hold: true } : {}) }, verified.snapshot.review_reply_url || existing?.review_snapshot?.review_reply_url), expected_reply: verified.expected_reply, reply_text: reply, draft_source: source, status: isReply ? 'approval_pending' : 'open', note: String(body.note || '').trim().slice(0, 2000), version: existing ? existing.version + 1 : 1, updated_by: user.id, updated_at: now, last_error: null, attempt_id: null, approved_by: null, approved_at: null, published_at: null };
  if (aiAnalysis) values.review_snapshot.ai_analysis=aiAnalysis;
  const result = existing
    ? await db.from(workTable).update(values).eq('connection_id', connectionId).eq('id', existing.id).eq('version', existing.version).in('status', existing.status === 'published' && body.edit_published === true ? ['published'] : ['approval_pending', 'publish_failed', 'draft_failed']).select('*').maybeSingle()
    : await db.from(workTable).insert({ ...values, created_by: user.id }).select('*').single();
  if (result.error?.code === '23505') throw new RequestError('Bu yorum için görev zaten oluşturuldu. Listeyi yenileyin.', 409);
  databaseFailure(result.error);
  if (!result.data) throw new RequestError('Taslak değişti. Listeyi yenileyin.', 409);
  return { item: result.data, changed_existing_text:Boolean(existing?.reply_text && existing.reply_text!==reply) };
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
async function assertAutomaticReply(db: any, item: any) {
  const policy=await db.from('google_review_policies').select('auto_reply_enabled').eq('connection_id',connectionId).maybeSingle();databaseFailure(policy.error);
  const snapshot=item.review_snapshot||{}, analysis=snapshot.ai_analysis||{};
  const unsafe=/avukat|dava|hukuk|mahkeme|tazminat|dolandır|kişisel veri|ayrımcılık|güvenlik|can güven|ücret iade|ciddi teknik/i.test(String(snapshot.comment||''));
  if(policy.data?.auto_reply_enabled!==true || item.kind!=='reply' || item.draft_source!=='openai' || ![4,5].includes(Number(snapshot.rating)) || analysis.requires_human_review!==false || !analysis.generation_id || unsafe || snapshot.legal_hold || snapshot.rejection || snapshot.reply_conflict) throw new RequestError('Yorum otomatik yayın koşullarını karşılamıyor; insan onayı gerekli.',409);
  const generation=await verifyAiGeneration(db,analysis.generation_id,{reviewId:item.review_id,branchId:item.branch_id,replyText:item.reply_text});
  if(generation.requires_human_review!==false)throw new RequestError('AI değerlendirmesi insan onayı gerektiriyor.',409);
}
async function publishWork(db: any, user: any, body: any, token: string) {
  const item = await getWork(db, body), verifyOnly = body.action === 'verify_reply';
  if (item.kind !== 'reply') throw new RequestError('Bu kayıt yanıt taslağı değil.', 400);
  if (!verifyOnly && item.review_snapshot?.rejection) throw new RequestError('Taslak reddedilmiş. Düzenleyip yeniden kaydetmeden yayımlanamaz.', 409);
  if (!verifyOnly) await assertNoLegalHold(db, item);
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
    if(body.action==='auto_publish_safe'){
      const stars=({ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5} as Record<string,number>)[live.starRating];
      if(stars!==Number(item.review_snapshot?.rating)||String(live.comment||'')!==String(item.review_snapshot?.comment||''))throw new RequestError('Google yorumu değişti. Yeni değerlendirme ve onay gerekli.',409);
      await assertAutomaticReply(db,item);
    }
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
    await assertNoLegalHold(db, item);
    await assertReviewLifecycle({db,connection:{id:connectionId},branchId:item.branch_id});
    await authorizedGoogleRole(db,user.id,'publish_reply',item.branch_id);
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
      const callbackConnection = await authorizedConnection(db, userId);
      if (!callbackConnection._reviewAccess.is_owner) throw new RequestError('Google bağlantısını yalnızca bağlantı sahibi yenileyebilir.',403);
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: url.searchParams.get('code') || '', client_id: env('GOOGLE_OAUTH_CLIENT_ID'), client_secret: env('GOOGLE_OAUTH_CLIENT_SECRET'), redirect_uri: callbackUrl, grant_type: 'authorization_code' }) });
      const tokens = await response.json();
      if (!response.ok || !tokens.refresh_token) throw new Error(tokens.error_description || 'Google kalıcı erişim anahtarı alınamadı.');
      const { error } = await db.from('google_business_connections').upsert({ id: 'ototr-primary', connected_by: userId, oauth_client_id: env('GOOGLE_OAUTH_CLIENT_ID'), refresh_token_encrypted: await encrypt(tokens.refresh_token), scope: tokens.scope || '', connected_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) throw error;
      return Response.redirect(erpUrl, 302);
    }
    if (req.method !== 'POST') return json({ error: 'Desteklenmeyen yöntem.' }, 405);
    const body = await req.json();
    const db = admin();
    if(body.action==='automation_tick') return json(await runAutomation(db,req.headers.get('x-ototr-worker-token')||'',{
      connection:async()=>{const r=await db.from('google_business_connections').select('*').eq('id',connectionId).maybeSingle();databaseFailure(r.error);if(!r.data || r.data.oauth_client_id!==env('GOOGLE_OAUTH_CLIENT_ID'))throw new RequestError('Google bağlantısı yenilenmeli.',409);return {connection:r.data,user:{id:r.data.connected_by}};},
      lifecycle:async(connection:any)=>assertReviewLifecycle({db,connection,branchId:managementBranchId}),
      sync:async(connection:any)=>syncReviews([managementBranchId],await accessToken(await decrypt(connection.refresh_token_encrypted)),AbortSignal.timeout(25000)),
      find:async(review:any,branch:any)=>preparationItem(db,workIdentity({branch_id:managementBranchId,account_id:branch.account_id,location_id:branch.location_id,review_id:review.reviewId})),
      prepare:async(user:any,connection:any,review:any,branch:any,token:string)=>{const r=await prepareDraft(db,user,{branch_id:managementBranchId,account_id:branch.account_id,location_id:branch.location_id,review_id:review.reviewId},connection,'Worker '+token);if(r.item?.status==='approval_pending')await recordAiOutcome(db,{item:r.item,actorId:user.id,action:'saved'});return r;},
      safe:async(item:any)=>assertAutomaticReply(db,item),
      publish:async(user:any,item:any,connection:any)=>{await assertReviewLifecycle({db,connection,branchId:managementBranchId});const r=await publishWork(db,user,{action:'auto_publish_safe',branch_id:managementBranchId,item_id:item.id,expected_version:item.version,approved:true},await accessToken(await decrypt(connection.refresh_token_encrypted)));await writeGoogleAudit(db,{userId:user.id,role:'ADMIN',action:'auto_publish_safe',entityType:'review_work_item',entityId:item.id,afterState:{status:r.item?.status},detail:'Sunucu otomasyonu: risksiz 4–5 yıldız.'});if(r.item?.status==='published')await recordAiOutcome(db,{item:r.item,actorId:user.id,action:'published'});return r;}
    }));
    const user = await currentUser(req);
    const connection = await authorizedConnection(db, user.id, branchIdOf(body));
    const access = connection._reviewAccess;
    const branchRows = await loadBranchRegistry(db);
    const requestedBranch = body.branch_id === undefined ? managementBranchId : String(body.branch_id);
    if (body.branch_id !== undefined && (!managedBranchId(requestedBranch) || (requestedBranch.startsWith('branch-custom-') && !registryRow(branchRows, requestedBranch)))) throw new RequestError('Şube kaydı bulunamadı veya bu kapsam canlı yönetim için açılmadı.',400);
    const requestedRegistry = registryRow(branchRows, requestedBranch);
    const readActions = new Set(['automation_status','status','management_read','management_extended_read','operations_list','targets_list','workflow_list','audit_list','reviews','branch_list','branch_onboarding']);
    const approvalAction = ['publish_reply','verify_reply','reject_draft'].includes(body.action) && access.can_approve;
    if (access.role === 'viewer' && !readActions.has(body.action) && body.action !== 'notification_read' && !approvalAction) throw new RequestError('Bu kullanıcı yorumları yalnızca görüntüleyebilir.',403);
    if (access.source==='delegation' && !readActions.has(body.action) && body.action!=='notification_read' && !approvalAction && !(access.delegated_scopes.includes('tasks') && ['create_task','update_task','management_update'].includes(body.action))) throw new RequestError('İşlem süreli delegasyon kapsamının dışında.',403);
    if (['start','accounts','locations'].includes(body.action) && !access.is_owner) throw new RequestError('Google bağlantısı yalnızca hesap sahibi tarafından yönetilebilir.',403);
    if (!access.is_owner && body.action==='reviews' && String(body.location_id)!==branches[requestedBranch].locationId) throw new RequestError('Yorum konumu yetkili şubeyle eşleşmiyor.',403);
    if (!access.is_owner && body.action==='sync_reviews') {
      if (!Array.isArray(body.branch_ids) || body.branch_ids.length!==1 || body.branch_ids[0]!==requestedBranch) throw new RequestError('Senkronizasyon yetkisi seçili şubeyle sınırlıdır.',403);
      const config=body.branch_configs?.[requestedBranch];
      if(config?.location_id && String(config.location_id)!==branches[requestedBranch].locationId || config?.store_code && String(config.store_code)!==branches[requestedBranch].storeCode) throw new RequestError('Kayıtlı şube bağlantısı değiştirilemez.',403);
    }
    if ((body.action === 'management_update' && body.entity === 'policy' || body.action === 'target_save') && access.role !== 'admin') throw new RequestError('Bu ayarı değiştirmek için yönetici yetkisi gerekli.',403);
    if (requestedRegistry && requestedRegistry.active === false && !['branch_list','branch_onboarding','management_read','management_extended_read'].includes(body.action)) throw new RequestError('Pasif şube üzerinde işlem yapılamaz.',409);
    if (requestedRegistry && ['sync_reviews','prepare_draft','save_draft','publish_reply','verify_reply','auto_publish_safe','collection_enqueue','collection_run_due','create_task','update_task','reject_draft','bulk_route','template_apply','escalation_run'].includes(body.action) && !branchCanSync(requestedRegistry)) throw new RequestError('Şube Google doğrulaması ve canlı aktivasyonu tamamlanmadan bu işlem açılamaz.',409);
    if (['management_extended_read','resource_save','resource_archive','notification_read','escalation_run','retention_preview','template_apply'].includes(body.action)) {
      const result=await handleReviewManagement({db,user,body,connection,role:access.role,canAdmin:access.role==='admin',canManageGrants:access.is_owner});
      if(body.action==='template_apply' && result?.item && result.changed_existing_text) await recordAiOutcome(db,{item:result.item,actorId:user.id,action:'edited'});
      return json(result);
    }
    if (['collection_read','collection_save_policy','collection_enqueue','collection_queue','collection_run_due'].includes(body.action)) {
      if (body.action !== 'collection_read' && access.role !== 'admin' && !access.is_owner) throw new RequestError('Yorum toplama ayarları için yönetici yetkisi gerekli.',403);
      const collectionBranch = branchIdOf(body);
      if (['branch-google-gebze','branch-google-inegol'].includes(collectionBranch) && body.action !== 'collection_read') throw new RequestError('Demo şubede dış yorum toplama işlemi açılamaz.',409);
      const policyRow = await db.from('google_review_collection_policies').select('*').eq('connection_id', connectionId).eq('branch_id', collectionBranch).maybeSingle();
      databaseFailure(policyRow.error);
      if (body.action === 'collection_read') {
        const queue = await db.from('google_review_collection_outbox').select('id,branch_id,service_id,customer_name,channel,scheduled_at,status,reason,sent_at,created_at').eq('connection_id', connectionId).eq('branch_id', collectionBranch).order('scheduled_at',{ascending:false}).limit(100);
        databaseFailure(queue.error);
        return json({policy: policyRow.data || {connection_id:connectionId,branch_id:collectionBranch,enabled:false,send_hour:18,delay_minutes:120,channel:'sms',cooldown_days:30,template:'Merhaba {{musteri_adi}}, hizmet deneyiminizi değerlendirmek ister misiniz? {{yorum_linki}}'}, queue: queue.data || []});
      }
      if (body.action === 'collection_save_policy') {
        const sendHour=Number(body.send_hour), delay=Number(body.delay_minutes), cooldown=Number(body.cooldown_days||30), channel=String(body.channel||'sms');
        if (!Number.isInteger(sendHour)||sendHour<0||sendHour>23||!Number.isInteger(delay)||delay<0||delay>10080||!Number.isInteger(cooldown)||cooldown<1||cooldown>365||!['sms','whatsapp','email'].includes(channel)) throw new RequestError('Yorum toplama ayarları geçersiz.',400);
        const saved=await db.from('google_review_collection_policies').upsert({connection_id:connectionId,branch_id:collectionBranch,enabled:Boolean(body.enabled),send_hour:sendHour,delay_minutes:delay,cooldown_days:cooldown,channel,template:String(body.template||'').slice(0,1000),updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'connection_id,branch_id'}).select('*').single();
        databaseFailure(saved.error); return json({policy:saved.data});
      }
      if (body.action === 'collection_enqueue') {
        if (collectionBranch !== managementBranchId && !customBranchPattern.test(collectionBranch)) throw new RequestError('Yorum toplama kapsamı geçersiz.',400);
        const serviceId=String(body.service_id||'').trim(), recipient=String(body.recipient||'').trim();
        if (!serviceId||!recipient) throw new RequestError('Hizmet ve alıcı bilgisi gerekli.',400);
        const policy=policyRow.data; if (!policy?.enabled) return json({queued:false,reason:'policy_disabled'});
        const scheduled=new Date(Date.now()+Number(policy.delay_minutes)*60000); const keyDate=new Date(scheduled); keyDate.setHours(Number(policy.send_hour),0,0,0); if(keyDate.getTime()<scheduled.getTime()) keyDate.setDate(keyDate.getDate()+1);
        const inserted=await db.from('google_review_collection_outbox').upsert({connection_id:connectionId,branch_id:collectionBranch,service_id:serviceId,customer_name:String(body.customer_name||'').slice(0,160),recipient,channel:policy.channel,scheduled_at:keyDate.toISOString(),status:'queued'},{onConflict:'connection_id,branch_id,service_id',ignoreDuplicates:true}).select('id,scheduled_at,status').maybeSingle();
        databaseFailure(inserted.error); return json({queued:Boolean(inserted.data),item:inserted.data||null,reason:inserted.data?'queued':'duplicate'});
      }
      if (body.action === 'collection_run_due') {
        if (access.role !== 'admin' || !access.is_owner) throw new RequestError('Gönderim worker yalnızca bağlantı sahibi tarafından çalıştırılabilir.',403);
        const due=await db.from('google_review_collection_outbox').select('*').eq('connection_id',connectionId).eq('branch_id',collectionBranch).eq('status','queued').lte('scheduled_at',new Date().toISOString()).limit(100);
        databaseFailure(due.error); const providerUrl=Deno.env.get('REVIEW_COLLECTION_PROVIDER_URL')||''; const providerToken=Deno.env.get('REVIEW_COLLECTION_PROVIDER_TOKEN')||''; let sent=0, skipped=0, failed=0;
        for(const row of (due.data||[])) {
          if(!providerUrl || !providerToken){ await db.from('google_review_collection_outbox').update({status:'dry_run',reason:'provider_not_configured'}).eq('id',row.id); skipped++; continue; }
          try { const response=await fetch(providerUrl,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${providerToken}`},body:JSON.stringify({channel:row.channel,to:row.recipient,customer_name:row.customer_name,service_id:row.service_id,template:policyRow.data?.template||''})}); if(!response.ok) throw new Error(`provider_${response.status}`); await db.from('google_review_collection_outbox').update({status:'sent',sent_at:new Date().toISOString(),reason:null}).eq('id',row.id).eq('status','queued'); sent++; } catch(error){ await db.from('google_review_collection_outbox').update({status:'failed',reason:String(error instanceof Error?error.message:'provider_error').slice(0,200)}).eq('id',row.id).eq('status','queued'); failed++; }
        }
        return json({processed:(due.data||[]).length,sent,skipped,failed,dry_run:!providerUrl});
      }
      const queue=await db.from('google_review_collection_outbox').select('id,branch_id,service_id,customer_name,channel,scheduled_at,status,reason,sent_at,created_at').eq('connection_id',connectionId).eq('branch_id',collectionBranch).order('scheduled_at',{ascending:false}).limit(100); databaseFailure(queue.error); return json({queue:queue.data||[]});
    }
    if (body.action === 'branch_list') {
      const builtIns = [
        { id: 'branch-google-nilufer', name: 'OTOTR Bursa Nilüfer Şube', city: 'Bursa', region: 'Marmara', account_id: '114698852482564472140', store_code: branches['branch-google-nilufer'].storeCode, location_id: branches['branch-google-nilufer'].locationId, mode: 'live', lifecycle: 'live', interval_minutes: 60, sla_hours: 24, target: 30, active: true, google_verified_at: null, last_sync_at: null, onboarding: { google_account: true, google_location: true, target: true, sla: true, ai: true, collection: true } },
        { id: 'branch-google-gebze', name: 'OTOTR Gebze Şube', city: 'Kocaeli', region: 'Marmara', account_id: null, store_code: branches['branch-google-gebze'].storeCode, location_id: branches['branch-google-gebze'].locationId, mode: 'demo', lifecycle: 'demo', interval_minutes: 60, sla_hours: 24, target: 30, active: true, google_verified_at: null, last_sync_at: null, onboarding: { demo: true } },
        { id: 'branch-google-inegol', name: 'OTOTR Bursa İnegöl Şube', city: 'Bursa', region: 'Marmara', account_id: null, store_code: branches['branch-google-inegol'].storeCode, location_id: branches['branch-google-inegol'].locationId, mode: 'demo', lifecycle: 'demo', interval_minutes: 60, sla_hours: 24, target: 30, active: true, google_verified_at: null, last_sync_at: null, onboarding: { demo: true } },
      ];
      return json({items:[...builtIns,...branchRows]});
    }
    if (body.action === 'branch_create') {
      if (!access.is_owner) throw new RequestError('Şube ekleme yalnızca bağlantı sahibi tarafından yapılabilir.',403);
      if(!customBranchPattern.test(String(body.id||''))) throw new RequestError('Şube kimliği geçerli olmalı.',400);
      const setup=branchSetup(body);
      const {name,city,region,account_id,store_code,location_id}=setup;
      const mode=(account_id&&store_code)?'live_candidate':'demo';
      const lifecycle=mode==='live_candidate'?'live_candidate':'demo';
      const row={...setup,id:String(body.id),connection_id:connectionId,mode,lifecycle,active:true,created_by:user.id,updated_by:user.id};
      const existing=registryRow(branchRows,row.id);
      if(existing) {
        const same=['name','city','region','account_id','store_code','location_id','target','sla_hours','interval_minutes'].every(key=>(existing as any)[key]===(setup as any)[key]) && JSON.stringify(existing.onboarding?.map||null)===JSON.stringify(setup.onboarding.map||null) && Boolean(existing.onboarding?.test)===setup.onboarding.test;
        if(!same) throw new RequestError('Bu şube kimliği zaten kayıtlı; kurulum listesinden düzenleyin.',409);
        await seedBranchDefaults(db,existing,user.id);
        return json({item:existing,reused:true});
      }
      const saved=await db.from('google_review_branch_registry').insert(row).select('id,name,city,region,account_id,store_code,location_id,mode,lifecycle,interval_minutes,sla_hours,target,active,google_verified_at,last_sync_at,onboarding,created_at,updated_at').maybeSingle();
      if (saved.error?.code === '23505') throw new RequestError('Bu şube kimliği veya Google konumu zaten kayıtlı.',409);
      databaseFailure(saved.error); if(!saved.data) throw new RequestError('Şube kaydı oluşturulamadı.',503);
      await seedBranchDefaults(db, saved.data as BranchRegistryRow, user.id);
      await writeGoogleAudit(db,{userId:user.id,role:'ADMIN',action:'branch_create',entityType:'branch',entityId:saved.data.id,afterState:{name,city,region,mode,lifecycle},detail:'Yeni Google yorum şubesi onboarding kaydı oluşturuldu.'});
      return json({item:saved.data,onboarding:{...row.onboarding,lifecycle,activation_required:true}},201);
    }
    if (body.action === 'branch_update') {
      if(!access.is_owner) throw new RequestError('Şube kurulumu yalnızca bağlantı sahibi tarafından düzenlenebilir.',403);
      const row=registryRow(branchRows,requestedBranch);
      if(!row || !customBranchPattern.test(requestedBranch)) throw new RequestError('Kurulum şubesi bulunamadı.',404);
      if(['live','active'].includes(row.lifecycle||'')) throw new RequestError('Canlı şubenin bağlantısı kurulum ekranından değiştirilemez.',409);
      if(typeof body.expected_updated_at !== 'string') throw new RequestError('Güncel şube sürümü gerekli.',400);
      const setup=branchSetup(body,row), lifecycle=setup.account_id&&setup.store_code?'live_candidate':'demo';
      if(setup.target!==row.target||setup.sla_hours!==row.sla_hours||setup.interval_minutes!==row.interval_minutes) throw new RequestError('Başlangıç hedefleri kurulum düzenlemesinde değiştirilemez; canlı şubenin hedef ve politika ekranlarını kullanın.',400);
      const saved=await db.from('google_review_branch_registry').update({...setup,lifecycle,mode:lifecycle,google_verified_at:null,updated_by:user.id,updated_at:new Date().toISOString()}).eq('connection_id',connectionId).eq('id',requestedBranch).eq('updated_at',body.expected_updated_at).select('id,name,city,region,account_id,store_code,location_id,mode,lifecycle,interval_minutes,sla_hours,target,active,google_verified_at,last_sync_at,onboarding,created_at,updated_at').maybeSingle();
      if(saved.error?.code==='23505') throw new RequestError('Bu Google konumu başka şubede kayıtlı.',409);
      databaseFailure(saved.error); if(!saved.data) throw new RequestError('Şube başka bir oturumda değişti. Yenileyip tekrar deneyin.',409);
      await seedBranchDefaults(db,saved.data as BranchRegistryRow,user.id);
      await writeGoogleAudit(db,{userId:user.id,role:'ADMIN',action:'branch_update',entityType:'branch',entityId:requestedBranch,afterState:{name:setup.name,lifecycle},detail:'Şube kurulum bilgileri güncellendi.'});
      return json({item:saved.data});
    }
    if (body.action === 'branch_onboarding') {
      const branchId = branchIdOf(body); if (!managedBranchId(branchId)) throw new RequestError('Geçersiz şube.',400);
      const row = branchId === managementBranchId ? null : registryRow(branchRows, branchId);
      if (branchId !== managementBranchId && !row) throw new RequestError('Şube kaydı bulunamadı.',404);
      const settings = await db.from('google_review_management_resources').select('data').eq('connection_id',connectionId).eq('branch_id',branchId).eq('kind','branch_settings').eq('key','default').eq('archived',false).maybeSingle(); databaseFailure(settings.error);
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).formatToParts(new Date());
      const targetMonth=`${parts.find(p=>p.type==='year')!.value}-${parts.find(p=>p.type==='month')!.value}-01`;
      const target = await db.from('google_review_targets').select('target,rating_target,version,month').eq('connection_id',connectionId).eq('branch_id',branchId).eq('month',targetMonth).limit(1); databaseFailure(target.error);
      const policy = await db.from('google_review_collection_policies').select('enabled,updated_at').eq('connection_id',connectionId).eq('branch_id',branchId).maybeSingle(); databaseFailure(policy.error);
      const ai = await db.from('google_review_management_resources').select('data').eq('connection_id',connectionId).eq('branch_id',branchId).eq('kind','ai_config').eq('key','default').eq('archived',false).maybeSingle(); databaseFailure(ai.error);
      const checklist = { identity:true, google_account:branchId===managementBranchId || Boolean(row?.account_id), store_code:branchId===managementBranchId || Boolean(row?.store_code), location_id:branchId===managementBranchId || Boolean(row?.location_id), google_verified:branchId===managementBranchId || Boolean(row?.google_verified_at), target:Boolean(target.data?.length), sla:branchId===managementBranchId || Boolean(row?.sla_hours || settings.data?.sla_hours), ai:Boolean(ai.data || Deno.env.get('OPENAI_API_KEY')), collection:true, permissions:access.is_owner, active:branchId===managementBranchId || row?.active!==false, live:branchId===managementBranchId || row?.lifecycle==='live' };
      return json({branch_id:branchId,branch:row,settings:settings.data||null,target_month:targetMonth,target:target.data?.[0]||null,collection:policy.data||{enabled:false,source:'default'},sources:{ai:ai.data?'branch':'erp',collection:policy.data?'branch':'default_disabled'},checklist,ready:Object.values(checklist).every(Boolean)});
    }
    if (body.action === 'branch_activate') {
      if (!access.is_owner) throw new RequestError('Şube aktifleştirme yalnızca bağlantı sahibi tarafından yapılabilir.',403);
      const branchId=String(body.branch_id||''); if(!customBranchPattern.test(branchId)) throw new RequestError('Yalnızca yeni özel şube kimliği aktifleştirilebilir.',400);
      const row=registryRow(branchRows,branchId); if(!row) throw new RequestError('Şube kaydı bulunamadı.',404);
      if(row.onboarding?.test===true) throw new RequestError('Test şubesi canlıya alınamaz. Gerçek şube için ayrı kurulum açın.',409);
      if(!row.account_id||!row.store_code||!row.location_id) throw new RequestError('Google hesap ID, mağaza kodu ve konum ID aktivasyon için zorunlu.',400);
      const token=await accessToken(await decrypt(connection.refresh_token_encrypted));
      const location=await googleJson(`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${row.location_id}?readMask=name,title,storeCode`,token);
      if(String(location.storeCode||'')!==String(row.store_code)||String(location.name||'')!==`locations/${row.location_id}`) throw new RequestError('Google konumu verilen mağaza koduyla eşleşmiyor.',409);
      // Verify the selected account/location pair as well, before enabling sync.
      await googleJson(`https://mybusiness.googleapis.com/v4/accounts/${row.account_id}/locations/${row.location_id}/reviews?pageSize=1`,token);
      await seedBranchDefaults(db,row,user.id);
      await activateBranchSettings(db,branchId,user.id);
      const now=new Date().toISOString(), onboarding={...(row.onboarding||{}),google_account:true,store_code:true,location_id:true,google_verified:true,ai:true,collection:true,permissions:true};
      const updated=await db.from('google_review_branch_registry').update({mode:'live_candidate',lifecycle:'live',google_verified_at:now,updated_by:user.id,updated_at:now,onboarding}).eq('connection_id',connectionId).eq('id',branchId).select('id,name,city,region,account_id,store_code,location_id,mode,lifecycle,interval_minutes,sla_hours,target,active,google_verified_at,last_sync_at,onboarding,created_at,updated_at').maybeSingle();
      databaseFailure(updated.error); if(!updated.data) throw new RequestError('Şube aktifleştirilemedi.',503);
      await writeGoogleAudit(db,{userId:user.id,role:'ADMIN',action:'branch_activate',entityType:'branch',entityId:branchId,afterState:{lifecycle:'live',google_verified_at:now},detail:'Google konumu doğrulandı; şube canlı yorum akışına açıldı.'});
      return json({item:updated.data,checklist:{...onboarding,live:true}});
    }
    if (['prepare_draft','save_draft','publish_reply','auto_publish_safe'].includes(body.action)) await assertReviewLifecycle({db,connection,branchId:branchIdOf(body)});
    if (body.action === 'auto_publish_safe') {
      if (access.role !== 'admin' || !access.is_owner) throw new RequestError('Otomatik yayın yalnızca bağlantı sahibi yönetici tarafından çalıştırılabilir.',403);
      const item = await getWork(db, body);
      if(item.status!=='approval_pending')throw new RequestError('Yorum otomatik yayın kuyruğunda değil.',409);
      await assertAutomaticReply(db,item);
    }
    if ((body.action === 'management_update' && body.entity === 'task') || body.action === 'update_task') {
      const task = await getWork(db,body);
      if (task.kind === 'legal' && !['admin','legal'].includes(access.role)) throw new RequestError('Hukuk görevini yalnızca hukuk yetkilisi veya yönetici değiştirebilir.',403);
      if (access.role === 'legal' && task.kind !== 'legal') throw new RequestError('Bu görev hukuk rolünün kapsamında değil.',403);
    }
    if (body.action === 'start') {
      const state = await makeState(user.id);
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.search = new URLSearchParams({ client_id: env('GOOGLE_OAUTH_CLIENT_ID'), redirect_uri: callbackUrl, response_type: 'code', scope: 'https://www.googleapis.com/auth/business.manage', access_type: 'offline', prompt: 'consent', login_hint: 'dijital@ototr.com', state }).toString();
      return json({ auth_url: authUrl.toString() });
    }
    const clientMatches = Boolean(connection && connection.oauth_client_id === env('GOOGLE_OAUTH_CLIENT_ID'));
    if (body.action === 'status') return json({ connected: clientMatches, connected_at: connection?.connected_at || null, reconnection_required: Boolean(connection && !clientMatches) });
    if (!connection) return json({ error: 'Google Business Profile bağlantısı kurulmamış.' }, 409);
    if (['prepare_draft', 'save_draft', 'create_task'].includes(body.action)) workIdentity(body);
    if (['publish_reply', 'verify_reply'].includes(body.action)) { await getWork(db, body); await authorizedGoogleRole(db,user.id,body.action,requestedBranch); }
    if (body.action === 'auto_publish_safe') await authorizedGoogleRole(db,user.id,'publish_reply',requestedBranch);
    if (body.action === 'automation_status') return json(await automationStatus(db));
    if (body.action === 'management_read') return json(await readManagement(db, user, body, connection, clientMatches));
    if (body.action === 'management_update') return json(await updateManagement(db, user, body, req.headers.get('x-request-id') || undefined));
    if (body.action === 'reject_draft') {
      const result=await rejectDraft(db,user,body,req.headers.get('x-request-id') || undefined);
      await recordAiOutcome(db,{item:result.item,actorId:user.id,action:'rejected'});
      return json(result);
    }
    if (body.action === 'operations_list') {
      const { data, error } = await db.from('google_review_operations').select('review_id,branch_id,status,version,updated_at').eq('connection_id', connectionId).eq('branch_id',branchIdOf(body)).order('updated_at', { ascending: false }).limit(5000);
      databaseFailure(error); return json({ items: data || [] });
    }
    if (body.action === 'operation_save') {
      const { review_id, branch_id, status, expected_version } = body;
      if (typeof review_id !== 'string' || !review_id || review_id.length > 512 || branch_id !== branchIdOf(body) || !managedBranchId(branch_id) || !['new','reviewing','reply_waiting','branch_action','resolved','follow_up'].includes(status) || !Number.isSafeInteger(expected_version) || expected_version < 0) throw new RequestError('Yorum, şube, durum ve sürüm bilgisi geçerli olmalı.', 400);
      const row = { connection_id: connectionId, review_id, branch_id, status, version: expected_version + 1, updated_by: user.id, updated_at: new Date().toISOString() };
      const result = expected_version === 0
        ? await db.from('google_review_operations').insert(row).select('review_id,branch_id,status,version,updated_at').maybeSingle()
        : await db.from('google_review_operations').update(row).eq('connection_id', connectionId).eq('review_id', review_id).eq('version', expected_version).select('review_id,branch_id,status,version,updated_at').maybeSingle();
      if (result.error?.code === '23505' || (!result.error && !result.data)) throw new RequestError('Takip durumu başka oturumda değişti. Listeyi yenileyip tekrar deneyin.', 409);
      databaseFailure(result.error); return json({ item: result.data });
    }
    if (body.action === 'targets_list') {
      const { data, error } = await db.from('google_review_targets').select('branch_id,month,target,rating_target,version,updated_at').eq('connection_id', connectionId).eq('branch_id',branchIdOf(body)).order('month', { ascending: false }).limit(1000);
      databaseFailure(error); return json({ items: data || [] });
    }
    if (body.action === 'target_save') {
      const { branch_id, month, target, expected_version } = body;
      if (branch_id !== branchIdOf(body) || !managedBranchId(branch_id) || typeof month !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(month) || !Number.isSafeInteger(target) || target < 1 || target > 10000 || !Number.isSafeInteger(expected_version) || expected_version < 0) throw new RequestError('Şube, ay ve 1–10000 arası tam sayı hedef gerekli.', 400);
      const ratingTarget = body.rating_target;
      if (ratingTarget != null && (typeof ratingTarget !== 'number' || !Number.isFinite(ratingTarget) ||
        ratingTarget < 1 || ratingTarget > 5 || Math.abs(ratingTarget * 10 - Math.round(ratingTarget * 10)) > 1e-8)) {
        throw new RequestError('Yıldız hedefi 1,0–5,0 arasında, bir ondalık basamak olmalı.', 400);
      }
      const row = { connection_id: connectionId, branch_id, month, target, ...(ratingTarget !== undefined ? { rating_target: ratingTarget } : {}), version: expected_version + 1, updated_by: user.id, updated_at: new Date().toISOString() };
      const result = expected_version === 0
        ? await db.from('google_review_targets').insert(row).select('branch_id,month,target,rating_target,version,updated_at').maybeSingle()
        : await db.from('google_review_targets').update(row).eq('connection_id', connectionId).eq('branch_id', branch_id).eq('month', month).eq('version', expected_version).select('branch_id,month,target,rating_target,version,updated_at').maybeSingle();
      if (result.error?.code === '23505' || (!result.error && !result.data)) throw new RequestError('Hedef başka oturumda değişti. Hedefleri yenileyip tekrar kaydedin.', 409);
      databaseFailure(result.error); return json({ item: result.data });
    }
    if (body.action === 'workflow_list') {
      const offset = Number(body.offset || 0);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new RequestError('Geçersiz liste sayfası.', 400);
      const { data, error } = await db.from(workTable).select('*').eq('connection_id', connectionId).eq('branch_id',branchIdOf(body)).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 99);
      databaseFailure(error); return json({ items: data || [], next_offset: data?.length === 100 ? offset + 100 : null });
    }
    if (body.action === 'update_task') {
      const item = await getWork(db, body);
      if (item.review_snapshot?.legal_hold && body.status === 'done') throw new RequestError('Dosyayı kapatmadan önce hukuki kilidi kaldırın.', 409);
      if (!taskKinds.includes(item.kind) || !['open', 'done'].includes(body.status)) throw new RequestError('Geçersiz görev durumu.', 400);
      const { data, error } = await db.from(workTable).update({ status: body.status, note: String(body.note || '').trim().slice(0, 2000), version: item.version + 1, updated_by: user.id, updated_at: new Date().toISOString() }).eq('connection_id', connectionId).eq('id', item.id).eq('version', item.version).select('*').maybeSingle();
      databaseFailure(error); if (!data) throw new RequestError('Görev başka oturumda değişti. Listeyi yenileyin.', 409);
      return json({ item: data });
    }
    if (body.action === 'audit_list') {
      const auditConnection = await authorizedConnection(db, user.id);
      const allowedActions = new Set(['publish_reply', 'verify_reply', 'bulk_route', 'save_draft', 'create_task', 'update_task', 'sync_reviews', 'policy_update', 'reject_draft']);
      const requestedAction = String(body.audit_action || '').trim();
      const requestedLimit = Number(body.limit);
      const limit = Number.isSafeInteger(requestedLimit) ? Math.min(200, Math.max(1, requestedLimit)) : 100;
      let query = db.from('google_review_audit_log')
        .select('id,actor_id,actor_role,action,entity_type,entity_id,before_state,after_state,detail,created_at')
        .eq('connection_id', auditConnection.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (requestedAction && allowedActions.has(requestedAction)) query = query.eq('action', requestedAction);
      const result = await query;
      databaseFailure(result.error);
      return json({ rows: result.data || [] });
    }
    if (body.action === 'bulk_route') {
      const authorization = await authorizedGoogleRole(db, user.id, 'bulk_route',requestedBranch);
      const bulkBranch = branchIdOf(body);
      const itemIds = Array.isArray(body.item_ids) ? [...new Set(body.item_ids.map((value: unknown) => String(value).trim()).filter(value => /^[0-9a-f-]{36}$/i.test(value)))] : [];
      if (!itemIds.length || itemIds.length > 100) throw new RequestError('Toplu sevk için 1–100 arası geçerli görev seçin.', 400);
      const idempotencyKey = String(body.idempotency_key || '').trim();
      if (!/^[A-Za-z0-9._:-]{8,120}$/.test(idempotencyKey)) throw new RequestError('Toplu sevk idempotency anahtarı geçersiz.', 400);
      const existing = await db.from('google_review_bulk_jobs').select('*').eq('connection_id', connectionId).eq('idempotency_key', idempotencyKey).maybeSingle();
      databaseFailure(existing.error);
      if (existing.data) return json({ job: existing.data, replayed: true });
      const selected = await db.from(workTable).select('id,status,kind,branch_id').eq('connection_id', connectionId).in('id', itemIds);
      databaseFailure(selected.error);
      if ((selected.data || []).some((item: any) => item.branch_id !== bulkBranch)) throw new RequestError('Seçili şube dışındaki kayıtlar aynı kuyruğa alınamaz.', 400);
      const eligible = (selected.data || []).filter((item: any) => item.kind === 'reply' && ['approval_pending', 'publish_failed', 'publish_unknown'].includes(item.status));
      if (!eligible.length) throw new RequestError('Sevk kuyruğuna alınabilecek onay bekleyen yanıt bulunamadı.', 409);
      const created = await db.from('google_review_bulk_jobs').insert({ connection_id: connectionId, job_type: 'route', status: 'queued', requested_by: user.id, idempotency_key: idempotencyKey, total_count: eligible.length, progress: { source: 'google_review_center', requested_count: itemIds.length } }).select('*').maybeSingle();
      databaseFailure(created.error);
      if (!created.data) throw new RequestError('Toplu sevk kuyruğu oluşturulamadı.', 503);
      const itemRows = eligible.map((item: any) => ({ job_id: created.data.id, item_key: String(item.id), work_item_id: item.id, status: 'queued' }));
      const itemInsert = await db.from('google_review_bulk_job_items').insert(itemRows);
      databaseFailure(itemInsert.error);
      await writeGoogleAudit(db, { userId: user.id, role: authorization.role, action: 'bulk_route', entityType: 'google_review_bulk_job', entityId: created.data.id, afterState: { status: 'queued', total_count: eligible.length }, detail: 'Toplu sevk kuyruğu oluşturuldu.', requestId: req.headers.get('x-request-id') || undefined });
      return json({ job: created.data, item_count: eligible.length });
    }
    if (body.action === 'reply') throw new RequestError('Doğrudan yayın kapalı. Kayıtlı taslağı onay kuyruğundan yayımlayın.', 400);
    if (!clientMatches) return json({ error: 'Google uygulama bağlantısı değişti. Google Hesabını Bağla ile hesabınızı yeniden yetkilendirin.', reconnection_required: true }, 409);
    if (body.action === 'prepare_draft') {
      const result=await prepareDraft(db,user,body,connection,req.headers.get('authorization') || '');
      if(result.item?.status==='approval_pending') await recordAiOutcome(db,{item:result.item,actorId:user.id,action:'saved'});
      return json(result);
    }
    const syncTargets = body.action === 'sync_reviews' ? syncBranchIds(body.branch_ids) : null;
    if (syncTargets) {
      const signal = AbortSignal.timeout(25_000);
      try {
        const token = await accessToken(await decrypt(connection.refresh_token_encrypted), signal);
        const sinceByBranch = body.since_by_branch && typeof body.since_by_branch === 'object' ? body.since_by_branch : {};
        const branchConfigs = syncBranchConfigs(body.branch_configs, syncTargets);
        const synced = await syncReviews(syncTargets, token, signal, sinceByBranch, branchConfigs);
        const syncedAt = new Date().toISOString();
        for (const branch of synced.branches || []) {
          if (customBranchPattern.test(branch.branch_id)) await db.from('google_review_branch_registry').update({ last_sync_at: syncedAt, updated_at: syncedAt }).eq('connection_id', connectionId).eq('id', branch.branch_id);
        }
        return json({ ...synced, synced_at: syncedAt });
      } catch (error) {
        if (signal.aborted) throw new GoogleApiError('Google senkronizasyonu zaman aşımına uğradı. Önceki veriler korunuyor.', 504, 'GOOGLE_SYNC_TIMEOUT');
        throw error;
      }
    }
    const token = await accessToken(await decrypt(connection.refresh_token_encrypted));
    if (['save_draft', 'create_task'].includes(body.action)) {
      const result=await saveWork(db,user,body,token);
      if(body.action==='save_draft' && (result.changed_existing_text || body.generation_id)) await recordAiOutcome(db,{item:result.item,actorId:user.id,action:body.generation_id && body.draft_source==='openai'?'saved':'edited'});
      return json(result);
    }
    if (body.action === 'auto_publish_safe') {
      const before=await getWork(db,body);
      const result=await publishWork(db,user,{...body,approved:true},token);
      await writeGoogleAudit(db,{userId:user.id,role:'ADMIN',action:'auto_publish_safe',entityType:'review_work_item',entityId:before.id,beforeState:{status:before.status,version:before.version},afterState:{status:result?.item?.status,version:result?.item?.version},detail:'4–5 yıldız düşük risk otomatik yayın.',requestId:req.headers.get('x-request-id')||undefined});
      return json(result);
    }
    if (['publish_reply', 'verify_reply'].includes(body.action)) {
      const authorization = await authorizedGoogleRole(db, user.id, body.action,requestedBranch);
      const before = await getWork(db, body);
      const result = await publishWork(db, user, body, token);
      if(result.item?.status==='published') await recordAiOutcome(db,{item:result.item,actorId:user.id,action:'published'});
      await writeGoogleAudit(db, { userId: user.id, role: authorization.role, action: body.action, entityType: 'review_work_item', entityId: before.id, beforeState: { status: before.status, version: before.version }, afterState: { status: result?.item?.status, version: result?.item?.version, googleReplyState: result?.item?.review_snapshot?.google_reply_state }, detail: body.action === 'publish_reply' ? 'Yetkili Google yanıt yayınlama denemesi.' : 'Google yanıt yayın sonucu doğrulandı.', requestId: req.headers.get('x-request-id') || undefined });
      return json(result);
    }
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
    if (error instanceof AiTelemetryError) return json({error:error.message},error.status);
    if (error instanceof GoogleApiError) return json({ error: error.message, code: error.code, source: 'google' }, error.status);
    if (error instanceof Error && Number.isInteger((error as any).status) && (error as any).status>=400 && (error as any).status<=599) return json({error:error.message},(error as any).status);
    return json({ error: error instanceof Error ? error.message : 'Beklenmeyen hata.' }, 500);
  }
});
