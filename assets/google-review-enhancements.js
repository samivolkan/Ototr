/* Read-only DeepSeek improvements. Load after the ERP bridge and live view adapter. */
(function () {
  'use strict';

  const doc = window.document;
  const byId = id => doc.getElementById(id);
  const labels = { received: 'Alındı', assigned: 'Atandı', 'in-progress': 'İşlemde', resolved: 'Çözüldü' };
  const normalize = value => String(value ?? '').trim().toLocaleLowerCase('tr-TR');

  // The ERP bridge already escapes display strings. Decode once, then only use text nodes.
  function displayText(value) {
    return String(value ?? '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (whole, entity) => {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (entity[0] !== '#') return named[entity.toLowerCase()] ?? whole;
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
    });
  }

  function matchSegments(value, query) {
    const text = String(value ?? ''), needle = normalize(query);
    if (!needle) return [{ text, match: false }];
    const lower = text.toLocaleLowerCase('tr-TR'), parts = [];
    let from = 0, index;
    while ((index = lower.indexOf(needle, from)) !== -1) {
      if (index > from) parts.push({ text: text.slice(from, index), match: false });
      parts.push({ text: text.slice(index, index + needle.length), match: true });
      from = index + needle.length;
    }
    if (from < text.length) parts.push({ text: text.slice(from), match: false });
    return parts.length ? parts : [{ text, match: false }];
  }

  function highlightText(node, query) {
    if (!node) return;
    const fragments = matchSegments(node.textContent, query).map(part => {
      if (!part.match) return doc.createTextNode(part.text);
      const mark = doc.createElement('mark');
      mark.textContent = part.text;
      return mark;
    });
    node.replaceChildren(...fragments);
  }

  function branchName(row, branches) {
    if (row.store) return displayText(row.store);
    const branch = branches?.[row.branchIdx];
    return branch ? [branch.city, branch.name].filter(Boolean).join(' ') : '';
  }

  function sameBranch(a, b, branches) {
    const aId = a.branchId || a.branch_id, bId = b.branchId || b.branch_id;
    if (aId && bId) return String(aId) === String(bId);
    const aName = branchName(a, branches), bName = branchName(b, branches);
    return Boolean(aName && bName && aName === bName);
  }

  function isDemo(row, branches) {
    if (typeof row.demo === 'boolean') return row.demo;
    if (row.erpItemId || row.erpReviewId) return false;
    if (Number.isInteger(row.branchIdx)) return !branches?.[row.branchIdx]?.live;
    return true;
  }

  function relatedRecords(reviewId, data) {
    const source = (data.reviews || []).find(row => String(row.id) === String(reviewId));
    if (!source) return null;
    const matches = row => sameBranch(source, row, data.branches) &&
      isDemo(source, data.branches) === isDemo(row, data.branches) &&
      displayText(row.author ?? row.customer) === displayText(source.author);
    return {
      source,
      reviews: data.reviews.filter(matches),
      complaints: (data.complaints || []).filter(matches),
      legalCases: (data.legalCases || []).filter(matches)
    };
  }

  function scopedData() {
    const live = window.OTOTRReviewLiveViews;
    return {
      reviews: live?.scopedReviews?.() || (typeof roleReviews === 'function' ? roleReviews() : []),
      complaints: live?.scopedCollection?.('complaints') || (typeof COMPLAINTS !== 'undefined' ? COMPLAINTS : []),
      legalCases: live?.scopedCollection?.('legalCases') || (typeof LEGAL_CASES !== 'undefined' ? LEGAL_CASES : []),
      branches: typeof BRANCHES !== 'undefined' ? BRANCHES : []
    };
  }

  function element(tag, text, className) {
    const node = doc.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function formatDate(value) {
    if (!value) return 'Tarih kaydı yok';
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? 'Tarih kaydı yok' : date.toLocaleString('tr-TR');
  }

  function openHistory(reviewId) {
    const data = scopedData(), history = relatedRecords(reviewId, data);
    if (!history) return;
    byId('customerHistoryModal')?.remove();
    const trigger = doc.activeElement;
    const backdrop = element('div', null, 'mbd on');
    backdrop.id = 'customerHistoryModal';
    const dialog = element('div', null, 'modal');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'customerHistoryTitle');
    const head = element('div', null, 'mhead');
    const title = element('h3', 'Aynı görünen adla kayıtlar');
    title.id = 'customerHistoryTitle';
    const close = element('button', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Geçmişi kapat');
    const dismiss = () => { backdrop.remove(); trigger?.focus?.(); };
    close.addEventListener('click', dismiss);
    head.append(title, close);
    const body = element('div', null, 'mbody');
    body.id = 'customerHistoryBody';
    body.append(element('b', displayText(history.source.author)));
    body.append(element('p', `${branchName(history.source, data.branches)} · ${isDemo(history.source, data.branches) ? 'Demo' : 'Canlı ERP'}`));
    body.append(element('p', 'Yalnız seçilen şubede aynı görünen adı taşıyan kayıtlar listelenir. Bu eşleşme, kayıtların aynı kişiye ait olduğunu doğrulamaz.'));
    for (const [label, rows, review] of [['Yorumlar', history.reviews, true], ['Şikayet kayıtları', history.complaints, false], ['Hukuk kayıtları', history.legalCases, false]]) {
      body.append(element('h4', `${label} (${rows.length})`));
      if (!rows.length) { body.append(element('p', 'Bu kapsamda kayıt yok.')); continue; }
      const list = element('ul');
      for (const row of rows) {
        const item = element('li');
        const status = review ? `${row.stars}★ · ${row.status}` : `${displayText(row.category)} · ${row.status}`;
        item.append(element('p', `${status} · ${formatDate(row.createdAt || row.openedAt || row.opened)}`));
        item.append(element('p', displayText(review ? row.text : row.review || row.text || '')));
        list.append(item);
      }
      body.append(list);
    }
    dialog.append(head, body); backdrop.append(dialog); doc.body.append(backdrop);
    backdrop.addEventListener('click', event => { if (event.target === backdrop) dismiss(); });
    backdrop.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
      if (event.key === 'Tab') { event.preventDefault(); close.focus(); }
    });
    close.focus();
  }

  function enhanceReviews() {
    const query = typeof RV_SEARCH === 'string' ? RV_SEARCH : '';
    doc.querySelectorAll('#rvList .content p, #rvList .row1 > span:first-child, #rvDetail .review-quote > div').forEach(node => highlightText(node, query));
    const detail = doc.querySelector('#rvDetail .top');
    if (!detail || typeof SEL === 'undefined' || byId('customerHistoryButton')) return;
    const reviewId = SEL; // Capture canonical UI identity, never interpolate the customer name into JS.
    if (!scopedData().reviews.some(row => String(row.id) === String(reviewId))) return;
    const button = element('button', 'Görünen adın geçmişi', 'btn sm ghost');
    button.type = 'button'; button.id = 'customerHistoryButton';
    button.addEventListener('click', () => openHistory(reviewId));
    detail.append(button);
  }

  function filterTableRows(rows, value, column) {
    let visible = 0, total = 0;
    for (const row of rows) {
      if (!row.cells || row.cells.length <= column) continue;
      total++;
      row.hidden = Boolean(value && normalize(row.cells[column].textContent) !== normalize(value));
      if (!row.hidden) visible++;
    }
    return { visible, total };
  }

  function addSelect(id, label, options, host, onChange) {
    let select = byId(id);
    if (!select) {
      select = element('select'); select.id = id;
      select.setAttribute('aria-label', label);
      for (const [value, text] of options) {
        const option = element('option', text); option.value = value; select.append(option);
      }
      host.append(select);
      select.addEventListener('change', onChange);
    }
    return select;
  }

  function enhanceComplaints() {
    const table = byId('compTable');
    if (!table) return;
    let controls = byId('complaintFilterBar');
    if (!controls) {
      controls = element('div', null, 'filterbar'); controls.id = 'complaintFilterBar';
      table.closest('.tbl-wrap')?.before(controls);
    }
    const select = addSelect('compStatusF', 'Şikayet durumu', [['', 'Tüm durumlar'], ...Object.entries(labels)], controls, enhanceComplaints);
    const result = filterTableRows(table.querySelectorAll('tbody tr'), labels[select.value] || '', 6);
    let count = byId('complaintFilterCount');
    if (!count) { count = element('span', null, 'chip'); count.id = 'complaintFilterCount'; controls.append(count); }
    count.textContent = `${result.visible} / ${result.total} kayıt`;
    count.setAttribute('aria-live', 'polite');
  }

  function enhanceAudit() {
    const action = byId('auditActionF'), body = byId('auditBody');
    if (!action || !body) return;
    const rows = [...body.querySelectorAll('tr')];
    const entities = [...new Set(rows.filter(row => row.cells.length >= 5).map(row => row.cells[2].textContent.trim()))].sort();
    const select = addSelect('auditEntityF', 'Kayıt türü', [['', 'Tüm kayıt türleri']], action.parentElement, enhanceAudit);
    select.className = action.className;
    select.style.cssText = action.style.cssText;
    const selected = select.value;
    const values = new Set([...entities, ...(selected ? [selected] : [])]);
    select.replaceChildren();
    for (const [value, text] of [['', 'Tüm kayıt türleri'], ...[...values].map(value => [value, value])]) {
      const option = element('option', text); option.value = value; select.append(option);
    }
    select.value = selected;
    const result = filterTableRows(rows, selected, 2);
    let count = byId('auditFilterCount');
    if (!count) { count = element('span', null, 'chip'); count.id = 'auditFilterCount'; action.parentElement.append(count); }
    count.textContent = `${result.visible} / ${result.total} kayıt`;
    count.setAttribute('aria-live', 'polite');
  }

  function wrap(name, after) {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      const result = original.apply(this, args);
      after();
      return result;
    };
  }

  const refresh = () => { enhanceReviews(); enhanceComplaints(); enhanceAudit(); };
  window.OTOTRReviewEnhancements = Object.freeze({ refresh, openHistory, relatedRecords, displayText, matchSegments, highlightText, filterTableRows });
  wrap('renderReviews', enhanceReviews);
  wrap('renderComplaint', enhanceComplaints);
  wrap('renderAudit', enhanceAudit);
  const resetAudit = window.resetAudit;
  if (typeof resetAudit === 'function') window.resetAudit = function (...args) {
    if (byId('auditEntityF')) byId('auditEntityF').value = '';
    return resetAudit.apply(this, args);
  };
  refresh();
})();
