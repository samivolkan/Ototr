import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';
import {getConfig} from './config.js';
import {requireSession,signIn,signOut} from './auth.js';
import {createTaskApi} from './task-api.js';
import {state,resetState} from './state.js';
import {subscribeToProject} from './realtime.js';

const root=document.getElementById('app');
const modalRoot=document.getElementById('modalRoot');
const toastNode=document.getElementById('toast');
const config=getConfig();
const PROJECT_KEY='ototr-task-v2-selected-project';
const statusLabels={todo:'Bekliyor',doing:'Devam ediyor',review:'Kontrolde',done:'Tamamlandı',cancelled:'İptal'};
const priorityLabels={low:'Düşük',medium:'Orta',high:'Yüksek',critical:'Kritik'};
const roleLabels={
  CEO:'CEO',GENERAL_MANAGER:'Genel Müdür',OPERATIONS:'Operasyon',QUALITY_AUDITOR:'Kalite Denetçisi',
  FINANCE:'Finans',LEGAL:'Hukuk',CRM_AGENT:'CRM',FRANCHISE_SALES:'Franchise Satış',MARKETING:'Pazarlama',
  HR:'İnsan Kaynakları',ACADEMY_MANAGER:'Akademi Yöneticisi',SUPPORT_AGENT:'Destek',
  BRANCH_MANAGER:'Şube Yöneticisi',INSPECTION_TECHNICIAN:'Ekspertiz Uzmanı',SALES_REP:'Satış Temsilcisi'
};

let client;
let api;
let refreshTimer;
let toastTimer;

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

function firstRow(data){
  return Array.isArray(data)?data[0]:data;
}

function lower(value){
  return String(value??'').toLocaleLowerCase('tr-TR');
}

function categoryMap(){
  return new Map(state.categories.map(category=>[category.id,category]));
}

function memberMap(){
  return new Map(state.members.map(member=>[member.user_id,member]));
}

function taskAssigneeIds(task){
  return (task.task_assignees||[]).map(item=>item.user_id).filter(Boolean);
}

function canEditTask(task){
  return Boolean(state.user?.can_manage_projects||taskAssigneeIds(task).includes(state.user?.app_user_id));
}

function formatDate(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',year:'numeric'}).format(date);
}

function initials(name){
  return String(name||'?').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toLocaleUpperCase('tr-TR');
}

function showToast(message,type='success'){
  clearTimeout(toastTimer);
  toastNode.textContent=message;
  toastNode.className=`toast is-visible ${type}`;
  toastTimer=setTimeout(()=>{toastNode.className='toast'},3200);
}

function friendlyError(error,fallback='İşlem tamamlanamadı.'){
  const message=lower(error?.message);
  if(error?.code==='42501'||message.includes('denied')||message.includes('permission'))return 'Bu işlem için yetkiniz bulunmuyor.';
  if(message.includes('evidence'))return 'Görevi tamamlamak için önce kanıt dosyası eklenmeli.';
  if(message.includes('approval'))return 'Bu görev tamamlanmadan önce onay sürecinden geçmeli.';
  if(message.includes('updated')||message.includes('stale')||message.includes('concurrent'))return 'Görev başka biri tarafından güncellendi. Liste yenilendi.';
  if(error?.code==='23514')return 'Lütfen zorunlu alanları kontrol edin.';
  return fallback;
}

function renderLoading(message='Çalışma alanınız hazırlanıyor…'){
  root.innerHTML=`<div class="loading-state"><span class="spinner" aria-hidden="true"></span><p>${escapeHtml(message)}</p></div>`;
}

