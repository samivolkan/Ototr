(function () {
  'use strict';

  const embedded = new URLSearchParams(location.search).get('embedded') === '1' && window.parent !== window;
  const parentApi = embedded ? window.parent.OTOTRGoogleReputation : null;
  const liveBranchId = 'branch-google-nilufer';
  const allowedNames = new Set(['Bursa Nilüfer', 'Kocaeli Gebze', 'Bursa İnegöl']);

  function branchFullName(branch) {
    return `${branch.city || ''} ${branch.name || ''}`.trim();
  }

  function applyScope() {
    if (typeof BRANCHES === 'undefined' || !Array.isArray(BRANCHES)) return;
    BRANCHES.forEach((branch, index) => {
      const fullName = branchFullName(branch);
      branch.hidden = !allowedNames.has(fullName);
      branch.live = index === 0;
      branch.demo = index === 1 || index === 2;
      if (branch.demo) {
        branch.gbp = '';
        branch.lastSync = 'Demo veri · dış gönderim kapalı';
      }
    });
    BRANCHES.splice(3);
    [LEGAL_CASES, COMPLAINTS, APPROVALS].forEach(rows => rows?.forEach(row => { row.branchIdx = Number(row.branchIdx || 0) % 3; }));
    if (typeof REVIEWS !== 'undefined' && Array.isArray(REVIEWS)) {
      REVIEWS.forEach((review, index) => {
        if (review.store !== 'Bursa Nilüfer') review.store = index % 2 ? 'Kocaeli Gebze' : 'Bursa İnegöl';
        review.demo = review.store !== 'Bursa Nilüfer';
      });
    }
  }

  function hydrateLiveNilufer() {
    if (!parentApi || typeof BRANCHES === 'undefined' || typeof REVIEWS === 'undefined') return;
    const live = parentApi.getBranchById?.(liveBranchId);
    const reviews = parentApi.fetchGoogleReviews?.(liveBranchId) || [];
    const target = BRANCHES[0];
    if (live && target) {
      target.actual = Number(live.googleReviewCount ?? reviews.length ?? target.actual);
      target.rating = Number(live.googleRating ?? target.rating);
      target.responseRate = target.actual ? Math.round((target.actual - Number(live.unrepliedCount || 0)) / target.actual * 100) : 0;
      target.criticalRate = target.actual ? Math.round(Number(live.criticalCount || 0) / target.actual * 100) : 0;
      target.lastSync = live.lastSyncedAt ? new Date(live.lastSyncedAt).toLocaleString('tr-TR') : 'Senkronizasyon bekleniyor';
    }
    const mapped = reviews.filter(review => !review.demo).map((review, index) => ({
      id: `live-${review.id || index}`,
      googleReviewId: review.googleReviewId,
      store: 'Bursa Nilüfer',
      author: review.reviewerName || 'Google kullanıcısı',
      stars: Number(review.starRating || review.rating || 0),
      risk: Number(review.starRating || review.rating || 0) <= 2 ? 85 : Number(review.starRating || review.rating || 0) === 3 ? 45 : 8,
      tag: Number(review.starRating || review.rating || 0) <= 2 ? 'Kritik' : Number(review.starRating || review.rating || 0) === 3 ? 'Takip' : 'Olumlu',
      text: review.comment || '',
      drafts: [],
      status: review.isReplied ? 'gonderildi' : 'bekliyor',
      time: review.reviewDate ? new Date(review.reviewDate).toLocaleString('tr-TR') : 'Canlı Google kaydı',
      slaH: 12,
      escalated: false,
      createdAt: review.reviewDate || new Date().toISOString(),
      pipeline: typeof makePipe === 'function' ? makePipe(review.reviewDate || new Date().toISOString(), review.isReplied ? { respondedTs: review.replyDate || review.updateDate || new Date().toISOString(), closedTs: review.replyDate || review.updateDate || new Date().toISOString() } : {}) : null,
    }));
    if (mapped.length) REVIEWS.splice(0, REVIEWS.length, ...mapped, ...REVIEWS.filter(review => review.store === 'Kocaeli Gebze' || review.store === 'Bursa İnegöl'));
  }

  function secureLiveActions(event) {
    if (!embedded || !parentApi) return;
    const control = event.target.closest('button,a');
    if (!control) return;
    const label = (control.textContent || '').toLocaleLowerCase('tr-TR');
    if (/senkron/.test(label)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void parentApi.syncGoogleReviewsForBranch?.(liveBranchId);
      return;
    }
    if (/google.*(gönder|yayın)|onayla.*yayın|yanıtla/.test(label)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      parentApi.setCenterView?.('inbox', 'waiting');
    }
  }

  function markEnvironment() {
    document.documentElement.dataset.erpEmbedded = embedded ? 'true' : 'false';
    const env = document.querySelector('.env');
    if (env) env.innerHTML = '<i></i>Bursa canlı · Gebze/İnegöl demo';
    document.querySelectorAll('option').forEach(option => {
      if (/Gebze|İnegöl/.test(option.textContent || '') && !/Demo/.test(option.textContent || '')) option.textContent += ' · Demo';
    });
    if (embedded) {
      STATE.onboarded = true;
      const tour = document.getElementById('tourOverlay');
      if (tour) tour.style.display = 'none';
    }
  }

  applyScope();
  hydrateLiveNilufer();
  markEnvironment();
  document.addEventListener('click', secureLiveActions, true);
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.data?.type !== 'ototr-google-refresh') return;
    hydrateLiveNilufer();
    if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
  });
  if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
})();
