import { esc } from '../core/utils.js';
const labels = { not_submitted: 'Henüz teslim yok', submitted: 'Bağımsız inceleme bekliyor', rejected: 'Düzeltme istendi', reviewed: 'Yönetici kapanışı bekliyor', closed: 'İncelenerek kapatıldı' };
export function deliveryPanel(id, data, current, busy = false, draft = {}) {
  const button = (action, label) => `<button class="btn btn-sm" data-a="${action}" data-id="${esc(id)}" ${busy ? 'disabled' : ''}>${label}</button>`;
  let body = '<p>Teslim ve inceleme kaydı henüz okunmadı.</p>';
  if (data) {
    body = `<p><strong>${esc(labels[data.state])}</strong></p>`;
    if (!current) body += '<p>Ekran değişti; işlem yapmadan teslim durumunu yenileyin.</p>';
    else {
      if (!data.current && data.state !== 'not_submitted') body += '<p>Görev kapsamı değişti. Aşağıdaki eski teslim güncel onay sayılmaz.</p>';
      if (data.reference) body += `<p>Kanıt referansı: ${esc(data.reference)}</p>`;
      if (data.review_note) body += `<p>İnceleme gerekçesi: ${esc(data.review_note)}</p>`;
      if (!data.archived) {
        if (data.is_owner && (!data.current || ['not_submitted', 'rejected'].includes(data.state)))
          body += `<label>Kanıt referansı<input class="input" data-delivery-reference value="${esc(draft.reference || '')}" maxlength="1000" placeholder="Dosya veya kayıt referansı"></label><p>Önce görevi kabul edip başlatın. Referansın içeriği insan incelemesinde doğrulanır.</p>${button('submitTaskDelivery', 'Kanıtla teslim et')}`;
        if (data.current && data.is_manager && !data.is_producer && data.state === 'submitted')
          body += `<label>İnceleme gerekçesi<textarea class="textarea" data-delivery-note maxlength="2000">${esc(draft.note || '')}</textarea></label>${button('approveTaskDelivery', 'Kanıtı inceledim, uygun')}${button('rejectTaskDelivery', 'Düzeltme iste')}`;
        if (data.current && data.is_manager && data.state === 'reviewed') body += button('closeTaskDelivery', 'Yönetici olarak işi kapat') + `<p><a href="../../ajan-ofisi/decision-desk.html?task=${encodeURIComponent(id)}">Karar gerekiyorsa plan hazırla →</a></p>`;
      }
    }
  }
  return `<section data-delivery-panel class="alert" style="display:block;margin:12px 0"><h3>Teslim ve inceleme</h3><p>Bu akış mali karar veya ekspertiz raporu onayı vermez.</p>${body}${button('loadTaskDelivery', 'Teslim durumunu yenile')}</section>`;
}