function renderLogin(message=''){
  document.body.classList.remove('workspace-open');
  root.innerHTML=`
    <div class="auth-layout">
      <div class="auth-copy">
        <span class="eyebrow">Güvenli giriş</span>
        <h2>OTOTR hesabınızla devam edin</h2>
        <p class="muted">Size atanan taskları görün, kendi taskınızı oluşturun ve ilerlemeyi tek ekrandan takip edin.</p>
        <div class="auth-points" aria-label="Özellikler">
          <span>✓ Kişisel task listesi</span><span>✓ Durum takibi</span><span>✓ Mobil kullanım</span>
        </div>
      </div>
      <form id="loginForm" class="login-form">
        <label>E-posta<input name="email" type="email" inputmode="email" autocomplete="username" required></label>
        <label>Şifre
          <span class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" required><button id="togglePassword" type="button">Göster</button></span>
        </label>
        <p id="loginError" class="form-error" role="alert">${escapeHtml(message)}</p>
        <button class="btn primary wide" type="submit">Giriş yap</button>
      </form>
    </div>`;
  root.querySelector('#loginForm').addEventListener('submit',handleLogin);
  root.querySelector('#togglePassword').addEventListener('click',event=>{
    const input=root.querySelector('#password');
    const visible=input.type==='text';
    input.type=visible?'password':'text';
    event.currentTarget.textContent=visible?'Göster':'Gizle';
  });
}

async function handleLogin(event){
  event.preventDefault();
  const form=event.currentTarget;
  const button=form.querySelector('[type="submit"]');
  const errorNode=form.querySelector('#loginError');
  const values=new FormData(form);
  button.disabled=true;
  button.textContent='Giriş yapılıyor…';
  errorNode.textContent='';
  let result;
  try{
    result=await signIn(client,values.get('email'),values.get('password'));
  }catch{
    result={error:true};
  }
  if(result.error){
    errorNode.textContent='Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.';
    button.disabled=false;
    button.textContent='Giriş yap';
    return;
  }
  await startWorkspace(result.data.session);
}

async function startWorkspace(session){
  document.body.classList.add('workspace-open');
  renderLoading();
  state.session=session;
  const [userResult,projectResult]=await Promise.all([api.currentUser(),api.listProjects()]);
  if(userResult.error)throw userResult.error;
  if(projectResult.error){
    if(projectResult.error.code==='PGRST205'||/task_projects/i.test(projectResult.error.message||'')){
      renderSetupPending();
      return;
    }
    throw projectResult.error;
  }
  state.user=firstRow(userResult.data);
  state.projects=projectResult.data||[];
  if(!state.projects.length){
    renderNoProjects();
    return;
  }
  const savedId=localStorage.getItem(PROJECT_KEY);
  const selected=state.projects.find(project=>project.id===savedId)||state.projects[0];
  await selectProject(selected.id);
}

function renderSetupPending(){
  root.innerHTML=`
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">⚙</span>
      <span class="eyebrow">Kurulum bekleniyor</span>
      <h2>V2 veritabanı henüz etkin değil</h2>
      <p class="muted">Bağlantı ve oturum doğrulandı. Task Merkezi V2 tablolarının uygulanması gerekiyor.</p>
      <button id="signOut" class="btn secondary" type="button">Çıkış yap</button>
    </div>`;
  root.querySelector('#signOut').addEventListener('click',handleSignOut);
}

function renderNoProjects(){
  const name=state.user?.full_name||state.session?.user?.email||'OTOTR kullanıcısı';
  root.innerHTML=`
    <div class="empty-state">
      <div class="avatar large">${escapeHtml(initials(name))}</div>
      <span class="eyebrow">${escapeHtml(name)}</span>
      <h2>Henüz erişebildiğiniz aktif proje yok</h2>
      <p class="muted">Bir şube yöneticisi sizi aktif bir projeye dahil ettiğinde tasklarınız burada görünecek.</p>
      <button id="signOut" class="btn secondary" type="button">Çıkış yap</button>
    </div>`;
  root.querySelector('#signOut').addEventListener('click',handleSignOut);
}

async function selectProject(projectId){
  if(state.unsubscribe)state.unsubscribe();
  state.unsubscribe=null;
  state.selectedProject=state.projects.find(project=>project.id===projectId)||state.projects[0];
  localStorage.setItem(PROJECT_KEY,state.selectedProject.id);
  state.filters={scope:'all',search:'',status:'',category:'',assignee:''};
  state.visibleLimit=40;
  renderLoading('Tasklar yükleniyor…');
  await refreshProjectData();
  state.unsubscribe=subscribeToProject(client,state.selectedProject.id,queueProjectRefresh);
  renderWorkspace();
}

