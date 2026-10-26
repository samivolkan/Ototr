(function () {
  'use strict';

  const DRAFTS_KEY = 'ototr-google-review-ai-drafts-v1';
  const AI_ENDPOINT = 'https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-review-ai';

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function session() {
    try { return JSON.parse(localStorage.getItem('ototr-dealer-supabase-session-v1') || 'null'); }
    catch (_) { return null; }
  }

  function fallbackReply(review, branch) {
    const team = `${String(branch.name || 'OTOTR').replace(/ Test Şube$/i, '').trim()} ekibi`;
    if (Number(review.rating) >= 4) {
      return `Deneyiminizi bizimle paylaştığınız için çok teşekkür ederiz. Güzel değerlendirmeniz ekibimiz için çok kıymetli; sizi yeniden ağırlamaktan memnuniyet duyarız.\n\n${team}`;
    }
    return `Geri bildiriminizi dikkatle okuduk. Yaşadığınız deneyimi inceleyip gerekli iyileştirmeleri yapabilmemiz için konuyu şube yönetimimizle değerlendireceğiz. Bizimle iletişime geçerseniz size doğrudan yardımcı olmak isteriz.\n\n${team}`;
  }

  function ensureModal() {
    let modal = document.getElementById('googleReviewAiModal');
    if (modal) return modal;
    const style = document.createElement('style');
    style.textContent = `
      .google-ai-modal{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.58);display:none;place-items:center;padding:20px}
      .google-ai-modal.open{display:grid}.google-ai-dialog{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border:1px solid #dbe3ee;border-radius:18px;box-shadow:0 30px 80px rgba(15,23,42,.25);padding:20px;color:#18202b}
      .google-ai-dialog h2{margin:0;font-size:22px}.google-ai-dialog p{color:#667085;line-height:1.5}.google-ai-dialog textarea{width:100%;min-height:180px;resize:vertical;border:1px solid #cfd8e6;border-radius:12px;padding:14px;font:inherit;line-height:1.55;box-sizing:border-box}
      .google-ai-meta{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.google-ai-meta span{padding:5px 8px;border-radius:999px;background:#f2f5f9;font-size:11px;font-weight:800}
      .google-ai-warning{border:1px solid #f8d49b;background:#fff8eb;border-radius:10px;padding:10px 12px;color:#805100;font-size:12px;margin:12px 0}
      .google-ai-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}.google-ai-actions button{border:1px solid #d4dce8;background:#fff;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer}.google-ai-actions .primary{background:#111827;color:#fff;border-color:#111827}
      body.dark-mode .google-ai-dialog{background:#111f33;color:#f1f5f9;border-color:#2b3c56}body.dark-mode .google-ai-dialog textarea{background:#0b1627;color:#f1f5f9;border-color:#40516b}
    `;
    document.head.appendChild(style);
    modal = document.createElement('div');
    modal.id = 'googleReviewAiModal';
    modal.className = 'google-ai-modal';
    modal.innerHTML = `<section class="google-ai-dialog" role="dialog" aria-modal="true" aria-labelledby="googleAiTitle">
      <h2 id="googleAiTitle">AI yanıt taslağı</h2><p id="googleAiContext"></p>
      <div class="google-ai-meta" id="googleAiMeta"></div>
      <textarea id="googleAiReply" aria-label="Google yorum yanıt taslağı"></textarea>
      <div class="google-ai-warning" id="googleAiWarning"></div>
      <div class="google-ai-actions"><button type="button" data-google-ai-close>Kapat</button><button type="button" data-google-ai-regenerate>Yeniden üret</button><button type="button" class="primary" data-google-ai-queue>Onay kuyruğuna al</button></div>
    </section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('[data-google-ai-close]')) modal.classList.remove('open'); });
    modal.querySelector('[data-google-ai-regenerate]').addEventListener('click', () => generate(modal.dataset.reviewId, true));
    modal.querySelector('[data-google-ai-queue]').addEventListener('click', () => {
      const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
      drafts.unshift({ reviewId: modal.dataset.reviewId, reply: modal.querySelector('#googleAiReply').value.trim(), status: 'approval_pending', createdAt: new Date().toISOString() });
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 100)));
      modal.classList.remove('open');
      if (typeof window.toast === 'function') window.toast('Yanıt, genel merkez onay kuyruğuna alındı. Google’a gönderilmedi.');
    });
    return modal;
  }

  async function requestDraft(review, branch) {
    const auth = session();
    if (!auth?.access_token || typeof DEALER_SUPABASE_KEY === 'undefined') throw new Error('ERP oturumu veya backend bağlantısı bulunamadı.');
    const response = await globalThis.fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { apikey: DEALER_SUPABASE_KEY, Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', review: { id: review.id, rating: review.rating, comment: review.comment }, branch: { id: branch.id, name: branch.name, city: branch.city } })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `AI servisi ${response.status} hatası verdi (${new URL(response.url).hostname}).`);
    return data;
  }

  async function generate(reviewId, regenerate) {
    const api = window.OTOTRGoogleReputation;
    const review = (api?.demoReviews || []).find((item) => item.id === reviewId);
    const branch = review && (api?.demoBranches || []).find((item) => item.id === review.branchId);
    if (!review || !branch) return '';
    const modal = ensureModal();
    modal.dataset.reviewId = reviewId;
    modal.classList.add('open');
    modal.querySelector('#googleAiContext').textContent = `${branch.name} · ${review.rating}/5 · ${review.comment}`;
    modal.querySelector('#googleAiMeta').innerHTML = '<span>Hazırlanıyor…</span>';
    modal.querySelector('#googleAiWarning').textContent = 'Taslak otomatik yayımlanmaz. Düşük puan, hukuki iddia, iade veya güvenlik konusu varsa insan onayı zorunludur.';
    if (!regenerate) modal.querySelector('#googleAiReply').value = '';
    try {
      const result = await requestDraft(review, branch);
      modal.querySelector('#googleAiReply').value = result.reply || '';
      modal.querySelector('#googleAiMeta').innerHTML = `<span>${esc(result.tone || 'doğal')}</span><span>Kalite ${esc(result.quality_score ?? '-')} / 100</span><span>${result.requires_human_review ? 'İnsan onayı zorunlu' : 'Standart onay'}</span>`;
      modal.querySelector('#googleAiWarning').textContent = result.risk_reason || 'Metni kontrol ettikten sonra onay kuyruğuna alın.';
    } catch (error) {
      modal.querySelector('#googleAiReply').value = fallbackReply(review, branch);
      modal.querySelector('#googleAiMeta').innerHTML = '<span>Güvenli yerel taslak</span><span>API bağlantısı bekleniyor</span>';
      modal.querySelector('#googleAiWarning').textContent = `${error.message} Taslak yerelde üretildi ve Google’a gönderilmedi.`;
    }
    return modal.querySelector('#googleAiReply').value;
  }

  function install() {
    if (!window.OTOTRGoogleReputation) return setTimeout(install, 100);
    window.OTOTRGoogleReputation.generateReplyDraft = generate;
    window.OTOTRGoogleReviewAI = { generate, getApprovalQueue: () => JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') };
  }

  install();
})();
