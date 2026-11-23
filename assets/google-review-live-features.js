(function (root) {
  'use strict';
  const BRANCH = 'branch-google-nilufer';
  const currentBranch = () => root?.OTOTRReviewLiveViews?.getBranchId?.() || BRANCH;
  const events = [['sla_overdue', 'SLA aşımı'], ['critical_review', 'Kritik yorum'], ['legal_hold', 'Hukuki bekletme']];
  const field = (key, label, type = 'text', options = {}) => ({ key, label, type, ...options });
  const definitions = {
    templates: { title: 'Yanıt şablonu', defaults: { category: 'Genel', scope: 'branch' }, fields: [field('name', 'Şablon adı'), field('category', 'Kategori'), field('body', 'Yanıt metni A', 'textarea'), field('body_b', 'Yanıt metni B (isteğe bağlı)', 'textarea', { optional: true })] },
    experiments: { title: 'A/B deneyi', defaults: { status: 'draft', traffic_percent: 100 }, fields: [field('name', 'Deney adı'), field('template_id', 'Bağlı şablon (isteğe bağlı)', 'templates', { optional: true }), field('variant_a', 'A varyantı yönergesi', 'textarea'), field('variant_b', 'B varyantı yönergesi', 'textarea'), field('status', 'Durum', 'select', { options: [['draft', 'Taslak'], ['running', 'Çalışıyor'], ['paused', 'Duraklatıldı'], ['completed', 'Tamamlandı']] }), field('traffic_percent', 'Deneye alınacak canlı taslaklar (%)', 'number', { min: 1, max: 100 })] },
    escalation_rules: { title: 'Yükseltme kuralı', defaults: { event: 'sla_overdue', after_hours: 24, enabled: true }, fields: [field('name', 'Kural adı'), field('event', 'Olay', 'select', { options: events }), field('after_hours', 'Olaydan sonraki bekleme (saat)', 'number', { min: 0, max: 168 }), field('to_role', 'Sorumlu rol', 'roles'), field('enabled', 'Kural etkin', 'checkbox')] },
    notification_rules: { title: 'Bildirim tercihi', defaults: { event: 'critical_review', enabled: true, channels: ['in_app'] }, fields: [field('user_id', 'Kullanıcı', 'users'), field('event', 'Olay', 'select', { options: events }), field('enabled', 'ERP içi bildirim etkin', 'checkbox')] },
    store_groups: { title: 'Şube grubu', defaults: { branch_ids: [BRANCH] }, fields: [field('name', 'Grup adı')], note: 'Bu canlı kapsamda gruba Bursa Nilüfer eklenir. Demo şubeler canlı gruba alınmaz.' },
    branch_settings: { title: 'Şube ayarları', singleton: true, defaults: { lifecycle: 'active', tone: 'inherit', sla_hours: 24 }, fields: [field('lifecycle', 'Yaşam döngüsü', 'select', { options: [['onboarding', 'Onboarding'], ['demo', 'Demo'], ['live_candidate', 'Canlı adayı'], ['active', 'Aktif'], ['live', 'Canlı'], ['paused', 'Duraklatıldı'], ['archived', 'Arşiv']] }), field('tone', 'Yanıt tonu', 'select', { options: [['inherit', 'Genel ayardan'], ['samimi', 'Samimi'], ['profesyonel', 'Profesyonel'], ['empatik', 'Empatik'], ['temkinli', 'Temkinli']] }), field('sla_hours', 'Yanıt SLA (saat)', 'number', { min: 1, max: 168 })] },
    delegations: { title: 'Yetki devri', defaults: { scope: 'tasks', active: true }, fields: [field('from_user_id', 'Devreden', 'users'), field('to_user_id', 'Devralan', 'users'), field('starts_at', 'Başlangıç', 'datetime-local'), field('ends_at', 'Bitiş', 'datetime-local'), field('scope', 'Kapsam', 'select', { options: [['approvals', 'Yanıt onayları'], ['tasks', 'Görevler']] }), field('active', 'Devir etkin', 'checkbox')] },
    legal_cases: { title: 'Hukuk dosyası bilgileri', defaults: { category: 'Google yorum incelemesi', notes: '', stage: 'open' }, fields: [field('work_item_id', 'Bağlı hukuk görevi', 'legalTasks'), field('category', 'Kategori'), field('assignee_id', 'Sorumlu (isteğe bağlı)', 'users', { optional: true }), field('notes', 'Dosya notu', 'textarea', { optional: true }), field('stage', 'Aşama', 'select', { options: [['open', 'Açık'], ['review', 'İnceleniyor'], ['responded', 'Yanıtlandı'], ['closed', 'Kapandı']] })] },
    complaints: { title: 'Şikayet bilgileri', defaults: { category: 'Müşteri deneyimi', severity: 'normal', notes: '', stage: 'received' }, fields: [field('work_item_id', 'Bağlı şikayet görevi', 'complaintTasks'), field('category', 'Kategori'), field('assignee_id', 'Sorumlu (isteğe bağlı)', 'users', { optional: true }), field('severity', 'Önem', 'select', { options: [['normal', 'Normal'], ['high', 'Yüksek'], ['critical', 'Kritik']] }), field('notes', 'Şikayet notu', 'textarea', { optional: true }), field('stage', 'Aşama', 'select', { options: [['received', 'Alındı'], ['assigned', 'Atandı'], ['in_progress', 'İşlemde'], ['resolved', 'Çözüldü']] })] },
    compensations: { title: 'Telafi kayıt takibi', defaults: { amount: 0, currency: 'TRY', status: 'proposed' }, fields: [field('work_item_id', 'Bağlı görev', 'tasks'), field('amount', 'Kayıt tutarı (TL)', 'number', { min: 0, max: 100000000, step: '0.01' }), field('reason', 'Gerekçe', 'textarea'), field('status', 'Kayıt durumu', 'select', { options: [['proposed', 'Önerildi'], ['approved', 'Onaylandı'], ['rejected', 'Reddedildi'], ['recorded', 'Kayda alındı']] }), field('reference', 'Belge / işlem referansı (isteğe bağlı)', 'text', { optional: true })], note: 'Bu işlem yalnız ERP takip kaydı oluşturur. Ödeme, para transferi veya müşteriye otomatik taahhüt göndermez.' },
    retention_policy: { title: 'Veri saklama politikası', singleton: true, defaults: { review_days: 365, closed_task_days: 365, audit_days: 1825 }, fields: [field('review_days', 'Yorum saklama (gün)', 'number', { min: 1, max: 3650 }), field('closed_task_days', 'Kapalı görev saklama (gün)', 'number', { min: 1, max: 3650 }), field('audit_days', 'İşlem kaydı saklama (gün)', 'number', { min: 1, max: 3650 })], note: 'Politika kaydı ve aday önizlemesi veriyi silmez. Hukuki bekletme altındaki veriler korunur.' },
    user_permissions: { title: 'Yorum modülü yetkisi', defaults: { role: 'viewer', active: true }, fields: [field('user_id', 'Mevcut ERP kullanıcısı', 'users'), field('role', 'Modül yetkisi', 'select', { options: [['viewer', 'Görüntüleyici'], ['operator', 'Operatör'], ['legal', 'Hukuk'], ['admin', 'Yönetici']] }), field('active', 'Yetki etkin', 'checkbox')], note: 'Yalnız mevcut ERP kullanıcısına modül yetkisi kaydedilir. E-posta daveti veya yeni hesap oluşturulmaz.' },
    ai_config: { title: 'AI yanıt ayarları', singleton: true, defaults: { persona: '', banned_words: [], knowledge_lock: '' }, fields: [field('persona', 'Marka kişiliği', 'textarea'), field('banned_words', 'Yasaklı kelimeler (satır başına bir ifade)', 'lines', { optional: true }), field('knowledge_lock', 'Kullanılabilecek bilgiler', 'textarea')] },
  };

  function validateResource(kind, input) {
    const definition = definitions[kind];
    if (!definition) throw new Error('Bilinmeyen kayıt türü.');
    const result = { ...definition.defaults };
    for (const f of definition.fields) {
      let value = input[f.key];
      if (f.type === 'checkbox') value = value === true;
      else if (f.type === 'number') {
        if (value === '' || value === null || value === undefined) throw new Error(`${f.label} gerekli.`);
        value = Number(value);
        if (!Number.isFinite(value) || (f.step !== '0.01' && !Number.isInteger(value)) || value < f.min || value > f.max) throw new Error(`${f.label}: ${f.min}–${f.max} aralığında değer girin.`);
      } else if (f.type === 'lines') value = Array.isArray(value) ? value.map(v => String(v).trim()).filter(Boolean) : String(value || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      else {
        value = String(value ?? '').trim();
        if (!value && !f.optional) throw new Error(`${f.label} gerekli.`);
        if (!value && f.optional) { if (f.type === 'textarea') result[f.key] = ''; continue; }
        if (value.length > 12000) throw new Error(`${f.label} çok uzun.`);
        if (f.type === 'select' && !f.options.some(option => option[0] === value)) throw new Error(`${f.label} geçersiz.`);
        if (f.type === 'datetime-local') { const t = Date.parse(value); if (!Number.isFinite(t)) throw new Error(`${f.label} geçersiz.`); value = new Date(t).toISOString(); }
      }
      result[f.key] = value;
    }
    if (kind === 'delegations') {
      if (result.from_user_id === result.to_user_id) throw new Error('Devreden ve devralan farklı olmalı.');
      if (Date.parse(result.ends_at) <= Date.parse(result.starts_at)) throw new Error('Bitiş başlangıçtan sonra olmalı.');
    }
    return result;
  }
  function savePayload(kind, data, record, workVersion, createId) {
    const payload = { resource: kind, expected_version: record ? Number(record.version) : 0, data: validateResource(kind, data) };
    if (record) {
      if (!record.id || !Number.isInteger(payload.expected_version) || payload.expected_version < 1) throw new Error('Kayıt sürümü doğrulanamadı; güncel kaydı açın.');
      payload.id = record.id;
    } else if (createId) payload.id = createId;
    if (['legal_cases', 'complaints'].includes(kind)) {
      if (!Number.isInteger(workVersion) || workVersion < 1) throw new Error('Bağlı görevin güncel sürümü alınamadı.');
      payload.expected_work_version = workVersion;
    }
    return payload;
  }
  function categorySummary(records) {
    const categories = new Map();
    records.filter(row => !row.archived).forEach(row => {
      const name = row.data?.category || 'Kategorisiz';
      const summary = categories.get(name) || { name, total: 0, resolved: 0, open: 0, updated: null };
      summary.total++; row.data?.stage === 'resolved' ? summary.resolved++ : summary.open++;
      if (Number.isFinite(Date.parse(row.updated_at)) && (!summary.updated || Date.parse(row.updated_at) > Date.parse(summary.updated))) summary.updated = row.updated_at;
      categories.set(name, summary);
    });
    return Array.from(categories.values()).sort((a, b) => b.total - a.total);
  }
  function sameNameGroups(tasks) {
    const groups = new Map();
    tasks.filter(task => task.branch_id === currentBranch() && task.kind === 'complaint').forEach(task => {
      const name = String(task.review_snapshot?.reviewer_name || '').trim();
      const key = name.toLocaleLowerCase('tr-TR');
      if (!key || ['anonim', 'google kullanıcısı', 'anonymous'].includes(key)) return;
      const group = groups.get(key) || { name, ids: [], open: 0 };
      if (group.ids.includes(task.id)) return;
      group.ids.push(task.id); if (task.status !== 'done') group.open++;
      groups.set(key, group);
    });
    return Array.from(groups.values()).filter(group => group.ids.length > 1);
  }
  const openReplyLabels = {
    approval_pending:'Yanıt onayı', draft_failed:'Taslak hatası',
    publish_failed:'Yayın hatası', publish_unknown:'Yayın sonucu belirsiz',
  };
  function openReviewWork(reviews, tasks, resources, slaHours, now = Date.now()) {
    const linked = new Map(resources.filter(row => !row.archived).map(row => [row.data.work_item_id,row.data]));
    const jobs = [];
    for (const task of tasks) {
      const info = linked.get(task.id);
      if (task.review_snapshot?.rejection || ['done','closed','resolved','published','rejected','cancelled'].includes(task.status) ||
          (['closed','resolved'].includes(info?.stage) && !task.review_snapshot?.legal_hold)) continue;
      const label = task.kind === 'reply' ? openReplyLabels[task.status] :
        task.kind === 'legal' ? 'Hukuk dosyası' : task.kind === 'complaint' ? 'Müşteri şikâyeti' : task.kind === 'branch' ? 'Şube görevi' : null;
      if (!label) continue;
      jobs.push({type:task.kind,label,task,info,urgent:task.kind === 'legal' || ['publish_failed','publish_unknown','draft_failed'].includes(task.status) || info?.severity === 'critical'});
    }
    for (const review of reviews) {
      if (review.demo || review.duplicate || review.status === 'gonderildi' || review.replyDate) continue;
      const created = Date.parse(review.createdAt);
      const hours = Number(review.slaH || slaHours);
      const due = Number.isFinite(created) && hours > 0 ? created + hours * 3600000 : null;
      const late = due != null && due < now;
      const soon = due != null && !late && due - now <= 2 * 3600000;
      const critical = Number(review.stars) >= 1 && Number(review.stars) <= 2;
      if (!late && !soon && !critical) continue;
      jobs.push({type:'risk',label:late ? 'SLA aşımı' : soon ? 'SLA yaklaşıyor' : 'Yanıtsız düşük puan',review,due,late,soon,critical,urgent:late || critical});
    }
    return jobs.sort((a,b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || (a.due ?? Infinity) - (b.due ?? Infinity));
  }
  const pure = { definitions, validateResource, savePayload, categorySummary, sameNameGroups, openReviewWork };
  if (typeof module === 'object' && module.exports) module.exports = pure;
  if (!root?.document) return;

  const document = root.document;
  const api = () => root.OTOTRReviewManagement;
  const state = () => api()?.state || {};
  const isLive = () => root.OTOTRReviewLiveViews?.isLive?.() ?? (root.OTOTRReviewLiveViews?.getScope?.() === 'live');
  const resourceList = kind => (state().resources?.[kind] || []).filter(row => !row.archived);
  const find = (kind, id) => resourceList(kind).find(row => row.id === id);
  const first = kind => resourceList(kind)[0];
  const ready = () => !state().extendedError && (state().extendedLoaded === true || state().capabilities?.extended_management === true);
  const extendedUsers = () => state().extendedUsers || (state().users || []).filter(user => user.user_id);
  const actor = () => state().actor || {};
  const canWrite = kind => kind === 'user_permissions' ? actor().is_owner === true : actor().role !== 'viewer' || kind === 'notification_rules';
  const labelUser = id => extendedUsers().find(user => user.user_id === id)?.full_name || 'ERP kullanıcısı';
  let ai = null;
  try { if (root.parent !== root && root.parent.location.origin === root.location.origin) ai = root.parent.OTOTRGoogleReviewAI; } catch (_) {}
  const workItems = () => (ai?.getWorkflowItems?.() || []).filter(item => item.branch_id === currentBranch());
  const itemById = id => workItems().find(item => item.id === id);
  const byId = id => document.getElementById(id);
  // The imported demo renderer expects its own field IDs. Restore its unchanged
  // markup before invoking it, then layer the live controls on top.
  const originalAIConfig = byId('ai-config')?.innerHTML || '';
  const originalPlayground = byId('ai-playground')?.querySelector('#pgInput') ? byId('ai-playground').innerHTML : '<div class="card"><div class="head"><h3>🎮 Playground</h3></div><div class="frow"><label>Senaryo</label><textarea id="pgInput" style="min-height:60px"></textarea></div><button class="btn p" onclick="runPlayground()">▶ Test Et</button><div id="pgResult" style="margin-top:12px;padding:12px;background:var(--s2);border-left:3px solid var(--blue);border-radius:8px;font-size:12.5px;line-height:1.6;min-height:60px;white-space:pre-wrap">Sonuç...</div></div>';
  const originalReasonHead = byId('reasonBody')?.closest('table')?.querySelector('thead')?.innerHTML || '';
  const originalRepeatHead = byId('repeatBody')?.closest('table')?.querySelector('thead')?.innerHTML || '';
  const quotaHeading = () => byId('quotaList')?.closest('.card')?.querySelector('.head h3');
  const originalQuotaTitle = quotaHeading()?.textContent || 'API Kotası';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = value => { const node = document.createElement('textarea'); node.innerHTML = String(value ?? ''); return node.value; };
  const set = (id, html) => { if (byId(id)) byId(id).innerHTML = html; };
  const when = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—';
  const empty = text => `<div class="empty"><p>${esc(text)}</p></div>`;
  const note = () => ready() ? '' : `<div class="alert warn">${state().extendedError ? 'Canlı modül kayıtları alınamadı. Yenileyerek tekrar deneyin.' : 'Canlı modül kayıtları yükleniyor veya yetki doğrulaması bekleniyor.'}<button class="btn sm" data-feature="refresh">Yenile</button></div>`;
  const button = (text, action, extra = '') => `<button class="btn sm" data-feature="${action}" ${extra}>${esc(text)}</button>`;
  const editButton = (kind, row, text = 'Düzenle') => canWrite(kind) ? button(text, 'edit', `data-kind="${kind}" data-id="${esc(row.id)}"`) : '';
  const createButton = (kind, text = 'Yeni kayıt') => canWrite(kind) ? button(text, 'create', `data-kind="${kind}"`) : '';
  const archiveButton = (kind, row) => canWrite(kind) ? button('Arşivle', 'archive', `data-kind="${kind}" data-id="${esc(row.id)}"`) : '';
  const protectedKinds = new Set(['branch_settings', 'retention_policy', 'ai_config', 'user_permissions', 'legal_cases', 'complaints', 'notification_rules']);
  const cards = (kind, render) => resourceList(kind).map(row => `<div class="card" style="margin-bottom:10px">${render(row)}<div class="pacts" style="margin-top:12px">${editButton(kind, row)}${protectedKinds.has(kind) ? '' : archiveButton(kind, row)}</div></div>`).join('') || empty(ready() ? 'Henüz kayıt yok. İlk kaydı oluşturabilirsiniz.' : 'Kayıtlar henüz alınmadı.');
  const local = { modal: null, analytics: null, analyticsLoading: false, analyticsError: null, aiDraft: null, playground: { rating: 3, comment: '', result: null, busy: false }, retention: null, validation: null };

  async function request(action, payload = {}) {
    if (!api()?.request) throw new Error('ERP bağlantısı hazır değil.');
    return api().request(action, payload);
  }
  async function refresh() {
    if (api()?.refresh) await api().refresh();
    if (!ready()) throw new Error(state().extendedError || 'Canlı modül kayıtları alınamadı.');
    return state();
  }
  async function afterMutation(result) {
    if (result?.item && ai?.refreshWorkflow) await ai.refreshWorkflow();
    await refresh();
  }
  async function run(buttonElement, operation) {
    if (buttonElement) buttonElement.disabled = true;
    try { return await operation(); }
    catch (error) { root.toast(error.message || 'İşlem tamamlanamadı.', 'warn'); return null; }
    finally { if (buttonElement?.isConnected) buttonElement.disabled = false; }
  }
  function taskOptions(type) {
    const kind = type === 'legalTasks' ? 'legal' : type === 'complaintTasks' ? 'complaint' : null;
    return workItems().filter(item => kind ? item.kind === kind : ['legal', 'complaint', 'branch'].includes(item.kind)).map(item => [item.id, `${item.review_snapshot?.reviewer_name || 'Google kullanıcısı'} · ${item.kind} · ${item.status}`]);
  }
  function optionsFor(f) {
    if (f.options) return f.options;
    if (f.type === 'users') return extendedUsers().filter(user => user.is_active !== false).map(user => [user.user_id, `${user.full_name || 'ERP kullanıcısı'} · ${user.role}`]);
    if (f.type === 'roles') return Array.from(new Set(extendedUsers().map(user => user.role).filter(Boolean))).map(role => [role, role]);
    if (f.type === 'templates') return resourceList('templates').map(row => [row.id, row.data.name]);
    if (f.type.endsWith('Tasks') || f.type === 'tasks') return taskOptions(f.type);
    return null;
  }
  function localDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function inputMarkup(f, value) {
    const id = `erpResource-${f.key}`, opts = optionsFor(f);
    let input;
    if (opts) input = `<select id="${id}" data-field="${f.key}"><option value="">${f.optional ? 'Atanmamış' : 'Seçin'}</option>${opts.map(([v, label]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea' || f.type === 'lines') input = `<textarea id="${id}" data-field="${f.key}" rows="4" maxlength="12000">${esc(Array.isArray(value) ? value.join('\n') : value)}</textarea>`;
    else if (f.type === 'checkbox') input = `<input id="${id}" data-field="${f.key}" type="checkbox" ${value ? 'checked' : ''} style="width:auto">`;
    else input = `<input id="${id}" data-field="${f.key}" type="${f.type}" value="${esc(f.type === 'datetime-local' ? localDate(value) : value)}" ${f.min !== undefined ? `min="${f.min}" max="${f.max}" step="${f.step || 1}"` : 'maxlength="1000"'}>`;
    return `<div class="frow"><label for="${id}">${esc(f.label)}</label>${input}</div>`;
  }
  function openEditor(kind, id, prefill = {}) {
    if (!isLive()) return;
    if (!canWrite(kind)) return root.toast('Bu kayıt türünde görüntüleme yetkiniz var.', 'info');
    if (!ready()) return root.toast('Önce canlı kayıtları yenileyin.', 'warn');
    const definition = definitions[kind]; if (!definition) return;
    const row = id ? find(kind, id) : definition.singleton ? first(kind) : null;
    const data = { ...definition.defaults, ...(kind === 'notification_rules' ? { user_id: actor().id } : {}), ...(row?.data || {}), ...prefill };
    if (kind === 'branch_settings' && !row) data.sla_hours = state().policy?.default_sla_hours || 24;
    let modal = byId('erpResourceModal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'erpResourceModal'; modal.className = 'mbd'; document.body.append(modal); modal.addEventListener('click', event => { if (event.target === modal) closeEditor(); }); }
    local.modal = { kind, row: row ? { ...row, data: { ...row.data } } : null, createId: root.crypto.randomUUID(), source: document.activeElement, workVersions: new Map(workItems().map(item => [item.id, item.version])) };
    const newTask = !row && ['legal_cases', 'complaints'].includes(kind) ? `<details style="margin-bottom:12px"><summary>Yeni bir gerçek yorumdan görev aç</summary><p>Mevcut bir görev seçebilir veya burada Google yorumunu yeni göreve bağlayabilirsiniz. Google’a yanıt gönderilmez.</p><div class="frow"><label for="erpNewTaskReview">Gerçek Google yorumu</label><select id="erpNewTaskReview"><option value="">Yorum seçin</option>${root.OTOTRReviewLiveViews.scopedReviews().map(review => `<option value="${esc(review.erpReviewId)}">${esc(plain(review.author))} · ${review.stars}★ · ${esc(plain(review.text).slice(0, 80))}</option>`).join('')}</select></div>${button('Görevi oluştur ve bağla', 'create-linked-task', `data-kind="${kind}"`)}</details>` : '';
    modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="erpResourceTitle"><div class="mhead"><h3 id="erpResourceTitle">${esc(definition.title)}</h3>${button('Kapat', 'close-editor')}</div><div class="mbody">${definition.note ? `<div class="alert info">${esc(definition.note)}</div>` : ''}${definition.singleton && !row ? '<p>Henüz kaydedilmiş ayar yok. Aşağıdaki başlangıç değerleri kaydedilene kadar taslaktır.</p>' : ''}${newTask}<form id="erpResourceForm">${definition.fields.map(f => inputMarkup(f, data[f.key] ?? '')).join('')}</form><p id="erpResourceError" role="alert" style="color:var(--bad)"></p></div><div class="mfoot">${button('Vazgeç', 'close-editor')}${button('ERP’ye kaydet', 'save-resource')}</div></div>`;
    root.openModal('erpResourceModal');
    modal.querySelector('input,textarea,select')?.focus();
  }
  function closeEditor() { root.closeModal('erpResourceModal'); local.modal?.source?.focus?.(); local.modal = null; }
  async function saveEditor() {
    const edit = local.modal; if (!edit) return;
    const data = {};
    byId('erpResourceForm').querySelectorAll('[data-field]').forEach(node => { data[node.dataset.field] = node.type === 'checkbox' ? node.checked : node.value; });
    try {
      const payload = savePayload(edit.kind, data, edit.row, edit.workVersions.get(data.work_item_id), edit.createId);
      const result = await request('resource_save', payload);
      closeEditor();
      try { await afterMutation(result); }
      catch (_) { throw new Error('Kayıt kaydedildi; güncel liste alınamadı. Yeniden kaydetmeden önce kayıtları yenileyin.'); }
      root.toast('Canlı ERP kaydı kaydedildi.', 'ok');
    } catch (error) {
      if (byId('erpResourceError')) byId('erpResourceError').textContent = `${error.message || 'Kaydedilemedi.'} Girdiğiniz bilgiler korundu.`;
      throw error;
    }
  }
  async function archive(kind, id) {
    const row = find(kind, id); if (!row) throw new Error('Kayıt bulunamadı.');
    await afterMutation(await request('resource_archive', { resource: kind, id, expected_version: row.version }));
    root.toast('Kayıt arşivlendi.', 'ok');
  }
  function linkedResourceButton(kind, workId) {
    const row = resourceList(kind).find(r => r.data.work_item_id === workId);
    return row ? editButton(kind, row, 'Dosya bilgileri') : button('Dosya bilgileri ekle', 'new-linked', `data-kind="${kind}" data-work="${esc(workId)}"`);
  }

  function renderTemplates() {
    set('tplGrid', note() + cards('templates', row => `<div class="head"><h3>${esc(row.data.name)}</h3><span class="chip">${esc(row.data.category)}</span></div><p style="white-space:pre-wrap">${esc(row.data.body)}</p>${row.data.body_b ? `<details><summary>B varyantı</summary><p style="white-space:pre-wrap">${esc(row.data.body_b)}</p></details>` : ''}<div class="pacts">${button('Gerçek taslağa uygula', 'apply-template', `data-id="${esc(row.id)}"`)}</div>`));
    const add = document.querySelector('#settings-templates .head button'); if (add) { enable(add); add.onclick = () => openEditor('templates'); }
  }
  function renderUsers() {
    set('usersList', note() + extendedUsers().map(user => {
      const permission = resourceList('user_permissions').find(row => row.data.user_id === user.user_id);
      return `<div class="watch-row"><div class="info"><b>${esc(user.full_name || 'ERP kullanıcısı')}</b><small>ERP: ${esc(user.role)} · ${user.is_active === false ? 'Pasif' : 'Aktif'}${permission ? ` · Yorum modülü: ${esc(permission.data.role)} / ${permission.data.active ? 'aktif' : 'pasif'}` : ''}</small></div>${actor().is_owner ? (permission ? editButton('user_permissions', permission, 'Yetki') : button('Yetki tanımla', 'permission', `data-user="${esc(user.user_id)}"`)) : ''}</div>`;
    }).join(''));
    const invite = document.querySelector('#settings-users .head button');
    if (invite) { enable(invite); invite.textContent = actor().is_owner ? 'Modül yetkisi tanımla' : 'Kullanıcıları yenile'; invite.onclick = () => actor().is_owner ? openEditor('user_permissions') : run(invite, refresh); }
    set('permTable', `<thead><tr><th>Kullanıcı</th><th>ERP rolü</th><th>Yorum modülü rolü</th><th>Durum</th><th></th></tr></thead><tbody>${extendedUsers().map(user => { const p = resourceList('user_permissions').find(row => row.data.user_id === user.user_id); return `<tr><td>${esc(user.full_name)}</td><td>${esc(user.role)}</td><td>${p ? esc(p.data.role) : 'ERP rolünden'}</td><td>${p ? p.data.active ? 'Etkin' : 'Pasif' : user.is_active === false ? 'Pasif' : 'Etkin'}</td><td>${actor().is_owner ? p ? editButton('user_permissions', p) : button('Yetki tanımla', 'permission', `data-user="${esc(user.user_id)}"`) : 'Yetki değişikliği sistem sahibine aittir'}</td></tr>`; }).join('')}</tbody>`);
  }
  const onboardingCache = new Map();
  async function loadBranchOnboarding(id) {
    try { const result = await request('branch_onboarding', { branch_id: id }); onboardingCache.set(id, result); if (isLive() || root.OTOTRReviewLiveViews?.getBranchId?.() === id) renderBranchSettings(); return result; }
    catch (error) { onboardingCache.set(id, { error: error.message }); return null; }
  }
  async function activateBranch(id) {
    const result = await request('branch_activate', { branch_id: id });
    onboardingCache.set(id, { ...(onboardingCache.get(id) || {}), ...(result || {}), checklist: result.checklist || {} });
    await refresh();
    root.OTOTRReviewLiveViews?.setBranchRegistry?.((await request('branch_list')).items || []);
    root.toast('Google konumu doğrulandı; şube canlı akışa alındı.', 'ok');
    renderBranchSettings();
    return result;
  }
  function renderBranchSettings() {
    const registry = root.OTOTRReviewLiveViews?.getBranchRegistry?.() || [];
    const branches = registry.length ? registry : [{ id: BRANCH, name: 'Bursa Nilüfer', city: 'Bursa', region: 'Marmara', lifecycle: 'live', target: 30, sla_hours: state().policy?.default_sla_hours || 24 }];
    const cardsHtml = branches.map(branch => {
      const data = resourceList('branch_settings').find(row => row.branch_id === branch.id)?.data || (branch.id === currentBranch() ? first('branch_settings')?.data : null);
      const onboarding = onboardingCache.get(branch.id);
      const checklist = onboarding?.checklist || branch.onboarding || {};
      const checks = Object.entries(checklist).filter(([key]) => ['google_account','store_code','location_id','google_verified','target','sla','ai','collection','permissions','active','live'].includes(key));
      const done = checks.filter(([, value]) => value === true).length;
      const live = ['live','active'].includes(branch.lifecycle) || branch.id === BRANCH;
      const status = live ? 'Canlı' : branch.lifecycle === 'onboarding' ? 'Onboarding' : 'Demo / aday';
      const scoped = branch.id === currentBranch();
      return `<div class="store-card" data-branch-card="${esc(branch.id)}"><div class="sc-head"><div class="sc-name">${esc(`${branch.city || ''} ${branch.name || ''}`.trim())}</div><span class="chip ${live ? 'ok' : 'warn'}">${status}</span></div><div class="sc-meta">${data ? `Durum: ${esc(data.lifecycle)}<br>Yanıt tonu: ${esc(data.tone)}<br>SLA: ${Number(data.sla_hours)} saat` : `SLA: ${Number(branch.sla_hours || branch.slaH || 24)} saat<br>Hedef: ${Number(branch.target || 0) || '—'}`}<br>Google: ${branch.location_id || branch.googleBusinessLocationId ? 'Konum tanımlı' : 'Konum bekleniyor'}<br>Onboarding: ${checks.length ? `${done}/${checks.length} kontrol` : 'Kontrol bekleniyor'}</div><div class="sc-foot">${scoped && live ? createButton('branch_settings', 'Şube ayarlarını düzenle') : button('Bu şubeyi aç', 'branch-scope', `data-id="${esc(branch.id)}"`)}${button('Onboarding kontrolü', 'branch-onboarding', `data-id="${esc(branch.id)}"`)}${!live && branch.id.startsWith('branch-custom-') ? button('Google doğrula ve aktifleştir', 'branch-activate', `data-id="${esc(branch.id)}"`) : ''}${scoped ? button('Yorumlara git', 'reviews') : ''}</div></div>`;
    }).join('');
    set('storeGrid', cardsHtml || empty('Henüz kayıtlı şube yok.'));
    const add = document.querySelector('#settings-stores .head button'); if (add) { enable(add); add.textContent = 'Yeni şube ekle'; add.onclick = () => openBranchCreate(); }
    branches.filter(branch => !onboardingCache.has(branch.id)).slice(0, 20).forEach(branch => { void loadBranchOnboarding(branch.id); });
  }
  function openBranchCreate() {
    let modal=byId('erpBranchCreateModal'); if(!modal){modal=document.createElement('div');modal.id='erpBranchCreateModal';modal.className='mbd';document.body.append(modal);}
    modal.innerHTML='<div class="modal" role="dialog" aria-modal="true"><div class="mhead"><h3>Yeni şube</h3><button class="btn sm" data-close>Kapat</button></div><div class="mbody"><p>Yeni şube güvenli başlangıç olarak onboarding/demo açılır. Google hesap, mağaza ve konum kimlikleri doğrulanmadan canlı yorum toplama, AI yayını veya mesaj gönderimi açılmaz.</p><div class="frow"><label>Şube adı</label><input id="brName" maxlength="160"></div><div class="frow"><label>İl</label><input id="brCity" maxlength="80"></div><div class="frow"><label>Bölge</label><input id="brRegion" maxlength="80"></div><div class="grid2"><label>Google hesap ID (opsiyonel)<input id="brAccount" inputmode="numeric"></label><label>Mağaza kodu (opsiyonel)<input id="brStore" inputmode="numeric"></label><label>Google konum ID (opsiyonel)<input id="brLocation" inputmode="numeric"></label><label>Aylık yorum hedefi<input id="brTarget" type="number" min="1" max="10000" value="30"></label><label>Yanıt SLA (saat)<input id="brSla" type="number" min="1" max="168" value="24"></label><label>Google senkron aralığı (dk)<input id="brInterval" type="number" min="5" max="1440" value="60"></label></div><p id="brError" role="alert"></p></div><div class="mfoot"><button class="btn" data-close>Vazgeç</button><button class="btn p" data-save>ERP’ye kaydet</button></div></div>';
    modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>root.closeModal('erpBranchCreateModal'));
    modal.querySelector('[data-save]').onclick=async()=>{const b=modal.querySelector('[data-save]');b.disabled=true;try{const result=await request('branch_create',{id:'branch-custom-'+crypto.randomUUID().replaceAll('-','').slice(0,16),name:byId('brName').value,city:byId('brCity').value,region:byId('brRegion').value,account_id:byId('brAccount').value,store_code:byId('brStore').value,location_id:byId('brLocation').value,target:Number(byId('brTarget').value),sla_hours:Number(byId('brSla').value),interval_minutes:Number(byId('brInterval').value)});root.closeModal('erpBranchCreateModal');const list=await request('branch_list');root.OTOTRReviewLiveViews?.setBranchRegistry?.(list.items||[]);root.OTOTRReviewLiveViews?.setScope?.(result.item?.id || list.items?.find(item=>item.name===byId('brName').value)?.id || currentBranch());root.toast('Yeni şube ERP’ye kaydedildi. Onboarding kontrolü tamamlanmadan canlı işlem kapalıdır.','ok');await refresh();renderBranchSettings();}catch(e){byId('brError').textContent=e.message;b.disabled=false;}};
    root.openModal('erpBranchCreateModal');
  }
  function renderSavedViews() {
    const views = (typeof SAVED_VIEWS === 'undefined' ? [] : SAVED_VIEWS).filter(view => view.erpScope === 'live');
    set('savedViewsList', `<p>Bu tarayıcıda saklanan Bursa filtre tercihleridir. Görünüm açılınca güncel canlı ERP yorumları filtrelenir.</p><div class="pacts">${button('Geçerli yorum filtresini kaydet', 'new-saved')}</div>` + (views.map(view => `<div class="saved-view"><div class="sv-info"><div class="sv-name">${esc(view.name)}</div><div class="sv-filters">Bursa canlı · ${esc(view.filters?.filter || 'hepsi')}</div></div>${button('Aç', 'apply-saved', `data-id="${esc(view.id)}"`)}${button('Sil', 'delete-saved', `data-id="${esc(view.id)}"`)}</div>`).join('') || empty('Bu tarayıcıda Bursa için kayıtlı filtre yok.')));
  }
  function renderIntegrations() {
    const branchName = `${root.OTOTRReviewLiveViews?.getBranchRegistry?.().find(item => item.id === currentBranch())?.city || ''} ${root.OTOTRReviewLiveViews?.getBranchRegistry?.().find(item => item.id === currentBranch())?.name || 'Şube'}`.trim();
    set('intGrid', `<div class="card"><h3>Google Business Profile</h3><p>${state().settings?.google_connected === true ? 'Mevcut ERP Google bağlantısı kayıtlı.' : 'Google bağlantısı doğrulanmadı.'}</p><div class="pacts">${button('Bağlantıyı kontrol et', 'google-status')}${button('Google yetkilendirmesi', 'google-connect')}${button(`${branchName} yorumlarını yenile`, 'google-sync')}</div></div><div class="card"><h3>OpenAI</h3><p>${state().settings?.openai_configured === true ? `Model · ${esc(state().settings.openai_model || 'model sunucuda')}` : 'Yapılandırma durumu alınamadı.'}</p><div class="pacts">${button('Gerçek test alanını aç', 'open-playground')}${button('Kullanım kayıtları', 'open-ai-quality')}</div></div><div class="card"><h3>ERP içi bildirimler</h3><p>Kişisel kurallar ve okundu bilgisi sunucuda saklanır.</p><div class="pacts">${button('Bildirim tercihleri', 'open-notification-rules')}${button('Bildirimleri aç', 'notifications')}</div></div>`);
  }
  let collectionDemo = null;
  const collectionBranch = () => collectionDemo?.id || currentBranch();
  function collectionIsLive() {
    if (collectionDemo) return false;
    const id = currentBranch();
    if (id === BRANCH) return true;
    const branch = root.OTOTRReviewLiveViews?.getBranchRegistry?.().find(item => item.id === id);
    return ['live', 'active'].includes(branch?.lifecycle);
  }

  const collectionDemoKey = branch => 'ototr.review.collection.demo.' + branch;
  const collectionDay = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Istanbul'}).format(new Date());
  const demoDeliveries = [
    {id:'demo-01', time:'09.20', allowed:true},
    {id:'demo-02', time:'11.45', allowed:false},
    {id:'demo-03', time:'14.10', allowed:true},
  ];

  function renderDailyDeliveries(policy = {}) {
    const host = byId('collectionDailyDeliveries');
    if (!host) return;
    if (collectionIsLive()) {
      host.innerHTML = '<p>Tamamlanan ekspertiz listesi ve iletişim izni bu ekrana henüz aktarılmıyor.</p>';
      return;
    }
    const queued = policy.delivery_day === collectionDay() ? policy.selected_services || [] : [];
    const mode = policy.delivery_mode === 'automatic' ? 'automatic' : 'manual';
    host.innerHTML = '<label>Gönderim yöntemi <select id="collectionMode"><option value="manual">Manuel seçim</option><option value="automatic">Otomatik planlama</option></select></label>' +
      '<div class="tbl-wrap"><table><thead><tr><th scope="col">Seçim</th><th scope="col">Ekspertiz</th><th scope="col">Teslim</th><th scope="col">Durum</th></tr></thead><tbody>' +
      demoDeliveries.map((item,index) => {
        const planned = queued.includes(item.id);
        return '<tr><td><input type="checkbox" data-demo-delivery="' + item.id + '" aria-label="Demo ekspertiz ' + (index + 1) + '" ' +
          (planned ? 'checked disabled' : !item.allowed ? 'disabled' : '') + '></td><td>Demo ekspertiz ' + (index + 1) +
          '</td><td>' + item.time + '</td><td>' + (planned ? 'Demo kuyruğunda' : item.allowed ? 'Uygun' : 'İletişim izni yok') + '</td></tr>';
      }).join('') + '</tbody></table></div><button class="micro-btn primary" type="button" data-feature="collection-plan-demo">Demo kuyruğuna ekle</button>';
    const select = byId('collectionMode');
    select.value = mode;
    const refreshMode = () => {
      host.querySelectorAll('[data-demo-delivery]').forEach(input => {
        const item = demoDeliveries.find(row => row.id === input.dataset.demoDelivery);
        input.disabled = !item.allowed || queued.includes(item.id) || select.value === 'automatic';
        if (!queued.includes(item.id)) input.checked = select.value === 'automatic' && item.allowed;
      });
    };
    select.addEventListener('change', refreshMode);
    refreshMode();
  }

  function planDemoDeliveries() {
    if (collectionIsLive()) return;
    const key = collectionDemoKey(collectionBranch());
    const policy = JSON.parse(root.localStorage.getItem(key) || '{}');
    const mode = byId('collectionMode').value;
    const day = collectionDay();
    const previous = policy.delivery_day === day ? policy.selected_services || [] : [];
    const checked = [...byId('collectionDailyDeliveries').querySelectorAll('[data-demo-delivery]:checked')].map(input => input.dataset.demoDelivery);
    const selected = demoDeliveries.filter(item => item.allowed && !previous.includes(item.id) && (mode === 'automatic' || checked.includes(item.id)));
    if (!selected.length) throw new Error('Kuyruğa eklenebilecek bir demo ekspertiz seçin.');
    const next = {...policy, delivery_mode:mode, delivery_day:day, selected_services:[...previous,...selected.map(item => item.id)]};
    root.localStorage.setItem(key,JSON.stringify(next));
    renderDailyDeliveries(next);
    byId('collectionStatus').textContent = selected.length + ' demo istek kuyruğa alındı.';
  }

  const collectionFields = { Hour: 'send_hour', Delay: 'delay_minutes', Channel: 'channel', Template: 'template' };

  root.renderReviewCollectionSettings = (demo = null) => {
    collectionDemo = demo;
    const branch = root.OTOTRReviewLiveViews?.getBranchRegistry?.().find(item => item.id === currentBranch());
    const branchName = collectionDemo?.name || branch?.name || 'Bursa Nilüfer';
    set('workspaceCollectionSettings', `<div class="card" id="reviewCollectionCard" style="grid-column:1/-1"><h3>Ekspertiz sonrası yorum toplama · ${esc(branchName)}</h3><p>${collectionIsLive() ? 'Hizmet sonrası yorum isteği için gönderim koşullarını ayarlayın.' : 'Demo ayarları bu tarayıcıda şubeye özel saklanır. Müşteriye mesaj gönderilmez.'}</p><div class="grid2"><label>Aktif <input id="collectionEnabled" type="checkbox"></label><label>Gönderim saati <input id="collectionHour" type="number" min="0" max="23" value="18"></label><label>Hizmet sonrası bekleme (dk) <input id="collectionDelay" type="number" min="0" max="10080" value="120"></label><label>Kanal <select id="collectionChannel"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="email">E-posta</option></select></label></div><label>Mesaj şablonu <textarea id="collectionTemplate" rows="3">Merhaba {{musteri_adi}}, hizmet deneyiminizi değerlendirmek ister misiniz? {{yorum_linki}}</textarea></label><div class="pacts"><button class="micro-btn primary" data-feature="collection-save">Ayarları kaydet</button>${collectionIsLive() ? '<button class="micro-btn" data-feature="collection-refresh">Kuyruğu yenile</button><button class="micro-btn" data-feature="collection-run">Vadesi gelenleri çalıştır</button>' : ''}</div><p id="collectionStatus" role="status"></p><div id="collectionQueue"></div><h4>Bugün teslim edilen ekspertizler</h4><div id="collectionDailyDeliveries"></div></div>`);
    loadCollection();
  };
  async function loadCollection() {
    const card = byId('reviewCollectionCard');
    const branch = collectionBranch();
    if (!card) return;
    const save = card.querySelector('[data-feature=collection-save]');
    const isLive = collectionIsLive();
    save.disabled = true;
    try {
      const data = isLive
        ? await request('collection_read')
        : { policy: JSON.parse(root.localStorage.getItem(collectionDemoKey(branch)) || '{}') };
      if (card !== byId('reviewCollectionCard') || branch !== collectionBranch()) return;
      const policy = data.policy || {};
      byId('collectionEnabled').checked = Boolean(policy.enabled);
      for (const [suffix, key] of Object.entries(collectionFields)) {
        const input = byId('collection' + suffix);
        input.value = policy[key] ?? input.value;
      }
      if (isLive) byId('collectionQueue').innerHTML = (data.queue || []).map(x => `<div class="watch-row"><div class="info"><b>${esc(x.customer_name || 'Müşteri')}</b><small>${esc(x.channel)} · ${esc(x.status)} · ${esc(when(x.scheduled_at))}</small></div></div>`).join('') || '<p>Bekleyen yorum isteği yok.</p>';
      renderDailyDeliveries(policy);
      save.disabled = false;
    } catch (error) {
      if (card === byId('reviewCollectionCard') && branch === collectionBranch()) byId('collectionStatus').textContent = error.message;
    }
  }

  async function saveCollection() {
    const card = byId('reviewCollectionCard');
    const branch = collectionBranch();
    if (!card) return;
    const inputs = ['Hour', 'Delay'].map(suffix => byId('collection' + suffix));
    if (inputs.some(input => !input.reportValidity() || input.value === '')) throw new Error('Gönderim saati ve bekleme süresi gerekli.');
    const payload = {
      enabled: byId('collectionEnabled').checked,
      send_hour: Number(inputs[0].value),
      delay_minutes: Number(inputs[1].value),
      channel: byId('collectionChannel').value,
      template: byId('collectionTemplate').value,
    };
    const isLive = collectionIsLive();
    if (isLive) await request('collection_save_policy', payload);
    else {
      const key = collectionDemoKey(branch);
      const current = JSON.parse(root.localStorage.getItem(key) || '{}');
      root.localStorage.setItem(key, JSON.stringify({...current, ...payload, delivery_mode:byId('collectionMode')?.value || 'manual'}));
    }
    if (card === byId('reviewCollectionCard') && branch === collectionBranch()) {
      byId('collectionStatus').textContent = isLive ? 'Şube ayarları ERP’ye kaydedildi.' : 'Şube ayarları bu tarayıcıya kaydedildi.';
    }
  }
  let serviceHealth = null, serviceHealthAt = 0, serviceHealthBusy = false, serviceHealthError = '';
  async function loadServiceHealth(force = false) {
    if (serviceHealthBusy || (!force && Date.now()-serviceHealthAt<30000)) return;
    serviceHealthBusy=true;
    try { serviceHealth=await request('automation_status'); serviceHealthError=''; }
    catch(e) { serviceHealth=null;serviceHealthError=e.message; }
    finally { serviceHealthAt=Date.now(); serviceHealthBusy=false; if (byId('view-system')?.classList.contains('on')) renderServiceHealth(); }
  }
  function renderServiceHealth() {
    const heading=byId('svcGrid')?.closest('.card')?.querySelector('.head h3'); if(heading)heading.textContent='Otomasyon takibi';
    const a=serviceHealth?.automation, ai=serviceHealth?.ai;
    const fresh=a?.last_success_at && Date.now()-Date.parse(a.last_success_at)<Math.max(15,(a.interval_minutes||5)*3)*60000;
    const healthy=a?.enabled && fresh && a.status!=='failed';
    const lastGoogle=a?.last_google_success_at;
    const card=(name,status,tone,detail)=>`<div class="service-status-card"><div class="service-status-title"><b>${esc(name)}</b><span class="chip ${tone}">${esc(status)}</span></div><p>${detail}</p></div>`;
    set('healthMetrics',card('Sunucu otomasyonu',healthy?'7/24 etkin':a?.enabled?'Kontrol gerekli':a?'Kapalı':'Doğrulanmadı',healthy?'ok':'warn',a?`Her ${Number(a.interval_minutes)%60===0 ? `${Number(a.interval_minutes)/60} saat` : `${Number(a.interval_minutes)} dakika`} · Tarayıcıdan bağımsız`:'Durum yükleniyor…')+card('Google',lastGoogle&&fresh?'Erişim doğrulandı':lastGoogle?'Kontrol gecikti':'Doğrulanmadı',lastGoogle&&fresh?'ok':'warn',`Son başarılı okuma<br>${esc(when(lastGoogle))}`)+card('OpenAI',ai?.status==='succeeded'?'Son çağrı başarılı':ai?'Çağrı başarısız':'Henüz test edilmedi',ai?.status==='succeeded'?'ok':'warn',`${esc(ai?.model||state().settings?.openai_model||'—')}<br>${esc(when(ai?.created_at))}`)+card('Onay kuyruğu',String(a?.approval_pending??'—'),'info','ERP’de bekleyen yanıt taslakları'));
    set('svcGrid',`<div class="service-runtime" style="grid-column:1/-1"><p>Risksiz 4–5 yıldız otomatik; diğerleri onaylı. Yayın öncesinde Google kaydı ve hukuki bekletme yeniden kontrol edilir.</p><dl class="service-timing"><div><dt>Son çalışma</dt><dd>${esc(when(a?.last_finished_at))}</dd></div><div><dt>Son başarılı çalışma</dt><dd>${esc(when(a?.last_success_at))}</dd></div><div><dt>Sonraki kontrol</dt><dd>${a?.enabled?esc(when(a.next_run_at)):'—'}</dd></div><div><dt>Son AI süresi</dt><dd>${Number.isFinite(ai?.latency_ms)?(ai.latency_ms/1000).toFixed(1)+' sn':'—'}</dd></div></dl>${serviceHealthError||a?.last_error?`<p class="service-error" role="alert">${esc(serviceHealthError||a.last_error)}</p>`:''}<div class="pacts">${button('Durumu yenile','service-health')}${button('AI bağlantısını test et','open-playground')}</div><h4>Son sunucu çalışmaları</h4><div class="service-runs">${(serviceHealth?.runs||[]).map(r=>`<div class="watch-row"><div class="info"><b>${esc(when(r.started_at))}</b><small>${Number(r.reviewed)} kontrol · ${Number(r.prepared)} taslak · ${Number(r.published)} yayın${r.error?' · '+esc(r.error):''}</small></div><span class="chip ${r.status==='succeeded'?'ok':'warn'}">${r.status==='succeeded'?'Başarılı':r.status==='running'?'Çalışıyor':'Hata'}</span></div>`).join('')||'<p>Çalışma kaydı bekleniyor.</p>'}</div></div>`);
  }
  function renderSystemFeatures() {
    renderServiceHealth(); void loadServiceHealth();
    document.querySelectorAll('#healthMetrics .md').forEach(node => { if (/Uptime|telemetri/.test(node.textContent)) node.textContent = 'AI çağrı süreleri kullanım kayıtlarında'; });
    set('escGrid', note() + `<div class="pacts">${createButton('escalation_rules', 'Yeni kural')}${button('Kuralları şimdi değerlendir', 'run-escalation')}</div>` + cards('escalation_rules', row => `<b>${esc(row.data.name)}</b><p>${esc(events.find(e => e[0] === row.data.event)?.[1] || row.data.event)} · ${Number(row.data.after_hours)} saat · ${esc(row.data.to_role)} · ${row.data.enabled ? 'Etkin' : 'Pasif'}</p>`));
    const save = document.querySelector('#system-escalation .head button'); if (save) { enable(save); save.textContent = 'Yeni kural'; save.onclick = () => openEditor('escalation_rules'); }
    set('notifMatrix', note() + `<div class="pacts">${createButton('notification_rules', 'Bildirim tercihi ekle')}${button('Bildirimleri aç', 'notifications')}</div><p>ERP içi bildirimler gerçek kullanıcının hesabına kaydedilir.</p>` + cards('notification_rules', row => `<b>${esc(labelUser(row.data.user_id))}</b><p>${esc(events.find(e => e[0] === row.data.event)?.[1] || row.data.event)} · ${row.data.enabled ? 'Etkin' : 'Pasif'} · ERP içi</p>`));
    set('groupList', note() + cards('store_groups', row => `<div class="gc-head"><div class="gc-name">${esc(row.data.name)}</div></div><div class="gc-branches"><span class="gc-branch">Bursa Nilüfer</span></div>`));
    const group = document.querySelector('#system-groups .head button'); if (group) { enable(group); group.onclick = () => openEditor('store_groups'); }
    const settings = first('branch_settings');
    set('lifecycleGrid', `<div class="lc-col"><div class="lc-head">Bursa Nilüfer</div><div class="lc-item"><b>${settings ? esc(settings.data.lifecycle) : 'Henüz kaydedilmiş yaşam ayarı yok'}</b><p>${settings ? `Son güncelleme: ${esc(when(settings.updated_at))}` : 'Mevcut ERP şubesi kullanılmaya devam eder.'}</p>${createButton('branch_settings', 'Yaşam döngüsünü düzenle')}</div></div>`);
    if (quotaHeading()) quotaHeading().textContent = 'Kullanım ve senkronizasyon işleri';
    const jobs = state().jobs || [];
    set('quotaList', `<div class="pacts">${button('AI kullanımını yükle', 'analytics')}${button('Sistem kayıtlarını yenile', 'refresh')}</div>${analyticsSummary()}<p>Kota limiti üretilmez; sağlayıcının bildirdiği kullanım ve yapılandırılmış model fiyatıyla hesaplanan kayıtlı maliyet gösterilir.</p><h4>Genel merkez / Google bağlantısı işleri</h4><div class="tbl-wrap"><table><thead><tr><th>İş</th><th>Durum</th><th>İşlenen</th><th>Başarılı</th><th>Hata</th><th>Tarih</th></tr></thead><tbody>${jobs.map(job => `<tr><td>${esc(job.job_type)}</td><td>${esc(job.status)}</td><td>${Number(job.processed_count || 0)}/${job.total_count == null ? '—' : Number(job.total_count)}</td><td>${Number(job.success_count || 0)}</td><td>${Number(job.failure_count || 0)}</td><td>${esc(when(job.finished_at || job.started_at || job.created_at))}</td></tr>`).join('') || '<tr><td colspan="6">İş kaydı bulunmuyor.</td></tr>'}</tbody></table></div>`);
    const problems = workItems().filter(item => ['publish_failed', 'publish_unknown', 'generation_failed', 'failed'].includes(item.status));
    byId('erpLiveIncidents')?.remove();
    byId('svcGrid')?.insertAdjacentHTML('beforeend', `<div class="card" id="erpLiveIncidents" style="grid-column:1/-1"><h4>İşlem uyarıları</h4>${problems.map(item => `<div class="watch-row"><div class="info"><b>${esc(item.review_snapshot?.reviewer_name || 'ERP görevi')}</b><small>${esc(item.status)} · ${esc(when(item.updated_at || item.created_at))}</small></div>${button('İlgili kaydı aç', 'open-error', `data-work="${esc(item.id)}"`)}</div>`).join('') || '<p>Alınan görevlerde başarısız veya sonucu belirsiz işlem bulunmuyor.</p>'}</div>`);
  }
  const scopedJobs = () => openReviewWork(root.OTOTRReviewLiveViews?.scopedReviews?.() || [], workItems(),
    [...resourceList('legal_cases'),...resourceList('complaints')], state().policy?.default_sla_hours);
  const workStatus = {approval_pending:'Onay bekliyor',draft_failed:'Taslak hazırlanamadı',publish_failed:'Yayın başarısız',publish_unknown:'Doğrulama gerekli',open:'Açık',review:'İnceleniyor',responded:'Yanıtlandı',received:'Alındı',assigned:'Atandı',in_progress:'İşlemde'};
  function workAction(job) {
    if (job.review) return button('Yorumu aç','problem-review',`data-id="${Number(job.review.id)}"`);
    if (job.type === 'legal' || job.type === 'complaint') return button('Dosyayı aç', 'open-error', `data-work="${esc(job.task.id)}"`);
    return button(job.type === 'reply' ? 'Yanıtı incele' : 'Görevi aç','open-error',`data-work="${esc(job.task.id)}"`);
  }
  function renderOpenProblems() {
    const jobs = scopedJobs();
    const branch = root.OTOTRReviewLiveViews?.getBranchRegistry?.().find(row => row.id === currentBranch());
    set('problemKpis', [['Açık iş',jobs.length],['Yanıt SLA aşımı',jobs.filter(j=>j.late).length],['Kritik / hukuk',jobs.filter(j=>j.critical || j.type==='legal').length],['Yanıt onayı',jobs.filter(j=>j.task?.status==='approval_pending').length]]
      .map(([label,value])=>`<div class="kpi"><div class="kl">${label}</div><div class="kv">${value}</div></div>`).join(''));
    set('problemRows', jobs.map(job => {
      const status = job.task ? workStatus[job.info?.stage || job.task.status] || 'İnceleme gerekli' : 'Yanıtsız';
      const owner = job.info?.assignee_id ? labelUser(job.info.assignee_id) : job.type==='reply' && job.task.status==='approval_pending' ? 'Yetkili onay ekibi' : 'Atanmamış';
      return `<tr><td><b>${job.label}</b></td><td>${esc(branch?.name || 'Bursa Nilüfer')}</td><td>${esc(owner)}</td><td>${job.due == null ? '—' : esc(when(new Date(job.due).toISOString()))}</td><td>${esc(status)}</td><td>${workAction(job)}</td></tr>`;
    }).join('') || `<tr><td colspan="6">${state().loaded ? 'Seçili şubede açık iş bulunmuyor.' : 'ERP iş kayıtları bekleniyor.'}</td></tr>`);
  }
  function renderSlaWork() {
    const jobs = scopedJobs().filter(job=>job.late || job.soon);
    set('riskSlaWork', jobs.map(job=>`<div class="watch-row"><div class="info"><b>${job.label}</b><small>Son tarih · ${esc(when(new Date(job.due).toISOString()))}</small></div>${workAction(job)}</div>`).join('') || empty('Alınan kayıtlarda SLA süresi yaklaşan veya aşan yanıtsız yorum yok.'));
  }
  function renderDelegations() {
    const list = resourceList('delegations');
    const active = list.filter(row => row.data.active && Date.parse(row.data.starts_at) <= Date.now() && Date.now() < Date.parse(row.data.ends_at)).length;
    const metric = byId('appMetrics')?.children[1];
    if (metric) {
      metric.querySelector('.mv').textContent = ready() ? active : '—';
      metric.querySelector('.md').textContent = ready() ? 'Şu anda etkin yetki devri' : 'ERP verisi bekleniyor';
    }
    set('delegBody', list.map(row => `<tr><td>${esc(labelUser(row.data.from_user_id))}</td><td>${esc(labelUser(row.data.to_user_id))}</td><td>${esc(when(row.data.starts_at))}</td><td>${esc(when(row.data.ends_at))}</td><td>${row.data.scope === 'approvals' ? 'Onaylar' : 'Görevler'}</td><td>${row.data.active ? 'Etkin' : 'Pasif'} ${editButton('delegations', row)} ${archiveButton('delegations', row)}</td></tr>`).join('') || `<tr><td colspan="6">${note()}${empty('Kayıtlı yetki devri yok.')}</td></tr>`);
    const add = document.querySelector('#approval-delegation .head button'); if (add) { enable(add); add.onclick = () => openEditor('delegations'); }
  }
  function renderCases(kind) {
    const legal = kind === 'legal_cases';
    const tasks = workItems().filter(item => item.kind === (legal ? 'legal' : 'complaint'));
    const open = scopedJobs().filter(job => job.type === (legal ? 'legal' : 'complaint'));
    const openIds = new Set(open.map(job => job.task.id));
    const metrics = [
      ['Açık dosya',open.length],
      ['Atanmamış',open.filter(job=>!job.info?.assignee_id).length],
      [legal ? 'Yayın kilidi' : 'Kritik',open.filter(job=>legal ? job.task.review_snapshot?.legal_hold : job.info?.severity==='critical').length],
      ['Tamamlanan',tasks.filter(task=>!openIds.has(task.id)).length],
    ];
    set(legal ? 'legalMetrics' : 'compMetrics', metrics.map(([label,value]) =>
      `<div class="metric"><div class="ml">${label}</div><div class="mv">${value}</div></div>`).join(''));
    const tbody = document.querySelector(kind === 'legal_cases' ? '#legalTable tbody' : '#compTable tbody');
    if (tbody) tbody.querySelectorAll('tr').forEach(tr => {
      const displayedId = tr.cells[0]?.textContent?.trim();
      const source = root.OTOTRReviewLiveViews.scopedCollection(kind === 'legal_cases' ? 'legalCases' : 'complaints').find(row => row.id === displayedId);
      if (!source) return;
      const record = resourceList(kind).find(row => row.data.work_item_id === source.erpItemId);
      const last = tr.cells[tr.cells.length - 1];
      if (last) last.insertAdjacentHTML('beforeend', linkedResourceButton(kind, source.erpItemId));
      const assigneeCell = tr.cells[legal ? 4 : 7];
      if (assigneeCell) assigneeCell.textContent = record?.data.assignee_id ? labelUser(record.data.assignee_id) : 'Atanmamış';
      if (record) {
        if (tr.cells[3]) tr.cells[3].textContent = record.data.category;
        const dateCell = tr.cells[kind === 'legal_cases' ? 6 : 5];
        if (dateCell) { dateCell.textContent = '—'; dateCell.title = 'Dosyaya özel son tarih kaydı yok'; }
        const statusCell = tr.cells[kind === 'legal_cases' ? 7 : 6];
        if (statusCell) statusCell.textContent = { open: 'Açık', review: 'İnceleniyor', responded: 'Yanıtlandı', closed: 'Kapandı', received: 'Alındı', assigned: 'Atandı', in_progress: 'İşlemde', resolved: 'Çözüldü' }[record.data.stage] || record.data.stage;
        if (kind === 'complaints' && tr.cells[4]) tr.cells[4].textContent = { normal: 'Normal', high: 'Yüksek', critical: 'Kritik' }[record.data.severity] || record.data.severity;
      }
    });
    if (kind === 'legal_cases') {
      const add = document.querySelector('#view-legal [onclick="openNewCase()"]'); if (add) { enable(add); add.textContent = 'Dosya bilgisi ekle'; add.onclick = () => openEditor('legal_cases'); }
      renderRetention();
    } else {
      const active = byId('complaint-active');
      if (active && !byId('erpComplaintNew')) active.insertAdjacentHTML('afterbegin', `<div class="pacts" id="erpComplaintNew" style="margin-bottom:12px">${createButton('complaints', 'Gerçek şikayet dosyası aç')}</div>`);
      const list = resourceList('compensations');
      set('compensationBody', `<tr><td colspan="5"><div class="pacts">${createButton('compensations', 'Telafi kaydı ekle')}</div><p>Yalnız kayıt takibi; ödeme veya para transferi yapılmaz.</p></td></tr>` + list.map(row => `<tr><td>${esc(itemById(row.data.work_item_id)?.review_snapshot?.reviewer_name || 'ERP görevi')}</td><td>Bursa Nilüfer</td><td>${esc(row.data.reason)}</td><td>${Number(row.data.amount).toLocaleString('tr-TR')} TL</td><td>${esc(row.data.status)} ${editButton('compensations', row)} ${archiveButton('compensations', row)}</td></tr>`).join(''));
      const categoryHead = byId('reasonBody')?.closest('table')?.querySelector('thead');
      if (categoryHead) categoryHead.innerHTML = '<tr><th>Kategori</th><th>Kayıtlı dosya</th><th>Çözülen</th><th>Açık</th><th>Son güncelleme</th></tr>';
      set('reasonBody', categorySummary(resourceList('complaints')).map(c => `<tr><td>${esc(c.name)}</td><td>${c.total}</td><td>${c.resolved}</td><td>${c.open}</td><td>${esc(when(c.updated))}</td></tr>`).join('') || `<tr><td colspan="5">${empty('Dosya bilgisi eklediğinizde gerçek kategoriler burada sayılır.')}</td></tr>`);
      const repeatHead = byId('repeatBody')?.closest('table')?.querySelector('thead');
      if (repeatHead) repeatHead.innerHTML = '<tr><th>Görünen Google adı</th><th>Şikayet görevi</th><th>Açık görev</th><th>Geçmiş</th></tr>';
      set('repeatBody', `<tr><td colspan="4"><p>Aynı görünen adla gelen kayıtlar listelenir. Bu eşleşme doğrulanmış müşteri kimliği anlamına gelmez.</p></td></tr>` + (sameNameGroups(workItems()).map(group => `<tr><td>${esc(group.name)}</td><td>${group.ids.length}</td><td>${group.open}</td><td>${button('Yorum geçmişini aç', 'search-reviews', `data-query="${esc(group.name)}"`)}</td></tr>`).join('') || `<tr><td colspan="4">${empty('Alınan görevlerde aynı görünen adla birden fazla şikayet yok.')}</td></tr>`));
    }
  }
  function renderRetention() {
    const row = first('retention_policy');
    set('legal-kvkk', `<div class="card"><div class="head"><h3>Veri saklama ve önizleme</h3><div class="pacts">${createButton('retention_policy', row ? 'Politikayı düzenle' : 'Politika oluştur')}${button('Aday kayıtları hesapla', 'retention-preview')}</div></div>${note()}${row ? `<p>Yorum: ${row.data.review_days} gün · Kapalı görev: ${row.data.closed_task_days} gün · İşlem kaydı: ${row.data.audit_days} gün</p>` : '<p>Henüz kaydedilmiş saklama politikası yok.</p>'}<p>Bu sayfa veri silmez. Önizleme gerçek kayıtlar üzerinden hesaplanır.</p><div id="erpRetentionPreview">${local.retention ? retentionResult(local.retention) : ''}</div></div>`);
  }
  function retentionResult(result) { return `<p>ERP veritabanında saklanan yerel kayıtlar hesaplanır; Google’daki bütün yorumların silme önizlemesi değildir.</p><div class="metrics">${Object.entries(result.candidates || {}).map(([key, value]) => `<div class="metric"><div class="ml">${esc({ reviews: 'Yerel yorum adayı', closed_tasks: 'Kapalı görev adayı', audit: 'İşlem kaydı adayı' }[key] || key)}</div><div class="mv">${Number(value)}</div></div>`).join('')}</div><p>${result.destructive === false ? 'Önizleme tamamlandı; hiçbir kayıt silinmedi.' : 'Önizleme sonucu alındı.'}</p>`; }
  function enable(node) { node.disabled = false; node.removeAttribute('data-live-unavailable'); node.removeAttribute('title'); }

  function analyticsSummary() {
    const summary = local.analytics?.summary;
    if (!summary) return `<p>${local.analyticsLoading ? 'AI kullanım kayıtları yükleniyor…' : local.analyticsError ? 'AI kullanım kayıtları alınamadı; yeniden deneyin.' : 'Henüz kullanım kayıtları yüklenmedi.'}</p>`;
    const metrics = [['Kaydedilmiş üretim', summary.generations], ['Başarılı', summary.succeeded], ['Başarısız', summary.failed], ['Test alanı üretimi', summary.playground], ['Bildirilen toplam token', summary.usage_recorded === 0 ? null : summary.total_tokens], ['Ort. süre', summary.avg_latency_ms == null ? null : `${Math.round(summary.avg_latency_ms)} ms`], ['Hesaplanan kayıtlı maliyet', summary.cost_usd == null ? null : `$${Number(summary.cost_usd).toFixed(4)}`]];
    const window = local.analytics?.window;
    return `<p>${window ? `Son ${Number(window.days)} gün · en son ${Number(window.limit)} kayıt sınırı${window.truncated ? ' · sonuç sınırı nedeniyle kısmi veri' : ''}` : 'Alınan üretim kayıtları'}</p><div class="metrics">${metrics.map(([label, value]) => `<div class="metric"><div class="ml">${label}</div><div class="mv">${esc(value ?? '—')}</div></div>`).join('')}</div><p>Kullanım ölçümü: ${Number(summary.usage_recorded || 0)}/${Number(summary.generations || 0)} · fiyat kaydı: ${Number(summary.priced_generations || 0)}/${Number(summary.generations || 0)} üretim.</p>`;
  }
  async function loadAnalytics() {
    if (local.analyticsLoading) return;
    if (!api()?.aiRequest) throw new Error('AI analiz servisi hazır değil.');
    local.analyticsLoading = true;
    try { local.analytics = await api().aiRequest('analytics', { branch: { id: currentBranch() } }); local.analyticsError = null; }
    catch (error) { local.analyticsError = error.message; throw error; }
    finally { local.analyticsLoading = false; if (isLive()) { renderExperiments(); set('aiqMetrics', analyticsSummary()); if (STATE.view === 'system') renderSystemFeatures(); } }
  }
  function renderExperiments() {
    set('abTests', note() + `<div class="pacts">${createButton('experiments', 'A/B deneyi oluştur')}${button('Gerçek sonuçları yenile', 'analytics')}</div><p>Varyant ataması gerçek taslak üretiminde yapılır; test alanı canlı kabul/yayın sayılarına dahil edilmez.</p>` + cards('experiments', row => {
      const counters = (local.analytics?.experiments || []).filter(result => result.experiment_id === row.id && Number(result.experiment_version) === Number(row.version));
      const history = (local.analytics?.experiments || []).filter(result => result.experiment_id === row.id && Number(result.experiment_version) !== Number(row.version));
      const historical = history.length ? `<details style="margin-top:12px"><summary>Önceki sürümlerin ölçülen sonuçları</summary><div class="tbl-wrap"><table><thead><tr><th>Sürüm</th><th>Varyant</th><th>Üretim</th><th>Düzenleme</th><th>Ret</th><th>Yayın</th></tr></thead><tbody>${history.map(count => `<tr><td>${Number(count.experiment_version)}</td><td>${esc(String(count.variant).toUpperCase())}</td><td>${Number(count.generations)}</td><td>${Number(count.edited)}</td><td>${Number(count.rejected)}</td><td>${Number(count.published)}</td></tr>`).join('')}</tbody></table></div></details>` : '';
      return `<div class="head"><h3>${esc(row.data.name)}</h3><span class="chip">${esc(row.data.status)}</span></div><p>Canlı taslak kapsamı: %${Number(row.data.traffic_percent)} · sürüm ${Number(row.version)}</p><div class="grid2"><div><b>A</b><p style="white-space:pre-wrap">${esc(row.data.variant_a)}</p></div><div><b>B</b><p style="white-space:pre-wrap">${esc(row.data.variant_b)}</p></div></div><p>Bu sürümün yüklenen canlı üretim kayıtları; istatistiksel kazanan ilan edilmez.</p><div class="tbl-wrap"><table><thead><tr><th>Varyant</th><th>Üretim</th><th>Düzenleme</th><th>Ret</th><th>Yayın</th></tr></thead><tbody>${['a', 'b'].map(variant => { const count = counters.find(c => c.variant === variant); return `<tr><td>${variant.toUpperCase()}</td><td>${count ? Number(count.generations) : local.analytics ? 0 : '—'}</td><td>${count ? Number(count.edited) : local.analytics ? 0 : '—'}</td><td>${count ? Number(count.rejected) : local.analytics ? 0 : '—'}</td><td>${count ? Number(count.published) : local.analytics ? 0 : '—'}</td></tr>`; }).join('')}</tbody></table></div>${historical}`;
    }));
  }
  function renderAIConfig() {
    const saved = first('ai_config'), data = local.aiDraft?.data || saved?.data || definitions.ai_config.defaults;
    set('ai-config', `<div class="card"><div class="head"><h3>AI yanıt ayarları · ${esc(root.OTOTRReviewLiveViews?.getBranchRegistry?.().find(b=>b.id===currentBranch())?.name || "Şube")}</h3></div>${note()}<p>${saved ? 'Mevcut ERP OpenAI bağlantısı korunur. Bu ayarlar gerçek taslak yönergesine eklenir.' : 'Henüz özel yönerge kaydı yok. Kaydettiğiniz bilgiler gerçek taslak üretiminde kullanılır.'}</p><div class="grid2"><div><div class="frow"><label for="erpAiPersona">Marka kişiliği</label><textarea id="erpAiPersona" rows="4">${esc(data.persona)}</textarea></div><div class="frow"><label for="erpAiBanned">Yasaklı ifadeler (satır başına bir ifade)</label><textarea id="erpAiBanned" rows="4">${esc((data.banned_words || []).join('\n'))}</textarea></div><div class="frow"><label for="erpAiKnowledge">Kullanılabilecek bilgiler</label><textarea id="erpAiKnowledge" rows="5">${esc(data.knowledge_lock)}</textarea></div></div><div><div class="ai-toggle"><div class="tm"><div class="tl">Yayın kuralı</div><div class="ts">${state().policy?.auto_reply_enabled ? "Risksiz 4–5 yıldız otomatik; diğerleri insan onaylı" : "Tüm yanıtlar insan onaylı"}</div></div><span class="chip ok">Aktif</span></div><div class="ai-toggle"><div class="tm"><div class="tl">Hukuki bekletme</div><div class="ts">Bekletilen kayıtta yayın engellenir</div></div><span class="chip ok">Sunucu denetimi</span></div><div class="ai-toggle"><div class="tm"><div class="tl">Gerçek taslak kaynağı</div><div class="ts">Üretim kaydı, model, kullanım ve sonuç izlenir</div></div><span class="chip info">ERP</span></div><p>${esc(state().settings?.openai_model || 'Model mevcut ERP ayarından alınır.')}</p></div></div><div class="pacts">${button('AI ayarlarını kaydet', 'save-ai')}${button('Kullanımı yenile', 'analytics')}</div><p id="erpAiSaveStatus" role="status"></p></div>`);
    ['erpAiPersona', 'erpAiBanned', 'erpAiKnowledge'].forEach(id => byId(id).addEventListener('input', () => { if (!local.aiDraft) local.aiDraft = { row: saved ? { ...saved } : null, createId: root.crypto.randomUUID() }; local.aiDraft.data = { persona: byId('erpAiPersona').value, banned_words: byId('erpAiBanned').value.split(/\r?\n/), knowledge_lock: byId('erpAiKnowledge').value }; }));
    renderExperiments();
    set('aiqMetrics', analyticsSummary());
    renderPlayground();
  }
  function renderPlayground() {
    const pg = local.playground;
    set('ai-playground', `<div class="card"><div class="head"><h3>AI bağlantı testi</h3></div><p>Mevcut ERP bağlantısını kullanır. Google’a yanıt yayınlamaz ve canlı görev oluşturmaz.</p><div class="frow"><label for="erpPgRating">Yıldız puanı</label><select id="erpPgRating">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === Number(pg.rating) ? 'selected' : ''}>${n}★</option>`).join('')}</select></div><div class="frow"><label for="erpPgInput">Test senaryosu</label><textarea id="erpPgInput" maxlength="3000" rows="5">${esc(pg.comment)}</textarea></div>${button(pg.busy ? 'Üretiliyor…' : 'OpenAI ile üret', 'playground', pg.busy ? 'disabled' : '')}<div id="erpPgResult" style="margin-top:14px">${pg.result ? playgroundResult(pg.result) : ''}</div></div>`);
    byId('erpPgRating').onchange = event => { pg.rating = Number(event.target.value); };
    byId('erpPgInput').oninput = event => { pg.comment = event.target.value; };
  }
  function playgroundResult(result) {
    return `<div class="cd-review" style="white-space:pre-wrap">${esc(result.reply || 'Yanıt metni dönmedi.')}</div><div class="pacts"><span class="chip">${esc(result.tone || 'Ton belirtilmedi')}</span><span class="chip">${result.requires_human_review ? 'İnsan incelemesi gerekli' : 'Sınıflandırma tamamlandı; yayın yine onaya bağlı'}</span></div><p>${esc(result.risk_reason || '')}</p><p>Model: ${esc(result.usage?.model || '—')} · Token: ${result.usage?.total_tokens ?? '—'} · Süre: ${result.usage?.latency_ms != null ? `${Number(result.usage.latency_ms)} ms` : '—'} · Maliyet: ${result.usage?.cost_usd != null ? `$${Number(result.usage.cost_usd).toFixed(4)}` : 'Fiyat kaydı yok'}</p>`;
  }
  async function saveAIConfig() {
    const data = { persona: byId('erpAiPersona').value, banned_words: byId('erpAiBanned').value, knowledge_lock: byId('erpAiKnowledge').value };
    const row = local.aiDraft ? local.aiDraft.row : first('ai_config');
    if (!local.aiDraft) local.aiDraft = { row, data, createId: root.crypto.randomUUID() };
    await request('resource_save', savePayload('ai_config', data, row, undefined, local.aiDraft.createId));
    local.aiDraft = null; await refresh(); root.toast('AI yönergesi gerçek ERP taslak servisine kaydedildi.', 'ok');
  }
  async function generatePlayground() {
    const pg = local.playground;
    pg.comment = byId('erpPgInput').value.trim(); pg.rating = Number(byId('erpPgRating').value);
    if (!pg.comment || pg.comment.length > 3000) throw new Error('1–3000 karakterlik test senaryosu girin.');
    if (!api()?.aiRequest) throw new Error('AI test servisi hazır değil.');
    pg.busy = true;
    try { pg.result = await api().aiRequest('playground', { branch: { id: currentBranch() }, review: { rating: pg.rating, comment: pg.comment } }); }
    finally { pg.busy = false; if (isLive()) renderPlayground(); }
  }

  function renderNotifications() {
    const list = state().inAppNotifications || [];
    const unread = list.filter(n => !n.read_at).length;
    const count = byId('notifCount'); if (count) { count.textContent = String(unread); count.style.display = unread ? 'block' : 'none'; }
    set('notifList', note() + list.map(n => `<div class="notif-item ${n.read_at ? '' : 'unread'}"><div class="n-body"><b>${esc(n.title)}</b><p>${esc(n.body)}</p><span class="n-time">${esc(when(n.created_at))}</span><div class="pacts">${button(n.read_at ? 'Okunmadı olarak işaretle' : 'Okundu', 'notification-read', `data-id="${esc(n.id)}" data-read="${n.read_at ? 'false' : 'true'}"`)}${n.work_item_id ? button('İlgili görev', 'open-task', `data-work="${esc(n.work_item_id)}"`) : ''}</div></div></div>`).join('') || empty('Henüz kişisel bildirim yok.'));
    const mark = document.querySelector('#notifPanel [onclick="markAllRead()"]'); if (mark) { enable(mark); mark.onclick = () => run(mark, markAllRead); }
  }
  async function markAllRead() { for (const n of (state().inAppNotifications || []).filter(n => !n.read_at)) await request('notification_read', { id: n.id, read: true }); await refresh(); }
  async function applyTemplate(id) {
    const row = find('templates', id); if (!row) throw new Error('Şablon bulunamadı.');
    const draftItems = workItems().filter(item => item.kind === 'reply' && ['approval_pending', 'publish_failed'].includes(item.status));
    if (!draftItems.length) return root.toast('Önce gerçek yorumdan bir düzenlenebilir taslak hazırlayın.', 'info');
    let modal = byId('erpTemplateApplyModal'); if (!modal) { modal = document.createElement('div'); modal.id = 'erpTemplateApplyModal'; modal.className = 'mbd'; document.body.append(modal); }
    const versions = new Map(draftItems.map(item => [item.id, item.version]));
    modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="erpTemplateApplyTitle"><div class="mhead"><h3 id="erpTemplateApplyTitle">${esc(row.data.name)} · Gerçek taslağa uygula</h3>${button('Kapat', 'close-template')}</div><div class="mbody"><p>Kaydedilmiş taslak metni değişir. Google’a yayınlanmaz.</p><div class="frow"><label for="erpApplyWork">Düzenlenebilir yanıt görevi</label><select id="erpApplyWork">${draftItems.map(item => `<option value="${esc(item.id)}">${esc(item.review_snapshot?.reviewer_name || 'Google kullanıcısı')} · ${esc(item.status)}</option>`).join('')}</select></div><div class="frow"><label for="erpApplyVariant">Varyant</label><select id="erpApplyVariant"><option value="a">A</option>${row.data.body_b ? '<option value="b">B</option>' : ''}</select></div><p id="erpApplyError" role="alert"></p></div><div class="mfoot"><button class="btn p" id="erpApplyConfirm">Taslağa uygula</button></div></div>`;
    byId('erpApplyConfirm').onclick = event => run(event.target, async () => {
      const workId = byId('erpApplyWork').value;
      try { const result = await request('template_apply', { id: row.id, expected_version: row.version, work_item_id: workId, expected_work_version: versions.get(workId), variant: byId('erpApplyVariant').value }); root.closeModal('erpTemplateApplyModal'); await afterMutation(result); root.toast('Şablon gerçek taslağa kaydedildi; yayınlanmadı.', 'ok'); }
      catch (error) { byId('erpApplyError').textContent = error.message; throw error; }
    });
    root.openModal('erpTemplateApplyModal');
  }
  function renderReadiness() {
    const checks = [['Google bağlantısı', state().settings?.google_connected === true], ['Canlı modül kaydı servisi', ready()], ['ERP politika kaydı', Boolean(state().policy?.updated_at)], ['OpenAI yapılandırması', state().settings?.openai_configured === true], [`${currentBranch()} kapsamı`, state().branch_id === currentBranch()]];
    if (byId('ghScore')) byId('ghScore').textContent = `${checks.filter(([, ok]) => ok).length}/${checks.length}`;
    const hero = document.querySelector('#view-golive .golive-hero');
    if (hero) { const title = hero.querySelector('h2'), sub = hero.querySelector('p'), scoreLabel = hero.querySelector('.gh-label'), action = hero.querySelector('button'); if (title) title.textContent = 'Canlı kapsam kontrolü'; if (sub) sub.textContent = 'Bursa canlı · Gebze ve İnegöl demo. Bu işlem gerçek bağlantı ve kayıt durumlarını yeniden okur.'; if (scoreLabel) scoreLabel.textContent = 'Doğrulanan bağlantı ve kayıtlar'; if (action) { enable(action); action.textContent = 'Bağlantıları şimdi doğrula'; action.onclick = () => run(action, async () => { await refresh(); local.validation = new Date().toISOString(); renderReadiness(); root.toast('Canlı kapsam kontrolü tamamlandı.', 'ok'); }); } }
    set('checklistGrid', checks.map(([name, ok]) => `<div class="check-item ${ok ? 'done' : 'warn'}"><div class="ci-icon">${ok ? '✓' : '!'}</div><div class="ci-body"><div class="ci-title">${name}</div><div class="ci-desc">${ok ? 'Sunucu kaydı doğrulandı' : 'Doğrulanmadı; bağlantı/izin durumunu kontrol edin'}</div></div></div>`).join('') + `<div class="check-item"><div class="ci-body"><div class="ci-title">Son manuel kontrol</div><div class="ci-desc">${local.validation ? esc(when(local.validation)) : 'Henüz çalıştırılmadı'}</div></div></div>`);
  }

  function wrap(name, fn) { const original = root[name]; if (typeof original !== 'function') return; root[name] = function (...args) {
    if (name === 'renderAI' && byId('erpAiPersona')) { set('ai-config', originalAIConfig); set('ai-playground', originalPlayground); }
    if (name === 'renderComplaint') { byId('erpComplaintNew')?.remove(); const reason = byId('reasonBody')?.closest('table')?.querySelector('thead'); const repeat = byId('repeatBody')?.closest('table')?.querySelector('thead'); if (reason) reason.innerHTML = originalReasonHead; if (repeat) repeat.innerHTML = originalRepeatHead; }
    if (name === 'renderSystem' && quotaHeading()) quotaHeading().textContent = originalQuotaTitle;
    const result = original.apply(root, args); if (isLive()) fn(...args); return result;
  }; }
  wrap('renderSettings', () => { renderTemplates(); renderUsers(); renderBranchSettings(); renderIntegrations(); renderSavedViews(); });
  wrap('renderSystem', renderSystemFeatures);
  root.renderProblems = renderOpenProblems;
  wrap('renderRisk', renderSlaWork);
  wrap('renderApproval', renderDelegations);
  wrap('renderLegal', () => renderCases('legal_cases'));
  wrap('renderComplaint', () => renderCases('complaints'));
  wrap('renderAI', renderAIConfig);
  wrap('renderNotifications', renderNotifications);
  wrap('renderGolive', renderReadiness);
  const handlerKinds = { openTpl: 'templates', openGroup: 'store_groups', openDeleg: 'delegations', openNewCase: 'legal_cases', openAddUser: 'user_permissions', openNewStore: 'branch_settings' };
  Object.entries(handlerKinds).forEach(([name, kind]) => { const original = root[name]; root[name] = (...args) => isLive() ? openEditor(kind) : original?.(...args); });
  const oldSaveAI = root.saveAI, oldPlayground = root.runPlayground, oldMark = root.markAllRead;
  root.saveAI = () => isLive() ? run(null, saveAIConfig) : oldSaveAI();
  root.runPlayground = () => isLive() ? run(null, generatePlayground) : oldPlayground();
  root.markAllRead = () => isLive() ? run(null, markAllRead) : oldMark();
  const oldSaveView = root.saveView, oldApplyView = root.applyView;
  root.saveView = (...args) => {
    const existing = new Set(SAVED_VIEWS.map(view => view.id));
    const result = oldSaveView(...args);
    SAVED_VIEWS.filter(view => !existing.has(view.id)).forEach(view => { view.erpScope = root.OTOTRReviewLiveViews.getScope(); view.view = 'reviews'; });
    root.saveState();
    return result;
  };
  root.applyView = id => {
    if (root.OTOTRReviewBridge?.isEditing?.()) return root.toast('Önce açık yanıt taslağını kaydedin.', 'warn');
    const view = SAVED_VIEWS.find(view => String(view.id) === String(id));
    if (view?.erpScope) root.OTOTRReviewLiveViews.setScope(view.erpScope);
    return oldApplyView(id);
  };
  document.addEventListener('click', event => {
    const element = event.target.closest('[data-feature]'); if (!element || (!isLive() && !['branch-scope','branch-onboarding','branch-activate'].includes(element.dataset.feature))) return;
    const { feature: action, kind, id, work, user } = element.dataset;
    event.preventDefault();
    if (action === 'create') return openEditor(kind);
    if (action === 'branch-scope') { root.OTOTRReviewLiveViews?.setScope(id); return; }
    if (action === 'branch-onboarding') return run(element, async () => { const data = onboardingCache.get(id) || await loadBranchOnboarding(id); const checklist = data?.checklist || {}; const done = Object.entries(checklist).filter(([, value]) => value === true).map(([key]) => key).join(', ') || 'Henüz yok'; root.toast(`${id}: tamamlanan kontroller — ${done}`, data?.ready ? 'ok' : 'info'); renderBranchSettings(); });
    if (action === 'branch-activate') return run(element, () => activateBranch(id));
    if (action === 'edit') return openEditor(kind, id);
    if (action === 'permission') return openEditor('user_permissions', null, { user_id: user });
    if (action === 'new-linked') return openEditor(kind, null, { work_item_id: work });
    if (action === 'close-editor') return closeEditor();
    if (action === 'close-template') return root.closeModal('erpTemplateApplyModal');
    if (action === 'reviews') return root.switchView('reviews');
    if (action === 'search-reviews') { RV_SEARCH = element.dataset.query || ''; RV_FILTER = 'hepsi'; if (byId('rvSearch')) byId('rvSearch').value = RV_SEARCH; if (byId('rvFilter')) byId('rvFilter').value = RV_FILTER; return root.switchView('reviews'); }
    if (action === 'new-saved') { root.switchView('reviews'); return root.openSaveView(); }
    if (action === 'apply-saved') return root.applyView(Number(id));
    if (action === 'delete-saved') return root.deleteView(Number(id));
    if (action === 'open-playground' || action === 'open-ai-quality') { root.switchView('ai'); return document.querySelector(`#aiTabs [data-t="${action === 'open-playground' ? 'playground' : 'quality'}"]`)?.click(); }
    if (action === 'open-notification-rules') { root.switchView('system'); return document.querySelector('#systemTabs [data-t="notifmatrix"]')?.click(); }
    if (action === 'notifications') { renderNotifications(); byId('notifPanel')?.classList.add('on'); return; }
    if (action === 'open-task') return api().openTask(work);
    if (action === 'problem-review') return root.openReviewFromStore(Number(element.dataset.id));
    if (action === 'open-error') { const item = itemById(work); if (item?.kind !== 'reply') return api().openTask(work); const review = root.OTOTRReviewLiveViews.scopedReviews().find(row => row.googleReviewId === item.review_id); if (review) { root.switchView('reviews'); return root.selectReview(review.id); } return root.toast('Kaynak yorum henüz alınmadı. Bursa yorumlarını yenileyin.', 'info'); }
    run(element, async () => {
      if (action === 'collection-save') return saveCollection();
      if (action === 'collection-refresh') return loadCollection();
      if (action === 'collection-plan-demo') return planDemoDeliveries();
      if (action === 'collection-run') { const result=await request('collection_run_due'); const s=byId('collectionStatus'); if(s)s.textContent=`Kuyruk işlendi: ${result.sent} gönderildi, ${result.skipped} dry-run, ${result.failed} hata.`; return loadCollection(); }
      if (action === 'refresh') return refresh();
      if (action === 'google-status') { const result = await ai.googleBusinessStatus(); await refresh(); root.toast(result.connected ? 'Google bağlantısı doğrulandı.' : 'Google bağlantısı doğrulanmadı.', result.connected ? 'ok' : 'warn'); return; }
      if (action === 'service-health') return loadServiceHealth(true);
      if (action === 'google-connect') return ai.connectGoogleBusiness();
      if (action === 'google-sync') return byId('erpGoogleSync')?.onclick?.();
      if (action === 'save-resource') return saveEditor();
      if (action === 'create-linked-task') {
        const reviewId = byId('erpNewTaskReview')?.value;
        if (!reviewId) throw new Error('Önce gerçek bir Google yorumu seçin.');
        const entered = {}; byId('erpResourceForm').querySelectorAll('[data-field]').forEach(node => { entered[node.dataset.field] = node.type === 'checkbox' ? node.checked : node.value; });
        const item = await ai.manageReview(reviewId, kind === 'legal_cases' ? 'legal' : 'complaint');
        await refresh(); openEditor(kind, null, { ...entered, work_item_id: item.id });
        root.toast('Gerçek görev oluşturuldu; dosya bilgilerini kaydedebilirsiniz.', 'ok'); return;
      }
      if (action === 'archive') return archive(kind, id);
      if (action === 'apply-template') return applyTemplate(id);
      if (action === 'save-ai') return saveAIConfig();
      if (action === 'playground') return generatePlayground();
      if (action === 'analytics') return loadAnalytics();
      if (action === 'notification-read') { await request('notification_read', { id, read: element.dataset.read === 'true' }); return refresh(); }
      if (action === 'run-escalation') { const result = await request('escalation_run'); await refresh(); root.toast(`${Number(result.evaluated)} kayıt değerlendirildi, ${Number(result.created)} yeni bildirim oluşturuldu.`, 'ok'); }
      if (action === 'retention-preview') { local.retention = await request('retention_preview'); set('erpRetentionPreview', retentionResult(local.retention)); }
    });
  });
  setInterval(() => { if(document.visibilityState==='visible' && byId('view-system')?.classList.contains('on')) void loadServiceHealth(); },60000);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && local.modal) closeEditor(); });
  root.OTOTRReviewCollection = { enqueueCompletedService: async function(payload){ if(!payload||!payload.service_id||!payload.recipient) throw new Error('Yorum toplama için hizmet kimliği ve müşteri iletişim bilgisi gerekli.'); return request('collection_enqueue',{...payload,branch_id:currentBranch()}); }, runDue: async function(){ return request('collection_run_due'); } };
  root.OTOTRReviewLiveFeatures = { ...pure, openEditor, refresh, renderAIConfig, loadAnalytics };
  root.OTOTRReviewLiveViews?.rerender();
})(typeof window === 'undefined' ? null : window);