async function refreshProjectData(){
  const projectId=state.selectedProject.id;
  const [categoriesResult,membersResult,tasksResult]=await Promise.all([
    api.listCategories(projectId),api.listMembers(projectId),api.listTasks(projectId)
  ]);
  const error=categoriesResult.error||membersResult.error||tasksResult.error;
  if(error)throw error;
  state.categories=categoriesResult.data||[];
  state.members=membersResult.data||[];
  state.tasks=tasksResult.data||[];
}

function queueProjectRefresh(){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(async()=>{
    try{
      await refreshProjectData();
      renderWorkspace();
    }catch(error){
      console.error(error);
      showToast('Canlı güncelleme alınamadı. Sayfayı yenileyin.','error');
    }
  },300);
}

function projectProgress(){
  const active=state.tasks.filter(task=>task.status!=='cancelled');
  if(!active.length)return 0;
  return Math.round(active.filter(task=>task.status==='done').length/active.length*100);
}

function renderWorkspace(){
  document.body.classList.add('workspace-open');
  const userName=state.user?.full_name||state.user?.email||'OTOTR kullanıcısı';
  const mine=state.tasks.filter(task=>taskAssigneeIds(task).includes(state.user?.app_user_id)).length;
  const inProgress=state.tasks.filter(task=>task.status==='doing'||task.status==='review').length;
  const done=state.tasks.filter(task=>task.status==='done').length;
  const progress=projectProgress();
  root.innerHTML=`
    <div class="workspace-head">
      <div class="user-block">
        <div class="avatar">${escapeHtml(initials(userName))}</div>
        <div><strong>${escapeHtml(userName)}</strong><span>${escapeHtml(roleLabels[state.user?.role]||state.user?.role||'Ekip üyesi')}</span></div>
      </div>
      <button id="signOut" class="icon-button" type="button" title="Çıkış yap" aria-label="Çıkış yap">↗</button>
    </div>
    <div class="project-bar">
      <label class="project-picker"><span>Aktif proje</span><select id="projectSelect">${state.projects.map(project=>`<option value="${escapeHtml(project.id)}" ${project.id===state.selectedProject.id?'selected':''}>${escapeHtml(project.name)}</option>`).join('')}</select></label>
      <button id="newTask" class="btn primary" type="button">+ Yeni task</button>
    </div>
    <section class="progress-card" aria-label="Proje özeti">
      <div class="progress-copy"><div><span class="eyebrow">Proje ilerlemesi</span><h2>${escapeHtml(state.selectedProject.name)}</h2></div><strong>%${progress}</strong></div>
      <div class="progress-track"><span style="width:${progress}%"></span></div>
      <div class="stats-grid">
        <div><strong>${state.tasks.length}</strong><span>Toplam task</span></div>
        <div><strong>${mine}</strong><span>Benim taskım</span></div>
        <div><strong>${inProgress}</strong><span>Devam eden</span></div>
        <div><strong>${done}</strong><span>Tamamlanan</span></div>
      </div>
    </section>
    <section class="task-section">
      <div class="task-section-head"><div><span class="eyebrow">Task listesi</span><h2>İşlerinizi takip edin</h2></div></div>
      <div class="scope-tabs" role="tablist" aria-label="Task kapsamı">
        <button class="scope-tab ${state.filters.scope==='all'?'active':''}" data-scope="all" type="button">Tüm tasklar <span>${state.tasks.length}</span></button>
        <button class="scope-tab ${state.filters.scope==='mine'?'active':''}" data-scope="mine" type="button">Tasklarım <span>${mine}</span></button>
      </div>
      <div class="filters">
        <label class="search-field"><span class="sr-only">Task ara</span><span aria-hidden="true">⌕</span><input id="taskSearch" type="search" placeholder="Task ara…" value="${escapeHtml(state.filters.search)}"></label>
        <label><span class="sr-only">Durum</span><select id="statusFilter"><option value="">Tüm durumlar</option>${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}" ${state.filters.status===value?'selected':''}>${label}</option>`).join('')}</select></label>
        <label><span class="sr-only">Kategori</span><select id="categoryFilter"><option value="">Tüm kategoriler</option>${state.categories.map(category=>`<option value="${escapeHtml(category.id)}" ${state.filters.category===category.id?'selected':''}>${escapeHtml(category.name)}</option>`).join('')}</select></label>
        <label><span class="sr-only">Sorumlu kişi</span><select id="assigneeFilter"><option value="">Tüm sorumlular</option><option value="unassigned" ${state.filters.assignee==='unassigned'?'selected':''}>Atanmamış</option>${state.members.map(member=>`<option value="${escapeHtml(member.user_id)}" ${state.filters.assignee===member.user_id?'selected':''}>${escapeHtml(member.full_name)}</option>`).join('')}</select></label>
      </div>
      <div id="taskResults"></div>
    </section>`;
  bindWorkspaceEvents();
  renderTaskResults();
}

function filteredTasks(){
  const categories=categoryMap();
  const members=memberMap();
  const search=lower(state.filters.search.trim());
  return state.tasks.filter(task=>{
    const assignees=taskAssigneeIds(task);
    if(state.filters.scope==='mine'&&!assignees.includes(state.user?.app_user_id))return false;
    if(state.filters.status&&task.status!==state.filters.status)return false;
    if(state.filters.category&&task.category_id!==state.filters.category)return false;
    if(state.filters.assignee==='unassigned'&&assignees.length)return false;
    if(state.filters.assignee&&state.filters.assignee!=='unassigned'&&!assignees.includes(state.filters.assignee))return false;
    if(search){
      const category=categories.get(task.category_id)?.name||'';
      const people=assignees.map(id=>members.get(id)?.full_name||'').join(' ');
      if(!lower(`${task.title} ${task.description||''} ${category} ${people}`).includes(search))return false;
    }
    return true;
  });
}

function renderTaskResults(){
  const container=root.querySelector('#taskResults');
  if(!container)return;
  const filtered=filteredTasks();
  const visible=filtered.slice(0,state.visibleLimit);
  if(!filtered.length){
    container.innerHTML=`<div class="task-empty"><span aria-hidden="true">✓</span><h3>Bu filtrede task bulunamadı</h3><p>Filtreleri temizleyebilir veya yeni bir task oluşturabilirsiniz.</p><button id="clearFilters" class="btn secondary" type="button">Filtreleri temizle</button></div>`;
    return;
  }
  container.innerHTML=`
    <div class="result-summary"><strong>${filtered.length} task</strong><span>${state.filters.scope==='mine'?'Size atanmış işler':'Seçili projedeki işler'}</span></div>
    <div class="task-list">${visible.map(renderTaskCard).join('')}</div>
    ${visible.length<filtered.length?`<button id="loadMore" class="btn secondary load-more" type="button">Daha fazla göster (${filtered.length-visible.length})</button>`:''}`;
}

function renderTaskCard(task){
  const categories=categoryMap();
  const members=memberMap();
  const assignees=taskAssigneeIds(task).map(id=>members.get(id)).filter(Boolean);
  const editable=canEditTask(task);
  const due=formatDate(task.due_at);
  const overdue=task.due_at&&task.status!=='done'&&task.status!=='cancelled'&&new Date(task.due_at)<new Date();
  return `
    <article class="task-card status-${escapeHtml(task.status)}" data-task-id="${escapeHtml(task.id)}">
      <div class="task-main">
        <div class="task-labels"><span class="category-label">${escapeHtml(categories.get(task.category_id)?.name||'Genel')}</span><span class="priority priority-${escapeHtml(task.priority)}">${escapeHtml(priorityLabels[task.priority]||task.priority)}</span></div>
        <h3>${escapeHtml(task.title)}</h3>
        ${task.description?`<p>${escapeHtml(task.description)}</p>`:''}
        <div class="task-meta">
          <span class="assignees">${assignees.length?assignees.slice(0,3).map(person=>`<i title="${escapeHtml(person.full_name)}">${escapeHtml(initials(person.full_name))}</i>`).join(''):`<i class="unassigned">?</i>`}<b>${escapeHtml(assignees.length?assignees.map(person=>person.full_name).join(', '):'Sorumlu atanmamış')}</b></span>
          ${due?`<span class="due ${overdue?'overdue':''}">◷ ${escapeHtml(due)}${overdue?' · Gecikti':''}</span>`:''}
          ${task.requires_evidence?'<span>▣ Kanıt gerekli</span>':''}
          ${task.requires_approval?'<span>◇ Onay gerekli</span>':''}
        </div>
      </div>
      <div class="task-status">
        <label><span>Durum</span>${editable?`<select class="status-select" data-task-id="${escapeHtml(task.id)}" data-updated-at="${escapeHtml(task.updated_at)}">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}" ${task.status===value?'selected':''}>${label}</option>`).join('')}</select>`:`<strong class="status-badge status-${escapeHtml(task.status)}">${escapeHtml(statusLabels[task.status]||task.status)}</strong>`}</label>
      </div>
    </article>`;
}

