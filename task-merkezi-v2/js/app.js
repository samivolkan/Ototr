import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';
import{getConfig}from'./config.js';
import{requireSession,signIn,signOut}from'./auth.js';
import{createTaskApi}from'./task-api.js';

const root=document.getElementById('app');
const config=getConfig();
let client;

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

function renderLogin(message=''){
  root.innerHTML=`
    <div class="auth-layout">
      <div>
        <span class="eyebrow">Güvenli giriş</span>
        <h2>OTOTR hesabınızla devam edin</h2>
        <p class="muted">Projeler ve görevler yalnızca yetkili ekip üyelerine açıktır.</p>
      </div>
      <form id="loginForm" class="login-form">
        <label>E-posta<input name="email" type="email" autocomplete="username" required></label>
        <label>Şifre<input name="password" type="password" autocomplete="current-password" required></label>
        <p id="loginError" class="form-error" role="alert">${message}</p>
        <button class="btn" type="submit">Giriş yap</button>
      </form>
    </div>`;
  root.querySelector('#loginForm').addEventListener('submit',handleLogin);
}

async function handleLogin(event){
  event.preventDefault();
  const form=event.currentTarget;
  const button=form.querySelector('button');
  const errorNode=form.querySelector('#loginError');
  const values=new FormData(form);
  button.disabled=true;
  button.textContent='Giriş yapılıyor…';
  errorNode.textContent='';
  let result;
  try{result=await signIn(client,values.get('email'),values.get('password'))}
  catch{result={error:true}}
  if(result.error){
    errorNode.textContent='Giriş yapılamadı. Bilgilerinizi ve bağlantınızı kontrol edin.';
    button.disabled=false;
    button.textContent='Giriş yap';
    return;
  }
  await showProjects(result.data.session);
}

async function showProjects(session){
  root.innerHTML='<p>Projeler yükleniyor…</p>';
  const api=createTaskApi(client);
  const {data,error}=await api.listProjects();
  if(error){
    if(error.code==='PGRST205'||/task_projects/i.test(error.message||'')){
      root.innerHTML=`
        <div class="state-row">
          <div><span class="eyebrow">Kurulum bekleniyor</span><h2>V2 veritabanı henüz etkin değil</h2><p class="muted">Bağlantı ve oturum doğrulandı. Task Merkezi V2 tablolarının Supabase projesine uygulanması gerekiyor.</p></div>
          <button id="signOut" class="btn secondary" type="button">Çıkış yap</button>
        </div>`;
      root.querySelector('#signOut').addEventListener('click',handleSignOut);
      return;
    }
    throw error;
  }
  root.innerHTML=`
    <div class="state-row">
      <div><span class="eyebrow">${escapeHtml(session.user?.email||'OTOTR hesabı')}</span><h2>Projeler</h2><p class="muted">${data.length} aktif proje bulundu.</p></div>
      <button id="signOut" class="btn secondary" type="button">Çıkış yap</button>
    </div>`;
  root.querySelector('#signOut').addEventListener('click',handleSignOut);
}

async function handleSignOut(){
  await signOut(client);
  renderLogin();
}

async function boot(){
  if(!config.configured)throw new Error('V2 public Supabase yapılandırması bulunamadı.');
  client=createClient(config.url,config.publishableKey);
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');
  const session=await requireSession(client);
  if(!session){renderLogin();return}
  await showProjects(session);
}

boot().catch(error=>{
  console.error(error);
  root.innerHTML='<div class="notice error"><strong>Task Merkezi açılamadı.</strong><br>Bağlantınızı kontrol edip sayfayı yenileyin.</div>';
});
