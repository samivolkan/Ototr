import {createClient} from './vendor/supabase.js';
import {getConfig} from './config.js?v=6';
import {requireSession,signIn,signOut} from './auth.js?v=6';
import {createTaskApi} from './task-api.js?v=6';
import {state,resetState} from './state.js?v=6';
import {subscribeToProject} from './realtime.js?v=6';

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
  REGIONAL_MANAGER:'Bölge Yöneticisi',BRANCH_MANAGER:'Şube Yöneticisi',RECEPTION_STAFF:'Karşılama Personeli',
  INSPECTION_TECHNICIAN:'Ekspertiz Uzmanı',TECHNICAL_SUPERVISOR:'Teknik Sorumlu',DEALER_OWNER:'Bayi Sahibi',
  DEALER_STAFF:'Bayi Personeli',SALES_REP:'Satış Temsilcisi'
};
const branchRoles=['BRANCH_MANAGER','RECEPTION_STAFF','INSPECTION_TECHNICIAN','TECHNICAL_SUPERVISOR','DEALER_OWNER','DEALER_STAFF'];
const hqRoles=['CEO','GENERAL_MANAGER','REGIONAL_MANAGER','OPERATIONS','QUALITY_AUDITOR','FINANCE','LEGAL','CRM_AGENT','FRANCHISE_SALES','MARKETING','HR','ACADEMY_MANAGER','SUPPORT_AGENT'];

let client;
let api;
let refreshTimer;
let toastTimer;

function markBootReady(){
  window.dispatchEvent(new Event('ototr-task-v2-ready'));
}

function withTimeout(promise,milliseconds=15000){
  let timer;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error('İstek zaman aşımına uğradı.')),milliseconds);
  });
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

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

function canEditTaskDetails(task){
  return Boolean(state.user?.can_manage_projects||task.created_by===state.user?.app_user_id);
}

function assignableUsers(){
  if(!state.user?.can_manage_projects)return [];
  return state.managedUsers.filter(user=>user.is_active);
}

function roleOptions(selectedRole=''){
  const roles=state.selectedProject?.branch_id?branchRoles:hqRoles;
  return roles.map(role=>`<option value="${role}" ${role===selectedRole?'selected':''}>${escapeHtml(roleLabels[role]||role)}</option>`).join('');
}

function formatDate(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',year:'numeric'}).format(date);
}

