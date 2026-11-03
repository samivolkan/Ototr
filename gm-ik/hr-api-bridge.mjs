const RPC_ALLOWLIST = new Set([
  'hr_my_context',
  'hr_dashboard',
  'hr_readiness_snapshot',
  'hr_acceptance_snapshot',
]);

function normalizeBaseUrl(value) {
  const url = new URL(String(value || '').trim());
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('İK API adresi HTTPS olmalıdır.');
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function validatePublishableKey(value) {
  const key = String(value || '').trim();
  if (!key.startsWith('sb_publishable_') || key.length < 24) {
    throw new Error('Yalnızca Supabase publishable key kabul edilir.');
  }
  return key;
}

export function readStoredAccessToken(storage = globalThis.localStorage) {
  if (!storage) return null;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
    try {
      const value = JSON.parse(storage.getItem(key));
      const token = Array.isArray(value) ? value[0]?.access_token : value?.access_token;
      if (typeof token === 'string' && token.split('.').length === 3) return token;
    } catch {
      // Ignore malformed or unrelated browser storage entries.
    }
  }
  return null;
}

export class HrApiBridge {
  constructor({ url, publishableKey, accessToken, fetchImpl = globalThis.fetch }) {
    this.url = normalizeBaseUrl(url);
    this.publishableKey = validatePublishableKey(publishableKey);
    this.accessToken = String(accessToken || '');
    this.fetchImpl = fetchImpl;
    if (!this.accessToken || this.accessToken.split('.').length !== 3) {
      throw new Error('Geçerli ERP oturumu bulunamadı.');
    }
    if (typeof this.fetchImpl !== 'function') throw new Error('Tarayıcı ağ istemcisi bulunamadı.');
  }

  async rpc(name, parameters = {}) {
    if (!RPC_ALLOWLIST.has(name)) throw new Error('İzin verilmeyen İK API işlemi.');
    const response = await this.fetchImpl(`${this.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: this.publishableKey,
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(parameters),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) throw new Error('İK yetkisi veya ERP oturumu doğrulanamadı.');
      if (status === 404) throw new Error('İK veritabanı paketi henüz bu ortamda etkin değil.');
      throw new Error(`İK API isteği tamamlanamadı (${status}).`);
    }
    return response.json();
  }
}

export function createHrApiFromBrowser(config = globalThis.OTOTR_SUPABASE_CONFIG, storage = globalThis.localStorage) {
  if (!config?.url || !config?.publishableKey) return null;
  const accessToken = readStoredAccessToken(storage);
  if (!accessToken) return null;
  return new HrApiBridge({ ...config, accessToken });
}
