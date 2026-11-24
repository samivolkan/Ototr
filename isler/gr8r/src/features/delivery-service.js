export function createDeliveryService({ rpc, getVersion, getSnapshot, isReady, sync, newId }) {
  const views = new Map(), attempts = new Map();
  function validate(d, id) {
    if (d?.source !== 'task2' || d.task_id !== id || d.meaning !== 'human_review_required' ||
      !['not_submitted', 'submitted', 'rejected', 'reviewed', 'closed'].includes(d.state) ||
      !Number.isSafeInteger(d.version) || d.version < 0 || !Number.isSafeInteger(d.workspace_version) || d.workspace_version < 1 ||
      !/^[a-f0-9]{32}$/.test(d.source_revision) ||
      !['current', 'is_owner', 'is_manager', 'is_producer', 'archived'].every(k => typeof d[k] === 'boolean') ||
      !['reference', 'review_note'].every(k => d[k] === null || typeof d[k] === 'string')) throw Error('Teslim kaydı doğrulanamadı.');
    return d;
  }
  function current(id) {
    const v = views.get(id);
    return !!v && isReady() && getVersion() === v.version && getSnapshot() === v.snapshot;
  }
  async function read(id) {
    if (!isReady()) throw Error('Kaydı bekleyin; demo modunda canlı teslim açılmaz.');
    const version = getVersion(), snapshot = getSnapshot();
    const d = validate(await rpc({ p_task_id: id, p_action: 'read' }), id);
    if (!isReady() || getVersion() !== version || getSnapshot() !== snapshot || d.workspace_version !== version)
      throw Error('Ekran eski veya değişti; görevleri yenileyip tekrar okuyun.');
    views.set(id, { data: structuredClone(d), version, snapshot });
    return structuredClone(d);
  }
  async function act(id, action, payload) {
    if (!current(id)) throw Error('Önce güncel teslim durumunu okuyun.');
    const d = views.get(id).data;
    const canSubmit = d.is_owner && (!d.current || ['not_submitted', 'rejected'].includes(d.state));
    const canReview = d.current && d.is_manager && !d.is_producer && d.state === 'submitted';
    const canClose = d.current && d.is_manager && d.state === 'reviewed';
    if (d.archived || !({ submit: canSubmit, review: canReview, close: canClose })[action]) throw Error('Bu teslim adımı için yetki veya durum uygun değil.');
    const key = JSON.stringify([id, action, d.source_revision, d.version, payload]);
    if (!attempts.has(key)) attempts.set(key, newId());
    const result = validate(await rpc({ p_task_id: id, p_action: action, p_revision: d.source_revision,
      p_version: d.version, p_request_id: attempts.get(key), p_payload: payload }), id);
    // Server-side task updates must be reloaded, never patched from UI assumptions.
    await sync();
    if (!isReady() || getVersion() !== result.workspace_version) {
      views.delete(id);
      throw Error('İşlem yanıtı alındı; güncel görev ekranı doğrulanamadı. Yenileyip teslim durumunu kontrol edin.');
    }
    views.set(id, { data: structuredClone(result), version: getVersion(), snapshot: getSnapshot() });
    return structuredClone(result);
  }
  return { read, act, current };
}
