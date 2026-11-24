import { esc } from '../core/utils.js';
const labels = { none: 'Devir yok', pending: 'Alıcının kabulü bekleniyor', accepted: 'Alıcı görevi devraldı', declined: 'Alıcı devri reddetti', cancelled: 'Devir iptal edildi' };
export function handoffPanel(id, data, current, busy = false, draft = {}, members = []) {
  const button = (action, label) => `<button class="btn btn-sm" data-a="${action}TaskHandoff" data-id="${esc(id)}" ${busy ? 'disabled' : ''}>${label}</button>`;
  const name = key => members.find(m => m.id === key)?.name || 'Çalışan kaydı';
  let body = '<p>Devir kaydı henüz okunmadı.</p>';
  if (data) {
    body = `<p><strong>${esc(labels[data.state])}</strong></p>`;
    if (!current) body += '<p>Ekran değişti; devir durumunu yenileyin.</p>';
    else {
      if (!data.current && data.state !== 'none') body += '<p>Eski devir güncel görev için geçerli değil.</p>';
      if (data.recipient_id) body += `<p>${esc(name(data.sender_id))} → ${esc(name(data.recipient_id))}</p>`;
      if (data.acceptance) body += `<p>Kabul koşulu: ${esc(data.acceptance)}</p>`;
      if (data.resolution) body += `<p>Gerekçe: ${esc(data.resolution)}</p>`;
      const pending = data.current && data.state === 'pending';
      if (data.is_owner && !pending) body += `<label>Devralacak çalışan<select class="input" data-handoff-recipient><option value="">Çalışan seçin</option>${members.map(m => `<option value="${esc(m.id)}" ${draft.recipient_id === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label><label>Kabul koşulu<textarea class="textarea" data-handoff-acceptance maxlength="2000">${esc(draft.acceptance || '')}</textarea></label><p>Önce güncel görevi kabul edin. Alıcının yetkisi sunucuda doğrulanır.</p>${button('offer', 'Devir öner')}`;
      if (pending && data.is_recipient) body += button('accept', 'Koşulları kabul et ve devral');
      if (pending && (data.is_recipient || data.is_owner || data.is_manager)) {
        body += `<label>Ret veya iptal gerekçesi<textarea class="textarea" data-handoff-reason maxlength="2000">${esc(draft.reason || '')}</textarea></label>`;
        if (data.is_recipient) body += button('decline', 'Gerekçeyle reddet');
        if (data.is_owner || data.is_manager) body += button('cancel', 'Devri iptal et');
      }
    }
  }
  return `<details data-handoff-panel class="alert" style="display:block;margin:12px 0" ${data || busy ? 'open' : ''}><summary>Görev devri</summary><p>Alıcı kabul edene kadar sorumluluk mevcut kişide kalır.</p>${body}${button('load', 'Devir durumunu yenile')}</details>`;
}
