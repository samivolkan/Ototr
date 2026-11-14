export const PROVIDER_CHANNELS = Object.freeze(['email', 'sms', 'whatsapp', 'esign']);

export const PURPOSE_RULES = Object.freeze({
  application_status: { channels: ['email', 'sms', 'whatsapp'], consent: 'data_processing' },
  appointment_reminder: { channels: ['email', 'sms', 'whatsapp'], consent: 'data_processing' },
  commercial_message: { channels: ['email', 'sms', 'whatsapp'], consent: 'commercial_communication' },
  contract_signature: { channels: ['email', 'sms', 'esign'], consent: 'data_processing' }
});

const REQUIRED_TEMPLATE_VARIABLES = Object.freeze({
  application_status: ['candidateName', 'applicationNo', 'status'],
  appointment_reminder: ['candidateName', 'appointmentAt'],
  commercial_message: ['candidateName', 'campaignName'],
  contract_signature: ['candidateName', 'contractNo', 'expiresAt']
});

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} zorunludur.`);
  return value.trim();
}

export function validateConsentReceipt(receipt, { now = new Date() } = {}) {
  if (!receipt || typeof receipt !== 'object') throw new Error('İzin makbuzu zorunludur.');
  requiredString(receipt.subjectId, 'subjectId');
  requiredString(receipt.purpose, 'purpose');
  requiredString(receipt.noticeVersion, 'noticeVersion');
  if (!['granted', 'withdrawn'].includes(receipt.status)) throw new Error('İzin durumu geçersiz.');
  const capturedAt = new Date(receipt.capturedAt);
  if (Number.isNaN(capturedAt.getTime()) || capturedAt > now) throw new Error('İzin zamanı geçersiz.');
  return true;
}

export function validateTemplate(template, purpose) {
  requiredString(template?.id, 'template.id');
  requiredString(template?.version, 'template.version');
  if (template?.status !== 'approved') throw new Error('Yalnızca onaylı şablon kullanılabilir.');
  const declared = new Set(template.variables || []);
  for (const variable of REQUIRED_TEMPLATE_VARIABLES[purpose] || []) {
    if (!declared.has(variable)) throw new Error(`Şablon değişkeni eksik: ${variable}`);
  }
  return true;
}

export function createProviderRequest(input, { now = new Date('2026-11-05T00:00:00Z') } = {}) {
  const rule = PURPOSE_RULES[input?.purpose];
  if (!rule) throw new Error('Bildirim amacı geçersiz.');
  if (!rule.channels.includes(input.channel)) throw new Error('Kanal bu amaç için kullanılamaz.');
  if (!PROVIDER_CHANNELS.includes(input.channel)) throw new Error('Sağlayıcı kanalı geçersiz.');
  validateTemplate(input.template, input.purpose);

  const activeConsent = (input.consents || []).find((receipt) => {
    validateConsentReceipt(receipt, { now });
    return receipt.purpose === rule.consent && receipt.status === 'granted';
  });
  if (!activeConsent) throw new Error(`Aktif ${rule.consent} izni bulunamadı.`);

  const variables = input.variables || {};
  for (const field of REQUIRED_TEMPLATE_VARIABLES[input.purpose] || []) {
    if (variables[field] === undefined || variables[field] === null || variables[field] === '') {
      throw new Error(`Mesaj değişkeni eksik: ${field}`);
    }
  }
  const caseId = requiredString(input.franchiseCaseId, 'franchiseCaseId');
  const recipientRef = requiredString(input.recipientRef, 'recipientRef');
  const businessKey = requiredString(input.businessKey, 'businessKey');
  return Object.freeze({
    idempotencyKey: `franchise:${caseId}:${input.purpose}:${input.channel}:${businessKey}`,
    franchiseCaseId: caseId,
    channel: input.channel,
    purpose: input.purpose,
    recipientRef,
    templateId: input.template.id,
    templateVersion: input.template.version,
    variables,
    consentReceiptId: activeConsent.id,
    requestedAt: now.toISOString()
  });
}

export function redactProviderLog(value) {
  const sensitive = /(^|_)(token|authorization|phone|email|recipient|tckn|identity|body|variables)($|_)/i;
  if (Array.isArray(value)) return value.map(redactProviderLog);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitive.test(key) ? '[REDACTED]' : redactProviderLog(item)]));
  }
  return value;
}

export async function deliverProviderRequest(request, provider) {
  if (!provider || typeof provider.send !== 'function') throw new Error('Sağlayıcı yapılandırılmadı.');
  const result = await provider.send(request, { idempotencyKey: request.idempotencyKey });
  if (!result || !['accepted', 'delivered'].includes(result.status) || !result.providerMessageId) {
    throw new Error('Sağlayıcı cevabı sözleşmeyle uyumsuz.');
  }
  return { status: result.status, providerMessageId: result.providerMessageId, acceptedAt: result.acceptedAt || null };
}
