export function createHandoffService({ rpc, getVersion, getSnapshot, isReady, sync, newId }) {
  const views = new Map(), attempts = new Map();
  function validate(d, id) {
    if (d?.source !== 'task2' || d.task_id !== id || d.meaning !== 'ownership_changes_only_on_recipient_acceptance' ||
      !['none', 'pending', 'accepted', 'declined', 'cancelled'].includes(d.state) ||
      !Number.isSafeInteger(d.version) || d.version < 0 || !Number.isSafeInteger(d.workspace_version) || d.workspace_version < 1 ||
      !/^[a-f0-9]{32}$/.test(d.source_revision) ||
      !['current', 'is_owner', 'is_manager', 'is_recipient'].every(k => typeof d[k] === 'boolean') ||
      !['acceptance', 'resolution', 'sender_id', 'recipient_id'].every(k => d[k] === null || typeof d[k] === 'string')) throw Error('Devir kaydı doğrulanamadı.');
    return d;
  }
  function current(id) {
    const v = views.get(id);
    return !!v && isReady() && getVersion() === v.version && getSnapshot() === v.snapshot;
  }
  async function read(id) {
    if (!isReady()) throw Error('Kaydı bekleyin; demo modunda canlı devir açılmaz.');
    const version = getVersion(), snapshot = getSnapshot();
    const d = validate(await rpc({ p_task_id: id, p_action: 'read' }), id);
    if (!isReady() || getVersion() !== version || getSnapshot() !== snapshot || d.workspace_version !== version)
      throw Error('Ekran eski veya değişti; görevleri yenileyip tekrar okuyun.');
    views.set(id, { data: structuredClone(d), version, snapshot });
    return structuredClone(d);
  }
  async function act(id, action, payload) {
    if (!current(id)) throw Error('Önce güncel devir durumunu okuyun.');
    const d = views.get(id).data;
    const pending = d.current && d.state === 'pending';
    const allowed = { offer: d.is_owner && !pending, accept: pending && d.is_recipient,
      decline: pending && d.is_recipient, cancel: pending && (d.is_owner || d.is_manager) };
    if (!allowed[action]) throw Error('Bu devir adımı için yetki veya durum uygun değil.');
    const key = JSON.stringify([id, action, d.source_revision, d.version, payload]);
    if (!attempts.has(key)) attempts.set(key, newId());
    const result = validate(await rpc({ p_task_id: id, p_action: action, p_revision: d.source_revision,
      p_version: d.version, p_request_id: attempts.get(key), p_payload: payload }), id);
    // Server-side task updates must be reloaded, never patched from UI assumptions.
    await sync();
    if (!isReady() || getVersion() !== result.workspace_version) {
      views.delete(id);
      throw Error('İşlem yanıtı alındı; güncel görev ekranı doğrulanamadı. Yenileyip devir durumunu kontrol edin.');
    }
    views.set(id, { data: structuredClone(result), version: getVersion(), snapshot: getSnapshot() });
    return structuredClone(result);
  }
  return { read, act, current };
}