function bindWorkspaceEvents(){
  root.querySelector('#signOut').addEventListener('click',handleSignOut);
  root.querySelector('#projectSelect').addEventListener('change',event=>selectProject(event.target.value).catch(renderFatal));
  root.querySelector('#newTask').addEventListener('click',openTaskModal);
  root.querySelectorAll('[data-scope]').forEach(button=>button.addEventListener('click',()=>{
    state.filters.scope=button.dataset.scope;
    state.visibleLimit=40;
    renderWorkspace();
  }));
  root.querySelector('#taskSearch').addEventListener('input',event=>{
    state.filters.search=event.target.value;
    state.visibleLimit=40;
    renderTaskResults();
  });
  [['#statusFilter','status'],['#categoryFilter','category'],['#assigneeFilter','assignee']].forEach(([selector,key])=>{
    root.querySelector(selector).addEventListener('change',event=>{
      state.filters[key]=event.target.value;
      state.visibleLimit=40;
      renderTaskResults();
    });
  });
  root.onchange=handleTaskStatusChange;
  root.onclick=handleTaskResultClick;
}

function handleTaskResultClick(event){
  if(event.target.closest('#clearFilters')){
    state.filters={scope:state.filters.scope,search:'',status:'',category:'',assignee:''};
    state.visibleLimit=40;
    renderWorkspace();
  }
  if(event.target.closest('#loadMore')){
    state.visibleLimit+=40;
    renderTaskResults();
  }
}

