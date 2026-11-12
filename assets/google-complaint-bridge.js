(function () {
  'use strict';

  const clean = (value, limit = 600) => String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);

  function ratingOf(value) {
    const named = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    const parsed = typeof value === 'string' && named[value.toUpperCase()] ? named[value.toUpperCase()] : Number(value);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 0;
  }

  function riskFor(review = {}) {
    const rating = ratingOf(review.starRating ?? review.rating);
    const text = clean(review.comment, 6000);
    const unresolvedIntent = /iade|geri\s*ödeme|çözüm\s*bekliyorum|dönüş\s*bekliyorum|şik[aâ]yet\s*edeceğim/i.test(text);
    const complaintIntent = /şik[aâ]yet|mağdur|iade|geri\s*ödeme|çözüm\s*bekliyorum|dönüş\s*bekliyorum|memnun\s*değilim|kötü|rezalet/i.test(text);
    const positiveResolution = /işini\s*bilen|teşekkür|memnun\s*kald|rahat\s*etti|yardımcı\s*old|profesyonel|iyi\s*(bir\s*)?ekip/i.test(text);
    const negativeContext = (rating >= 1 && rating <= 3) || unresolvedIntent || (complaintIntent && !positiveResolution);
    const legalTerm = /dava|avukat|hukuk|mahkeme|tazminat|savcılık|şik[aâ]yet\s*edeceğim/i.test(text);
    const criticalTerm = /dolandır|sahte|tehdit|can\s*güven|kişisel\s*veri/i.test(text);
    const legal = legalTerm && negativeContext;
    const critical = rating === 1 || (criticalTerm && negativeContext);
    const riskLevel = critical ? 'critical' : rating === 2 || unresolvedIntent || (complaintIntent && !positiveResolution) ? 'negative' : rating === 3 || rating === 0 ? 'neutral' : 'positive';
    return { rating, text, legal, critical, riskLevel };
  }

  function maskReviewer(value) {
    const name = clean(value, 180);
    if (!name || /^google kullanıcısı$/i.test(name)) return 'Google kullanıcısı';
    return name.split(' ').filter(Boolean).slice(0, 3).map(part => `${(part.match(/[\p{L}\p{N}]/u)?.[0]||'*').toLocaleUpperCase('tr-TR')}***`).join(' ');
  }

  function maskComment(value, reviewerName = '') {
    let masked = clean(value, 6000)
      .replace(/https?:\/\/\S+/gi, '[bağlantı gizlendi]')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[e-posta gizlendi]')
      .replace(/(?:\+?90[\s.-]?)?(?:0?\s*\(?[2-5]\d{2}\)?)[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g, '[telefon gizlendi]')
      .replace(/(?:T\.?\s*C\.?\s*)?\b\d{3}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{2}\b/gi, '[kimlik no gizlendi]')
      .replace(/\bTR(?:[\s.-]?\d){24}\b/gi, '[IBAN gizlendi]')
      .replace(/\b(?:\d[\s-]?){13,19}\b/g, '[uzun numara gizlendi]')
      .replace(/\b(?:0[1-9]|[1-7][0-9]|8[01])\s?[A-ZÇĞİÖŞÜ]{1,3}\s?\d{2,4}\b/gi, '[plaka gizlendi]')
      .slice(0, 1200);
    const name = clean(reviewerName, 180);
    if (name && name.length >= 3) masked = masked.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'), maskReviewer(name));
    return masked;
  }

  function safeGoogleUrl(value) {
    if (typeof value !== 'string' || !value || value.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(value)) return '';
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.port) return '';
      const host = url.hostname.toLowerCase(), path = decodeURIComponent(url.pathname);
      const allowed = (['google.com', 'www.google.com'].includes(host) && /^\/(maps(?:\/|$)|search\/?$)/.test(path)) ||
        (host === 'maps.google.com' && (path === '/' || /^\/maps(?:\/|$)/.test(path))) ||
        (host === 'search.google.com' && /^\/local\/reviews\/?$/.test(path)) ||
        (host === 'business.google.com' && /^\/[a-z][a-z0-9_-]{0,31}\/[A-Za-z0-9_-]{1,512}\/reviews\/[A-Za-z0-9_-]{1,512}\/?$/.test(path));
      const redirectParam = [...url.searchParams.keys()].some(key => /^(url|u|qurl|target|dest|destination|redirect.*|continue|next|return.*|callback|link|followup)$/.test(key.toLowerCase().replace(/[-_]/g, '')));
      if (!allowed || redirectParam || /\/(url|redirect|out|imgres)(\/|$)/i.test(path)) return '';
      return url.href;
    } catch (_) { return ''; }
  }

  function ticketId(item) {
    const compact = clean(item?.id, 80).replace(/[^a-z0-9]/gi, '').slice(0, 12).toUpperCase();
    return compact ? `GGL-${compact}` : '';
  }

  function dateLabel(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : 'Zaman bilgisi yok';
  }

  function ticketFor(item, branch = {}, now = Date.now()) {
    if (!item || item.kind !== 'complaint' || !ticketId(item)) return null;
    const snapshot = item.review_snapshot && typeof item.review_snapshot === 'object' ? item.review_snapshot : {};
    const rating = ratingOf(snapshot.rating);
    if (!rating) return null;
    const risk = riskFor({ rating, comment: snapshot.comment });
    const createdAt = clean(item.created_at || item.updated_at, 80);
    const updatedAt = clean(item.updated_at || item.created_at, 80);
    const createdEpoch = new Date(createdAt).getTime();
    const updatedEpoch = new Date(updatedAt).getTime();
    const priority = risk.critical ? 'P0' : rating <= 2 ? 'P1' : 'P2';
    const slaLimit = priority === 'P0' ? 2 : priority === 'P1' ? 8 : 24;
    const closed = item.status === 'done';
    const deadlineEpoch = closed && Number.isFinite(updatedEpoch) ? updatedEpoch : Number(now);
    const ageHours = Number.isFinite(createdEpoch) && Number.isFinite(deadlineEpoch) ? Math.max(0, (deadlineEpoch - createdEpoch) / 3600000) : 0;
    const branchName = clean(item.branch_name || branch.name || 'Şube eşleşmesi bekleniyor', 180);
    const reviewerMasked = maskReviewer(snapshot.reviewer_name);
    const reviewComment = maskComment(snapshot.comment || 'Yorum metni paylaşılmamış.', snapshot.reviewer_name);
    const id = ticketId(item);
    return {
      id,
      customer: reviewerMasked,
      phone: 'Arayüzde gizli',
      plate: '—',
      branch: branchName.replace(/^OTOTR Oto Ekspertiz\s+/i, '') || branchName,
      region: clean(branch.region || branch.city || 'Bölge eşleşmesi bekleniyor', 80),
      type: `Google ${rating}/5 olumsuz yorum`,
      source: 'Google',
      priority,
      sla: ageHours > slaLimit ? 'Aşıldı' : 'İçinde',
      legalRisk: risk.legal ? 'Yüksek' : risk.critical ? 'Orta' : 'Yok',
      team: 'Müşteri Deneyimi + Şube',
      status: closed ? 'Kapandı' : 'İnceleme',
      lastAction: `${closed ? 'Görev tamamlandı' : 'Kalıcı görev kaydı açıldı'} · ${dateLabel(updatedAt)}`,
      summary: reviewComment,
      opened: dateLabel(createdAt),
      nextAction: closed ? 'Kapanış kanıtını doğrula' : 'Şube savunması ve yetkili müşteri dönüşü',
      rootCause: 'Google olumsuz yorum sinyali',
      compensation: 'Yetkili kararı bekleniyor',
      amountRisk: 0,
      brandRisk: risk.critical ? 'Yüksek' : rating <= 2 ? 'Orta' : 'Düşük',
      rating,
      reviewComment,
      reviewerMasked,
      googleReviewId: clean(item.review_id, 512),
      googleReviewUrl: safeGoogleUrl(snapshot.review_reply_url),
      googleWorkItemId: clean(item.id, 80),
      correlationId: `GGL-COR-${clean(item.id, 80).replace(/[^a-z0-9]/gi, '').slice(0, 24).toUpperCase()}`,
      createdAt,
      updatedAt,
      reviewDate: clean(snapshot.review_date, 80),
      note: clean(item.note, 600),
      isLiveGoogle: true
    };
  }

  window.OTOTRGoogleComplaintBridge = Object.freeze({ riskFor, maskReviewer, maskComment, safeGoogleUrl, ticketId, ticketFor });
})();
