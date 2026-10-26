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
  const value = JSON.parse(dictionary).default;
  if (typeof value !== 'string' || !value) throw new Error(`${dictionaryName}.default tanımlı değil.`);
  return value;
}
function admin() { return createClient(env('SUPABASE_URL'), injectedSupabaseKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS'), { auth: { persistSession: false, autoRefreshToken: false } }); }
async function currentUser(req: Request) {
  const token = req.headers.get('authorization');
  if (!token) throw new Error('ERP oturumu gerekli.');
  const client = createClient(env('SUPABASE_URL'), injectedSupabaseKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS'), { global: { headers: { Authorization: token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('ERP oturumu geçersiz.');
  return data.user;
}
async function accessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env('GOOGLE_OAUTH_CLIENT_ID'), client_secret: env('GOOGLE_OAUTH_CLIENT_SECRET'), refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token yenileme başarısız.');
  return data.access_token as string;
}
async function googleJson(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || data.error_description || 'Google Business Profile API hatası.');
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.searchParams.has('code')) {
      const userId = await verifyState(url.searchParams.get('state') || '');
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: url.searchParams.get('code') || '', client_id: env('GOOGLE_OAUTH_CLIENT_ID'), client_secret: env('GOOGLE_OAUTH_CLIENT_SECRET'), redirect_uri: callbackUrl, grant_type: 'authorization_code' }) });
      const tokens = await response.json();
      if (!response.ok || !tokens.refresh_token) throw new Error(tokens.error_description || 'Google kalıcı erişim anahtarı alınamadı.');
      const db = admin();
      const { error } = await db.from('google_business_connections').upsert({ id: 'ototr-primary', connected_by: userId, refresh_token_encrypted: await encrypt(tokens.refresh_token), scope: tokens.scope || '', connected_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) throw error;
      return Response.redirect(erpUrl, 302);
    }
    if (req.method !== 'POST') return json({ error: 'Desteklenmeyen yöntem.' }, 405);
    const user = await currentUser(req);
    const body = await req.json();
    const db = admin();
    if (body.action === 'start') {
      const state = await makeState(user.id);
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.search = new URLSearchParams({ client_id: env('GOOGLE_OAUTH_CLIENT_ID'), redirect_uri: callbackUrl, response_type: 'code', scope: 'https://www.googleapis.com/auth/business.manage', access_type: 'offline', prompt: 'consent', state }).toString();
      return json({ auth_url: authUrl.toString() });
    }
    const { data: connection } = await db.from('google_business_connections').select('*').eq('id', 'ototr-primary').maybeSingle();
    if (body.action === 'status') return json({ connected: Boolean(connection), connected_at: connection?.connected_at || null });
    if (!connection) return json({ error: 'Google Business Profile bağlantısı kurulmamış.' }, 409);
    const token = await accessToken(await decrypt(connection.refresh_token_encrypted));
    if (body.action === 'accounts') {
      const data = await googleJson('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', token);
      return json(data);
    }
    if (body.action === 'locations') {
      const accountId = String(body.account_id || '');
      if (!/^accounts\/\d+$/.test(accountId)) return json({ error: 'Geçersiz Google hesap kimliği.' }, 400);
      const data = await googleJson(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storeCode,metadata&pageSize=100`, token);
      return json(data);
    }
    if (body.action === 'reviews') {
      const locationId = String(body.location_id || '');
      const accountId = String(body.account_id || '');
      if (!/^\d+$/.test(locationId) || !/^\d+$/.test(accountId)) return json({ error: 'Geçersiz Google hesap/konum kimliği.' }, 400);
      return json(await googleJson(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`, token));
    }
    if (body.action === 'reply') {
      const accountId = String(body.account_id || ''), locationId = String(body.location_id || ''), reviewId = String(body.review_id || ''), reply = String(body.reply || '').trim();
      if (!/^\d+$/.test(locationId) || !/^\d+$/.test(accountId) || !reviewId || !reply) return json({ error: 'Cevap için hesap, konum, yorum ve metin gereklidir.' }, 400);
      return json(await googleJson(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${encodeURIComponent(reviewId)}/reply`, token, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: reply }) }));
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Beklenmeyen hata.' }, 500);
  }
});

