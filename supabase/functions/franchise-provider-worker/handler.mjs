export const CHANNEL_ENV = Object.freeze({
  email: ['FRANCHISE_EMAIL_PROVIDER_URL', 'FRANCHISE_EMAIL_PROVIDER_TOKEN'],
  sms: ['FRANCHISE_SMS_PROVIDER_URL', 'FRANCHISE_SMS_PROVIDER_TOKEN'],
  whatsapp: ['FRANCHISE_WHATSAPP_PROVIDER_URL', 'FRANCHISE_WHATSAPP_PROVIDER_TOKEN'],
  esign: ['FRANCHISE_ESIGN_PROVIDER_URL', 'FRANCHISE_ESIGN_PROVIDER_TOKEN']
});

export function providerConfig(channel, env) {
  const keys = CHANNEL_ENV[channel];
  if (!keys) throw new Error('PROVIDER_CHANNEL_UNKNOWN');
  const rawUrl = env(keys[0]);
  const token = env(keys[1]);
  if (!rawUrl || !token) throw new Error('PROVIDER_NOT_CONFIGURED');
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:') throw new Error('PROVIDER_HTTPS_REQUIRED');
  const allowed = String(env('FRANCHISE_PROVIDER_ALLOWED_HOSTS') || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(url.hostname.toLowerCase())) throw new Error('PROVIDER_HOST_NOT_ALLOWED');
  return { url: url.toString(), token };
}

export async function sendProviderRequest(request, { env, fetcher = fetch }) {
  const config = providerConfig(request.channel, env);
  const response = await fetcher(config.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
      'idempotency-key': request.idempotency_key
    },
    body: JSON.stringify({
      requestId: request.id,
      channel: request.channel,
      purpose: request.purpose,
      recipientRef: request.recipient_ref,
      templateId: request.template_id,
      variables: request.variables
    })
  });
  if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
  const payload = await response.json();
  if (!['accepted','delivered'].includes(payload?.status) || typeof payload?.providerMessageId !== 'string' || !payload.providerMessageId.trim()) {
    throw new Error('PROVIDER_RESPONSE_INVALID');
  }
  return { status: payload.status, providerMessageId: payload.providerMessageId.trim() };
}

export async function processProviderBatch(requests, dependencies) {
  const results = [];
  for (const request of requests) {
    try {
      const delivery = await sendProviderRequest(request, dependencies);
      await dependencies.finish(request.id, true, delivery.status, delivery.providerMessageId, null);
      results.push({ id: request.id, ok: true, status: delivery.status });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'PROVIDER_ERROR';
      await dependencies.finish(request.id, false, null, null, code);
      results.push({ id: request.id, ok: false, errorCode: code });
    }
  }
  return results;
}
