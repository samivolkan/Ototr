export const SOURCE_ENV = Object.freeze({
  finance: ['FRANCHISE_FINANCE_ADAPTER_URL','FRANCHISE_FINANCE_ADAPTER_TOKEN'],
  legal: ['FRANCHISE_LEGAL_ADAPTER_URL','FRANCHISE_LEGAL_ADAPTER_TOKEN'],
  hr: ['FRANCHISE_HR_ADAPTER_URL','FRANCHISE_HR_ADAPTER_TOKEN'],
  academy: ['FRANCHISE_ACADEMY_ADAPTER_URL','FRANCHISE_ACADEMY_ADAPTER_TOKEN'],
  operations: ['FRANCHISE_OPERATIONS_ADAPTER_URL','FRANCHISE_OPERATIONS_ADAPTER_TOKEN'],
  procurement: ['FRANCHISE_PROCUREMENT_ADAPTER_URL','FRANCHISE_PROCUREMENT_ADAPTER_TOKEN'],
  it: ['FRANCHISE_IT_ADAPTER_URL','FRANCHISE_IT_ADAPTER_TOKEN'],
  marketing: ['FRANCHISE_MARKETING_ADAPTER_URL','FRANCHISE_MARKETING_ADAPTER_TOKEN'],
  quality: ['FRANCHISE_QUALITY_ADAPTER_URL','FRANCHISE_QUALITY_ADAPTER_TOKEN'],
  ohs: ['FRANCHISE_OHS_ADAPTER_URL','FRANCHISE_OHS_ADAPTER_TOKEN'],
  architecture: ['FRANCHISE_ARCHITECTURE_ADAPTER_URL','FRANCHISE_ARCHITECTURE_ADAPTER_TOKEN'],
  tasks: ['FRANCHISE_TASKS_ADAPTER_URL','FRANCHISE_TASKS_ADAPTER_TOKEN']
});

export function adapterConfig(source, env) {
  const keys = SOURCE_ENV[source];
  if (!keys) throw new Error('Bilinmeyen franchise adaptör kaynağı.');
  const rawUrl = env(keys[0]);
  const token = env(keys[1]);
  if (!rawUrl || !token) throw new Error(`${source} adaptörü yapılandırılmadı.`);
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') throw new Error('Adaptör adresi HTTPS olmalıdır.');
  const allowed = String(env('FRANCHISE_ADAPTER_ALLOWED_HOSTS') || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(url.hostname.toLowerCase())) throw new Error('Adaptör alan adı izin listesinde değil.');
  return { url: url.toString(), token };
}

export async function deliverEvent(event, { env, fetcher = fetch }) {
  const config = adapterConfig(event.source, env);
  const response = await fetcher(config.url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${config.token}`,
      'content-type': 'application/json',
      'idempotency-key': event.id
    },
    body: JSON.stringify({
      id: event.id,
      franchiseCaseId: event.franchise_case_id,
      type: event.event_type,
      payload: event.payload,
      createdAt: event.created_at
    })
  });
  if (!response.ok) throw new Error(`Adaptör HTTP ${response.status}`);
  return { status: response.status };
}

export async function processOutboxBatch(events, dependencies) {
  const results = [];
  for (const event of events) {
    try {
      const delivered = await deliverEvent(event, dependencies);
      await dependencies.finish(event.id, true, null);
      results.push({ id: event.id, ok: true, delivered });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bilinmeyen adaptör hatası';
      await dependencies.finish(event.id, false, message);
      results.push({ id: event.id, ok: false, error: message });
    }
  }
  return results;
}
