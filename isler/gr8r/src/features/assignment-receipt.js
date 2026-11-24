// Transport-independent receipt client. No writes to the workspace or task data.
export function createAssignmentReceiptService({ rpc, getVersion, getSnapshot, isReady, newId }) {
  const attempts = new Map();
  function validate(data, taskId) {
    if (data?.source !== 'task2' || data.task_id !== taskId || data.meaning !== 'assignment_acknowledgement_only' ||
      typeof data.accepted !== 'boolean' || !Number.isSafeInteger(data.workspace_version) ||
      data.workspace_version < 1 || !/^[a-f0-9]{32}$/.test(data.source_revision)) throw Error('Kabul kaydı doğrulanamadı.');
    return data;
  }
  async function read(taskId) {
    if (!isReady()) throw Error('Önce değişikliklerin kaydedilmesini bekleyin; demo modunda kabul yazılmaz.');
    const snapshot = getSnapshot(), version = getVersion();
    const data = validate(await rpc('get_task2_assignment_receipt', { p_task_id: taskId }), taskId);
    if (!isReady() || version !== getVersion() || snapshot !== getSnapshot() || data.workspace_version !== version)
      throw Error('Görev ekranı değişti veya eski; yenileyip tekrar inceleyin.');
    return data;
  }
  async function accept(taskId) {
    const snapshot = getSnapshot();
    const data = await read(taskId);
    if (!data.current_owner || data.archived || !['todo', 'backlog', 'progress'].includes(data.task_status))
      throw Error('Görevi yalnız atanmış çalışan uygun aşamada kabul edebilir.');
    if (!isReady() || snapshot !== getSnapshot()) throw Error('Görev değişti; yeniden inceleyin.');
    const key = `${taskId}:${data.source_revision}`;
    if (!attempts.has(key)) attempts.set(key, newId());
    const result = validate(await rpc('accept_task2_assignment', {
      p_task_id: taskId, p_revision: data.source_revision, p_request_id: attempts.get(key),
    }), taskId);
    if (!result.accepted) throw Error('Kabul doğrulanamadı.');
    return result;
  }
  return { read, accept };
}
