import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { processOutboxBatch } from './handler.mjs';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const env = (name: string) => Deno.env.get(name) || '';
const equal = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Yalnız POST desteklenir.' }, 405);
  if (!equal(req.headers.get('x-franchise-worker-secret') || '', env('FRANCHISE_WORKER_SECRET'))) return json({ error: 'Yetkisiz worker çağrısı.' }, 401);
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Worker veritabanı yapılandırması eksik.' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const claim = await db.rpc('claim_franchise_outbox', { p_limit: 25 });
  if (claim.error) return json({ error: 'Outbox alınamadı.' }, 503);
  const results = await processOutboxBatch(claim.data || [], {
    env,
    fetcher: fetch,
    finish: async (id: string, success: boolean, error: string | null) => {
      const result = await db.rpc('finish_franchise_outbox', { p_event_id: id, p_success: success, p_error: error });
      if (result.error) throw new Error('Outbox sonucu kaydedilemedi.');
    }
  });
  return json({ claimed: (claim.data || []).length, processed: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length });
});