function dateInputValue(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
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
  if((message.includes('e-posta')||message.includes('email'))&&(message.includes('zaten')||message.includes('already')||message.includes('registered')))return 'Bu e-posta adresiyle bir giriş hesabı zaten bulunuyor.';
  if(message.includes('şifre')||message.includes('password'))return 'Geçici şifre en az 8 karakter olmalıdır.';
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
  markBootReady();
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
    result=await withTimeout(signIn(client,values.get('email'),values.get('password')));
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
  markBootReady();
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
  markBootReady();
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
  const [categoriesResult,membersResult,tasksResult,usersResult]=await Promise.all([
    api.listCategories(projectId),
    api.listMembers(projectId),
    api.listTasks(projectId),
    state.user?.can_manage_projects?api.listManagedUsers(projectId):Promise.resolve({data:[],error:null})
  ]);
  const error=categoriesResult.error||membersResult.error||tasksResult.error||usersResult.error;
  if(error)throw error;
  state.categories=categoriesResult.data||[];
  state.members=membersResult.data||[];
  state.tasks=tasksResult.data||[];
  state.managedUsers=usersResult.data||[];
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
  markBootReady();
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
      <div class="project-actions">
        ${state.user?.can_manage_projects?`<button id="manageUsers" class="btn secondary" type="button">Ekip <span>${state.managedUsers.filter(user=>user.is_active).length}</span></button>`:''}
        <button id="newTask" class="btn primary" type="button">+ Yeni task</button>
      </div>
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
  const detailsEditable=canEditTaskDetails(task);
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
        ${detailsEditable?`<div class="task-actions"><button class="task-action" data-edit-task="${escapeHtml(task.id)}" type="button">Düzenle</button><button class="task-action danger" data-delete-task="${escapeHtml(task.id)}" type="button">Sil</button></div>`:''}
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
  root.querySelector('#manageUsers')?.addEventListener('click',openTeamModal);
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
  const editButton=event.target.closest('[data-edit-task]');
  if(editButton){
    openEditTaskModal(editButton.dataset.editTask);
    return;
  }
  const deleteButton=event.target.closest('[data-delete-task]');
  if(deleteButton){
    openDeleteTaskModal(deleteButton.dataset.deleteTask);
    return;
  }
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

function bindModalDismiss(){
  const backdrop=modalRoot.querySelector('.modal-backdrop');
  backdrop?.addEventListener('click',event=>{
    if(event.target.hasAttribute('data-close-modal'))closeTaskModal();
  });
  modalRoot.querySelectorAll('.modal [data-close-modal]').forEach(button=>button.addEventListener('click',closeTaskModal));
  document.addEventListener('keydown',handleModalKey);
}

function openEditTaskModal(taskId){
  const task=state.tasks.find(item=>item.id===taskId);
  if(!task||!canEditTaskDetails(task)){
    showToast('Bu taskı düzenleme yetkiniz bulunmuyor.','error');
    return;
  }
  const manager=Boolean(state.user?.can_manage_projects);
  const assignedIds=new Set(taskAssigneeIds(task));
  const removedInactive=manager&&state.managedUsers.some(user=>!user.is_active&&assignedIds.has(user.user_id));
  modalRoot.innerHTML=`
    <div class="modal-backdrop" data-close-modal>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head"><div><span class="eyebrow">Task yönetimi</span><h2 id="modalTitle">Taskı düzenle</h2></div><button class="modal-close" data-close-modal type="button" aria-label="Pencereyi kapat">×</button></div>
        <form id="editTaskForm" class="task-form">
          <label class="full">Task başlığı<input name="title" type="text" maxlength="180" value="${escapeHtml(task.title)}" required></label>
          <label class="full">Açıklama<textarea name="description" rows="3" maxlength="2000">${escapeHtml(task.description||'')}</textarea></label>
          <label>Kategori<select name="category" required>${state.categories.map(category=>`<option value="${escapeHtml(category.id)}" ${category.id===task.category_id?'selected':''}>${escapeHtml(category.name)}</option>`).join('')}</select></label>
          <label>Öncelik<select name="priority">${Object.entries(priorityLabels).map(([value,label])=>`<option value="${value}" ${value===task.priority?'selected':''}>${label}</option>`).join('')}</select></label>
          <label>Termin<input name="dueDate" type="date" value="${escapeHtml(dateInputValue(task.due_at))}"></label>
          <fieldset class="full assignee-picker"><legend>Sorumlu kişi</legend>
            ${manager?`<div class="member-options">${assignableUsers().map(member=>`<label><input name="assignees" type="checkbox" value="${escapeHtml(member.user_id)}" ${assignedIds.has(member.user_id)?'checked':''}><span class="mini-avatar">${escapeHtml(initials(member.full_name))}</span><span><strong>${escapeHtml(member.full_name)}</strong><small>${escapeHtml(roleLabels[member.role]||member.role)}</small></span></label>`).join('')}</div><small class="field-hint">${removedInactive?'Pasif sorumlular kaydedildiğinde tasktan kaldırılır. ':''}Tüm seçimleri kaldırarak taskı sorumlusuz bırakabilirsiniz.</small>`:`<div class="self-assignment"><span class="mini-avatar">${escapeHtml(initials(state.user?.full_name))}</span><span><strong>${escapeHtml(state.user?.full_name||'Siz')}</strong><small>Kendi oluşturduğunuz taskı düzenliyorsunuz.</small></span></div>`}
          </fieldset>
          <p id="editTaskError" class="form-error full" role="alert"></p>
          <div class="modal-actions full"><button class="btn secondary" data-close-modal type="button">Vazgeç</button><button class="btn primary" type="submit">Değişiklikleri kaydet</button></div>
        </form>
      </section>
    </div>`;
  bindModalDismiss();
  modalRoot.querySelector('#editTaskForm').addEventListener('submit',event=>handleEditTask(event,task.id));
  requestAnimationFrame(()=>modalRoot.querySelector('[name="title"]')?.focus());
}

async function handleEditTask(event,taskId){
  event.preventDefault();
  const task=state.tasks.find(item=>item.id===taskId);
  if(!task)return;
  const form=event.currentTarget;
  const values=new FormData(form);
  const submit=form.querySelector('[type="submit"]');
  const errorNode=form.querySelector('#editTaskError');
  const dueDate=values.get('dueDate');
  const assigneeIds=state.user?.can_manage_projects?values.getAll('assignees'):[state.user.app_user_id];
  submit.disabled=true;
  submit.textContent='Kaydediliyor…';
  errorNode.textContent='';
  const result=await api.updateTaskForProject({
    target_task_id:task.id,
    expected_updated_at:task.updated_at,
    target_category_id:values.get('category'),
    task_title:values.get('title'),
    task_description:values.get('description')||null,
    task_priority:values.get('priority'),
    task_due_at:dueDate?new Date(`${dueDate}T17:00:00`).toISOString():null,
    assignee_user_ids:assigneeIds
  }).catch(error=>({error}));
  if(result.error){
    errorNode.textContent=friendlyError(result.error,'Task değişiklikleri kaydedilemedi.');
    submit.disabled=false;
    submit.textContent='Değişiklikleri kaydet';
    return;
  }
  closeTaskModal();
  await refreshProjectData();
  renderWorkspace();
  showToast('Task güncellendi.');
}

function openDeleteTaskModal(taskId){
  const task=state.tasks.find(item=>item.id===taskId);
  if(!task||!canEditTaskDetails(task)){
    showToast('Bu taskı silme yetkiniz bulunmuyor.','error');
    return;
  }
  modalRoot.innerHTML=`
    <div class="modal-backdrop" data-close-modal>
      <section class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="confirm-icon" aria-hidden="true">!</div>
        <h2 id="modalTitle">Task silinsin mi?</h2>
        <p><strong>${escapeHtml(task.title)}</strong> listeden kaldırılacak. İşlem geçmişi güvenlik için korunur.</p>
        <p id="deleteTaskError" class="form-error" role="alert"></p>
        <div class="modal-actions"><button class="btn secondary" data-close-modal type="button">Vazgeç</button><button id="confirmDeleteTask" class="btn danger" type="button">Taskı sil</button></div>
      </section>
    </div>`;
  bindModalDismiss();
  modalRoot.querySelector('#confirmDeleteTask').addEventListener('click',()=>handleDeleteTask(task));
}

async function handleDeleteTask(task){
  const button=modalRoot.querySelector('#confirmDeleteTask');
  const errorNode=modalRoot.querySelector('#deleteTaskError');
  button.disabled=true;
  button.textContent='Siliniyor…';
  const result=await api.archiveTask(task.id,task.updated_at).catch(error=>({error}));
  if(result.error){
    errorNode.textContent=friendlyError(result.error,'Task silinemedi.');
    button.disabled=false;
    button.textContent='Taskı sil';
    return;
  }
  closeTaskModal();
  await refreshProjectData();
  renderWorkspace();
  showToast('Task silindi.');
}

function openTeamModal(){
  if(!state.user?.can_manage_projects){
    showToast('Ekip yönetimi için yönetici yetkisi gerekir.','error');
    return;
  }
  const activeCount=state.managedUsers.filter(user=>user.is_active).length;
  modalRoot.innerHTML=`
    <div class="modal-backdrop" data-close-modal>
      <section class="modal team-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head"><div><span class="eyebrow">${escapeHtml(state.selectedProject.name)}</span><h2 id="modalTitle">Ekip yönetimi</h2></div><button class="modal-close" data-close-modal type="button" aria-label="Pencereyi kapat">×</button></div>
        <div class="team-content">
          <div class="team-toolbar"><p><strong>${activeCount} aktif kullanıcı</strong><span>Görev sorumlularını ve giriş erişimini yönetin.</span></p><button id="addProjectUser" class="btn primary" type="button">+ Kullanıcı ekle</button></div>
          <div class="team-list">${state.managedUsers.map(renderTeamUser).join('')}</div>
        </div>
      </section>
    </div>`;
  bindModalDismiss();
  modalRoot.querySelector('#addProjectUser').addEventListener('click',()=>openUserForm());
  modalRoot.querySelectorAll('[data-edit-user]').forEach(button=>button.addEventListener('click',()=>openUserForm(state.managedUsers.find(user=>user.user_id===button.dataset.editUser))));
  modalRoot.querySelectorAll('[data-create-login]').forEach(button=>button.addEventListener('click',()=>openUserForm(state.managedUsers.find(user=>user.user_id===button.dataset.createLogin),true)));
  modalRoot.querySelectorAll('[data-toggle-user]').forEach(button=>button.addEventListener('click',()=>openUserAccessConfirm(state.managedUsers.find(user=>user.user_id===button.dataset.toggleUser))));
}

function renderTeamUser(user){
  const isSelf=user.user_id===state.user?.app_user_id;
  return `
    <article class="team-user ${user.is_active?'':'inactive'}">
      <div class="avatar">${escapeHtml(initials(user.full_name))}</div>
      <div class="team-user-copy"><strong>${escapeHtml(user.full_name)}</strong><span>${escapeHtml(user.email||'E-posta yok')}</span><small>${escapeHtml(roleLabels[user.role]||user.role)}</small></div>
      <div class="team-user-state"><span class="access-badge ${user.is_active?'active':'inactive'}">${user.is_active?'Aktif':'Pasif'}</span>${user.auth_user_id?'':'<span class="login-missing">Giriş hesabı yok</span>'}</div>
      <div class="team-user-actions">
        ${user.auth_user_id?'':`<button class="task-action" data-create-login="${escapeHtml(user.user_id)}" type="button">Giriş oluştur</button>`}
        <button class="task-action" data-edit-user="${escapeHtml(user.user_id)}" type="button">Düzenle</button>
        ${isSelf?'':`<button class="task-action ${user.is_active?'danger':''}" data-toggle-user="${escapeHtml(user.user_id)}" type="button">${user.is_active?'Kaldır':'Aktifleştir'}</button>`}
      </div>
    </article>`;
}

function openUserForm(user=null,createLogin=false){
  const editing=Boolean(user&&!createLogin);
  const title=editing?'Kullanıcıyı düzenle':createLogin?'Giriş hesabı oluştur':'Yeni kullanıcı ekle';
  const isSelf=editing&&user.user_id===state.user?.app_user_id;
  modalRoot.innerHTML=`
    <div class="modal-backdrop" data-close-modal>
      <section class="modal user-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head"><div><button class="back-button" id="backToTeam" type="button">← Ekibe dön</button><h2 id="modalTitle">${title}</h2></div><button class="modal-close" data-close-modal type="button" aria-label="Pencereyi kapat">×</button></div>
        <form id="userForm" class="task-form">
          <label class="full">Ad soyad<input name="fullName" type="text" maxlength="160" value="${escapeHtml(user?.full_name||'')}" required></label>
          <label class="full">E-posta<input name="email" type="email" inputmode="email" maxlength="254" value="${escapeHtml(user?.email||'')}" ${editing||createLogin?'readonly':''} required></label>
          <label class="full">Rol<select name="role" ${isSelf?'disabled':''}>${roleOptions(user?.role||'INSPECTION_TECHNICIAN')}</select>${isSelf?`<input type="hidden" name="role" value="${escapeHtml(user.role)}"><small class="field-hint">Kendi yönetici rolünüzü değiştiremezsiniz.</small>`:''}</label>
          ${editing?'':`<label class="full">Geçici şifre<span class="password-field"><input id="newUserPassword" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required><button id="toggleNewUserPassword" type="button">Göster</button></span><small class="field-hint">En az 8 karakter. Şifreyi kullanıcıya güvenli bir kanaldan iletin.</small></label>`}
          <p id="userFormError" class="form-error full" role="alert"></p>
          <div class="modal-actions full"><button class="btn secondary" id="cancelUserForm" type="button">Vazgeç</button><button class="btn primary" type="submit">${editing?'Kaydet':'Kullanıcı oluştur'}</button></div>
        </form>
      </section>
    </div>`;
  bindModalDismiss();
  modalRoot.querySelector('#backToTeam').addEventListener('click',openTeamModal);
  modalRoot.querySelector('#cancelUserForm').addEventListener('click',openTeamModal);
  modalRoot.querySelector('#toggleNewUserPassword')?.addEventListener('click',event=>{
    const input=modalRoot.querySelector('#newUserPassword');
    const visible=input.type==='text';
    input.type=visible?'password':'text';
    event.currentTarget.textContent=visible?'Göster':'Gizle';
  });
  modalRoot.querySelector('#userForm').addEventListener('submit',event=>handleUserForm(event,user,editing));
  requestAnimationFrame(()=>modalRoot.querySelector('[name="fullName"]')?.focus());
}

async function handleUserForm(event,user,editing){
  event.preventDefault();
  const form=event.currentTarget;
  const values=new FormData(form);
  const submit=form.querySelector('[type="submit"]');
  const errorNode=form.querySelector('#userFormError');
  submit.disabled=true;
  submit.textContent=editing?'Kaydediliyor…':'Oluşturuluyor…';
  errorNode.textContent='';
  let result;
  if(editing){
    result=await api.updateProjectUser({
      target_project_id:state.selectedProject.id,
      target_user_id:user.user_id,
      target_full_name:values.get('fullName'),
      target_role:values.get('role'),
      target_is_active:user.is_active
    }).catch(error=>({error}));
  }else{
    result=await api.createProjectUser({
      projectId:state.selectedProject.id,
      fullName:values.get('fullName'),
      email:values.get('email'),
      password:values.get('password'),
      role:values.get('role')
    }).catch(error=>({error}));
  }
  if(result.error){
    errorNode.textContent=friendlyError(result.error,editing?'Kullanıcı güncellenemedi.':'Kullanıcı oluşturulamadı.');
    submit.disabled=false;
    submit.textContent=editing?'Kaydet':'Kullanıcı oluştur';
    return;
  }
  await refreshProjectData();
  renderWorkspace();
  openTeamModal();
  showToast(editing?'Kullanıcı güncellendi.':'Kullanıcı oluşturuldu ve girişe hazır.');
}

function openUserAccessConfirm(user){
  if(!user)return;
  const activating=!user.is_active;
  modalRoot.innerHTML=`
    <div class="modal-backdrop" data-close-modal>
      <section class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="confirm-icon ${activating?'positive':''}" aria-hidden="true">${activating?'✓':'!'}</div>
        <h2 id="modalTitle">${activating?'Kullanıcı aktifleştirilsin mi?':'Kullanıcı kaldırılsın mı?'}</h2>
        <p><strong>${escapeHtml(user.full_name)}</strong> ${activating?'yeniden tasklara atanabilecek ve Task Merkezi’ne erişebilecek.':'yeni tasklara atanamayacak ve Task Merkezi erişimi kapanacak. Geçmiş task kayıtları korunur.'}</p>
        <p id="userAccessError" class="form-error" role="alert"></p>
        <div class="modal-actions"><button class="btn secondary" id="backToTeam" type="button">Vazgeç</button><button id="confirmUserAccess" class="btn ${activating?'primary':'danger'}" type="button">${activating?'Aktifleştir':'Kullanıcıyı kaldır'}</button></div>
      </section>
    </div>`;
  bindModalDismiss();
  modalRoot.querySelector('#backToTeam').addEventListener('click',openTeamModal);
  modalRoot.querySelector('#confirmUserAccess').addEventListener('click',()=>handleUserAccess(user,activating));
}

async function handleUserAccess(user,active){
  const button=modalRoot.querySelector('#confirmUserAccess');
  const errorNode=modalRoot.querySelector('#userAccessError');
  button.disabled=true;
  button.textContent='Kaydediliyor…';
  const result=await api.updateProjectUser({
    target_project_id:state.selectedProject.id,
    target_user_id:user.user_id,
    target_full_name:user.full_name,
    target_role:user.role,
    target_is_active:active
  }).catch(error=>({error}));
  if(result.error){
    errorNode.textContent=friendlyError(result.error,'Kullanıcı erişimi güncellenemedi.');
    button.disabled=false;
    button.textContent=active?'Aktifleştir':'Kullanıcıyı kaldır';
    return;
  }
  await refreshProjectData();
  renderWorkspace();
  openTeamModal();
  showToast(active?'Kullanıcı aktifleştirildi.':'Kullanıcı Task Merkezi’nden kaldırıldı.');
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
            ${manager?`<div class="member-options">${assignableUsers().map(member=>`<label><input name="assignees" type="checkbox" value="${escapeHtml(member.user_id)}" ${member.user_id===currentId?'checked':''}><span class="mini-avatar">${escapeHtml(initials(member.full_name))}</span><span><strong>${escapeHtml(member.full_name)}</strong><small>${escapeHtml(roleLabels[member.role]||member.role)}</small></span></label>`).join('')}</div><small class="field-hint">Seçimi kaldırarak taskı sorumlusuz bırakabilirsiniz.</small>`:`<div class="self-assignment"><span class="mini-avatar">${escapeHtml(initials(state.user?.full_name))}</span><span><strong>${escapeHtml(state.user?.full_name||'Siz')}</strong><small>Oluşturduğunuz task otomatik olarak size atanır.</small></span></div>`}
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
  markBootReady();
  console.error(error);
  root.innerHTML=`<div class="empty-state error-state"><span class="empty-icon" aria-hidden="true">!</span><h2>Task Merkezi açılamadı</h2><p class="muted">Bağlantınızı kontrol edip tekrar deneyin.</p><button id="retry" class="btn primary" type="button">Tekrar dene</button></div>`;
  root.querySelector('#retry').addEventListener('click',()=>boot());
}

async function boot(){
  if(!config.configured)throw new Error('V2 public Supabase yapılandırması bulunamadı.');
  client=createClient(config.url,config.publishableKey);
  api=createTaskApi(client);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  const session=await withTimeout(requireSession(client));
  if(!session){renderLogin();return;}
  await startWorkspace(session);
}

boot().catch(renderFatal);