async function handleTaskStatusChange(event){
  const select=event.target.closest('.status-select');
  if(!select)return;
  const task=state.tasks.find(item=>item.id===select.dataset.taskId);
  if(!task||select.value===task.status)return;
  const previous=task.status;
  select.disabled=true;
  try{
    const result=await api.updateTask(task.id,select.dataset.updatedAt,{status:select.value});
    if(result.error)throw result.error;
    const updated=firstRow(result.data);
    task.status=updated?.status||select.value;
    task.updated_at=updated?.updated_at||new Date().toISOString();
    showToast(`Task “${task.title}” güncellendi.`);
    await refreshProjectData();
    renderWorkspace();
  }catch(error){
    task.status=previous;
    showToast(friendlyError(error,'Task durumu güncellenemedi.'),'error');
    await refreshProjectData().catch(()=>{});
    renderWorkspace();
  }
}

function openTaskModal(){
  const manager=Boolean(state.user?.can_manage_projects);
  const currentId=state.user?.app_user_id;
  modalRoot.innerHTML=`
    <div class="modal-backdrop" data-close-modal>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head"><div><span class="eyebrow">${escapeHtml(state.selectedProject.name)}</span><h2 id="modalTitle">Yeni task oluştur</h2></div><button class="modal-close" data-close-modal type="button" aria-label="Pencereyi kapat">×</button></div>
        <form id="taskForm" class="task-form">
          <label class="full">Task başlığı<input name="title" type="text" maxlength="180" placeholder="Yapılacak işi kısa ve net yazın" required autofocus></label>
          <label class="full">Açıklama<textarea name="description" rows="3" maxlength="2000" placeholder="Gerekli detayları ekleyin (isteğe bağlı)"></textarea></label>
          <label>Kategori<select name="category" required><option value="">Kategori seçin</option>${state.categories.map(category=>`<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join('')}</select></label>
          <label>Öncelik<select name="priority"><option value="low">Düşük</option><option value="medium" selected>Orta</option><option value="high">Yüksek</option><option value="critical">Kritik</option></select></label>
          <label>Termin<input name="dueDate" type="date"></label>
          <fieldset class="full assignee-picker"><legend>Sorumlu kişi</legend>
            ${manager?`<div class="member-options">${state.members.map(member=>`<label><input name="assignees" type="checkbox" value="${escapeHtml(member.user_id)}" ${member.user_id===currentId?'checked':''}><span class="mini-avatar">${escapeHtml(initials(member.full_name))}</span><span><strong>${escapeHtml(member.full_name)}</strong><small>${escapeHtml(roleLabels[member.role]||member.role)}</small></span></label>`).join('')}</div>`:`<div class="self-assignment"><span class="mini-avatar">${escapeHtml(initials(state.user?.full_name))}</span><span><strong>${escapeHtml(state.user?.full_name||'Siz')}</strong><small>Oluşturduğunuz task otomatik olarak size atanır.</small></span></div>`}
          </fieldset>
          <p id="taskFormError" class="form-error full" role="alert"></p>
          <div class="modal-actions full"><button class="btn secondary" data-close-modal type="button">Vazgeç</button><button class="btn primary" type="submit">Task oluştur</button></div>
        </form>
      </section>
    </div>`;
  modalRoot.querySelector('.modal-backdrop').addEventListener('click',event=>{
    if(event.target.hasAttribute('data-close-modal'))closeTaskModal();
  });
  modalRoot.querySelectorAll('.modal [data-close-modal]').forEach(button=>button.addEventListener('click',closeTaskModal));
  modalRoot.querySelector('#taskForm').addEventListener('submit',handleCreateTask);
  document.addEventListener('keydown',handleModalKey);
  requestAnimationFrame(()=>modalRoot.querySelector('[name="title"]')?.focus());
}

function handleModalKey(event){
  if(event.key==='Escape')closeTaskModal();
}

function closeTaskModal(){
  document.removeEventListener('keydown',handleModalKey);
  modalRoot.innerHTML='';
}

async function handleCreateTask(event){
  event.preventDefault();
  const form=event.currentTarget;
  const submit=form.querySelector('[type="submit"]');
  const errorNode=form.querySelector('#taskFormError');
  const values=new FormData(form);
  const dueDate=values.get('dueDate');
  let assigneeIds=state.user?.can_manage_projects?values.getAll('assignees'):[state.user.app_user_id];
  if(!assigneeIds.length&&state.user?.can_manage_projects)assigneeIds=[state.user.app_user_id];
  submit.disabled=true;
  submit.textContent='Oluşturuluyor…';
  errorNode.textContent='';
  const result=await api.createTaskForProject({
    target_project_id:state.selectedProject.id,
    target_category_id:values.get('category'),
    task_title:values.get('title'),
    task_description:values.get('description')||null,
    task_priority:values.get('priority'),
    task_due_at:dueDate?new Date(`${dueDate}T17:00:00`).toISOString():null,
    assignee_user_ids:assigneeIds
  }).catch(error=>({error}));
  if(result.error){
    errorNode.textContent=friendlyError(result.error,'Task oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.');
    submit.disabled=false;
    submit.textContent='Task oluştur';
    return;
  }
  closeTaskModal();
  state.filters.scope='mine';
  state.visibleLimit=40;
  await refreshProjectData();
  renderWorkspace();
  showToast('Task oluşturuldu ve listenize eklendi.');
}

async function handleSignOut(){
  clearTimeout(refreshTimer);
  if(state.unsubscribe)state.unsubscribe();
  closeTaskModal();
  await signOut(client).catch(()=>{});
  resetState();
  renderLogin();
}

function renderFatal(error){
  console.error(error);
  root.innerHTML=`<div class="empty-state error-state"><span class="empty-icon" aria-hidden="true">!</span><h2>Task Merkezi açılamadı</h2><p class="muted">Bağlantınızı kontrol edip tekrar deneyin.</p><button id="retry" class="btn primary" type="button">Tekrar dene</button></div>`;
  root.querySelector('#retry').addEventListener('click',()=>boot());
}

async function boot(){
  if(!config.configured)throw new Error('V2 public Supabase yapılandırması bulunamadı.');
  client=createClient(config.url,config.publishableKey);
  api=createTaskApi(client);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  const session=await requireSession(client);
  if(!session){renderLogin();return;}
  await startWorkspace(session);
}

boot().catch(renderFatal);
