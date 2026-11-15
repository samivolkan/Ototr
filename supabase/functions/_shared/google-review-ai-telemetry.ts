// Used only by authenticated server handlers. No customer/reply text is persisted.
const connection = 'ototr-primary';
const branch = 'branch-google-nilufer';
export class AiTelemetryError extends Error {
  status: number;
  constructor(message: string, status = 409) { super(message); this.status = status; }
}
async function digest(text: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), value => value.toString(16).padStart(2, '0')).join('');
}
export async function verifyAiGeneration(db: any, generationId: unknown, options: { reviewId: string; replyText?: string }) {
  if (typeof generationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(generationId)) throw new AiTelemetryError('Geçerli AI üretim kaydı gerekli.', 400);
  const result = await db.from('google_review_ai_generations').select('id,review_id,context,status,model,reply_sha256,experiment_id,experiment_version,variant,quality_score,requires_human_review').eq('connection_id', connection).eq('branch_id', branch).eq('id', generationId).maybeSingle();
  if (result.error) throw new AiTelemetryError('AI üretim kaydı okunamadı.', 503);
  const row = result.data;
  if (!row || row.context !== 'generate' || row.status !== 'succeeded' || !row.review_id || row.review_id !== options.reviewId) throw new AiTelemetryError('AI üretimi bu Google yorumuyla eşleşmiyor.');
  if (options.replyText !== undefined && (!row.reply_sha256 || row.reply_sha256 !== await digest(options.replyText.trim()))) throw new AiTelemetryError('AI metni kayıtlı üretimle eşleşmiyor. Düzenlenmiş metni manuel taslak olarak kaydedin.');
  return row;
}
export async function recordAiOutcome(db: any, options: { item: any; actorId: string; action: 'saved' | 'edited' | 'rejected' | 'published'; generationId?: string }) {
  const { item, actorId, action } = options;
  const generationId = options.generationId || item?.review_snapshot?.ai_analysis?.generation_id;
  if (!generationId) return { recorded: false, reason: 'no_generation' };
  if (item?.branch_id !== branch || item?.connection_id !== connection || item?.kind !== 'reply' || !['saved', 'edited', 'rejected', 'published'].includes(action)) throw new AiTelemetryError('AI sonuç kaydı bu işlem kapsamıyla eşleşmiyor.', 400);
  const generation = await verifyAiGeneration(db, generationId, { reviewId: item.review_id });
  const row = {
    generation_id: generation.id, connection_id: connection, branch_id: branch,
    work_item_id: item.id, actor_id: actorId, action,
    event_key: `${item.id}:${item.version}:${action}:${generation.id}`,
  };
  const result = await db.from('google_review_ai_outcomes').insert(row);
  if (result.error?.code === '23505') return { recorded: true, replayed: true };
  if (result.error) throw new AiTelemetryError('İşlem kaydedildi ancak AI sonuç ölçümü kaydedilemedi. Ölçüm eksikliği giderilmelidir.', 503);
  return { recorded: true, replayed: false };
}
