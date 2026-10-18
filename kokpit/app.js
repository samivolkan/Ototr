import {createClient} from '../task-merkezi-v2/js/vendor/supabase.js';
import {requireSession,signIn,signOut} from '../task-merkezi-v2/js/auth.js';
const $=s=>document.querySelector(s);
const config=window.OTOTR_SUPABASE_CONFIG;
const client=createClient(config.url,config.publishableKey,{auth:{storageKey:'ototr-kokpit-auth-v1'}});
const API=config.kokpitApi||config.url+'/functions/v1/kokpit-api/api';
const ST={yapilacak:'Yapılacak',devam:'Devam ediyor',bitti:'Tamamlandı'},PR={yuksek:'Yüksek',orta:'Orta',dusuk:'Düşük'};
let tasks=[],me='',user={},auto={late:false,done:true,version:1},view='board',sf='',editId=null,cm=0,gw=0,busy=false,session=null,loadVersion=0,syncFailed=false;
const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10),today=()=>iso(new Date());
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csv=s=>s.split(',').map(x=>x.trim()).filter(Boolean);
const fmt=d=>d?new Date(d+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'short'}):'Tarih yok';
const fmtT=s=>{s=Math.max(0,Math.floor(s));return[s/3600|0,(s/60|0)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':')};
const late=t=>t.due&&t.status!=='bitti'&&t.due<today();
const secs=t=>(t.time||0)+(t.ts?Math.max(0,(Date.now()-t.ts)/1000):0);
const pct=t=>t.subs.length?Math.round(t.subs.filter(s=>s.d).length/t.subs.length*100):0;
const canWrite=()=>Boolean(session)&&user.role!=='izleyici'&&!busy;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),6000)}
async function api(path,method='GET',body){
  const current=await client.auth.getSession();session=current.data.session;
  if(!session)throw new Error('Oturum sona erdi. Yeniden giriş yapın.');
  const res=await fetch(API+path,{method,headers:{Authorization:'Bearer '+session.access_token,apikey:config.publishableKey,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const data=await res.json();
  if(!res.ok){if(res.status===401)showLogin();throw new Error(data.error||'İşlem başarısız');}return data;
}
async function load(){
  const current=++loadVersion;
  const [list,settings]=await Promise.all([api('/isler'),api('/settings')]);
  if(current!==loadVersion||!session)return;
  tasks=list;auto=settings;render();
}
async function save(task,method=task.id?'PUT':'POST'){
  return api('/isler'+(method==='POST'?'':'/'+task.id),method,task);
}
function applyPermissions(){
  const readOnly=!canWrite();
  ['new','import','clearDone'].forEach(id=>$('#'+id).disabled=readOnly);
  ['a-late','a-done'].forEach(id=>$('#'+id).disabled=busy||user.role!=='yonetici');
  document.querySelectorAll('[data-a=next],[data-a=tm],[data-a=del],[data-a=sub],[data-a=st],.sa').forEach(el=>el.disabled=readOnly);
  document.querySelectorAll('.card').forEach(el=>el.draggable=!readOnly);
  $('#refresh').disabled=busy;$('#logout').disabled=busy;
}
async function mutate(fn,message){
  if(!canWrite()){toast('Bu işlem için düzenleme yetkisi gerekli');return false}
  busy=true;applyPermissions();
  try{await fn();try{await load()}catch{toast('Kayıt sunucuya işlendi, liste yenilenemedi. Yenile düğmesini kullanın.');return true}if(message)toast(message);return true}
  catch(e){toast(e.name==='TimeoutError'?'Sunucu yanıt vermedi. Tekrar denemeden önce Yenile ile kaydı kontrol edin.':e.message||'Sunucuya ulaşılamadı');try{await load()}catch{}return false}
  finally{busy=false;applyPermissions()}
}
function stopped(t){return {...t,time:secs(t),ts:0}}
function filtered(){
  const q=$('#q').value.toLowerCase(),p=$('#fp').value,pr=$('#fproj').value,ro=$('#role').value,s=$('#sort').value,w={yuksek:0,orta:1,dusuk:2};
  let r=tasks.filter(t=>(!q||[t.title,t.desc,t.who,t.proj,...t.tags,...t.helpers].join(' ').toLowerCase().includes(q))&&(!p||t.pri===p)&&(!pr||t.proj===pr)
    &&(!ro||(ro==='me'?t.who===me:ro==='help'?t.helpers.includes(me):t.creator===me)));
  if(sf==='late')r=r.filter(late);else if(sf)r=r.filter(t=>t.status===sf);
  return r.sort((x,y)=>s==='pri'?w[x.pri]-w[y.pri]:s==='new'?y.created-x.created:(x.due||'9')<(y.due||'9')?-1:1)}
function card(t){
  const nx={yapilacak:'Başla',devam:'Bitir',bitti:'Yeniden aç'}[t.status],p=pct(t);
  return `<div class="card p-${t.pri} ${t.status==='bitti'?'done':''}" draggable="true" data-id="${t.id}">
  <div class="t">${esc(t.title)}${t.rec?' ↻':''}</div>${t.desc?`<div class="d">${esc(t.desc)}</div>`:''}
  <div class="meta">${t.proj?`<span class="tag" data-a="q" data-v="${esc(t.proj)}">${esc(t.proj)}</span>`:''}${t.tags.map(g=>`<span class="tag" data-a="q" data-v="${esc(g)}">#${esc(g)}</span>`).join('')}
  <span class="${late(t)?'late':''}">${fmt(t.due)}${late(t)?' (gecikti)':''}</span><span>· ${esc(t.who)||'Atanmadı'}${t.helpers.length?' +'+t.helpers.length:''}</span></div>
  ${t.subs.length?`<div class="prog"><i style="width:${p}%"></i></div><div class="meta">%${p}</div>`:''}
  ${t.subs.map((s,i)=>`<label class="sb"><input type="checkbox" data-a="sub" data-id="${t.id}" data-i="${i}" ${s.d?'checked':''}>${esc(s.t)}</label>`).join('')}
  <input class="sa" data-id="${t.id}" placeholder="Alt görev ekle (Enter)">
  <div class="act"><button data-a="next" data-id="${t.id}">${nx}</button><button data-a="tm" data-id="${t.id}"><span data-tm="${t.id}">${t.ts?'⏸ ':'▶ '}${fmtT(secs(t))}</span></button>
  <button data-a="edit" data-id="${t.id}">Düzenle</button><button class="dng sp" data-a="del" data-id="${t.id}">Sil</button></div></div>`}
function cal(r){
  const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+cm);const y=d.getFullYear(),m=d.getMonth(),off=(d.getDay()+6)%7,n=new Date(y,m+1,0).getDate();
  let h=`<div class="cn"><button data-a="cp">‹</button><b>${d.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</b><button data-a="cn">›</button></div><div class="cal">`+['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(x=>`<div class="ch">${x}</div>`).join('');
  for(let i=0;i<off;i++)h+='<div class="cd o"></div>';
  for(let k=1;k<=n;k++){const key=`${y}-${String(m+1).padStart(2,'0')}-${String(k).padStart(2,'0')}`;
    h+=`<div class="cd${key===today()?' td':''}"><i>${k}</i>`+r.filter(t=>t.due===key).map(t=>`<div class="chip p-${t.pri}" data-a="edit" data-id="${t.id}">${esc(t.title)}</div>`).join('')+'</div>'}
  return h+'</div>'}
function gantt(r){
  const b=new Date();b.setHours(0,0,0,0);b.setDate(b.getDate()-((b.getDay()+6)%7)+gw*7);const D=28,dd=s=>Math.round((new Date(s+'T00:00')-b)/864e5);
  const rows=r.filter(t=>t.due||t.start);
  return `<div class="cn"><button data-a="gp">‹</button><b>${fmt(iso(b))} – ${fmt(iso(addD(b,D-1)))}</b><button data-a="gn">›</button></div><div class="gt">`+(rows.map(t=>{
    const e=dd(t.due||t.start),s=Math.min(dd(t.start||t.due),e),l=Math.max(s,0),rr=Math.min(e,D-1);
    return `<div class="gr"><span class="gl">${esc(t.title)}</span><div class="gb">${rr>=l?`<div class="bar2 p-${t.pri}${t.status==='bitti'?' dn':''}" style="left:${l/D*100}%;width:${(rr-l+1)/D*100}%" data-a="edit" data-id="${t.id}" title="${fmt(t.start||t.due)} – ${fmt(t.due||t.start)}"></div>`:''}</div></div>`}).join('')||'<div class="empty">Tarihli iş yok.</div>')+'</div>'}
function render(){
  const c=k=>tasks.filter(t=>t.status===k).length,l=tasks.filter(late).length;
  $('#stats').innerHTML=[['','Tümü',tasks.length],['yapilacak','Yapılacak',c('yapilacak')],['devam','Devam ediyor',c('devam')],['bitti','Tamamlandı',c('bitti')],['late','Geciken',l]]
    .map(([k,n,v])=>`<button class="st" data-a="stat" data-v="${k}" style="${sf===k?'border-color:var(--ac)':''}"><b${k==='late'&&v?' class="late"':''}>${v}</b><span>${n}</span></button>`).join('');
  const pv=$('#fproj').value;$('#fproj').innerHTML='<option value="">Tüm projeler</option>'+[...new Set(tasks.map(t=>t.proj).filter(Boolean))].sort().map(x=>`<option${x===pv?' selected':''}>${esc(x)}</option>`).join('');
  $('#me').textContent='Ben: '+me+' · '+({yonetici:'Yönetici',calisan:'Çalışan',izleyici:'İzleyici'}[user.role]||'');$('#a-late').checked=auto.late;$('#a-done').checked=auto.done;
  ['board','list','cal','gantt'].forEach(v=>$('#v-'+v).classList.toggle('on',view===v));
  const r=filtered(),V=$('#view');
  if(view==='board')V.innerHTML='<div class="board">'+Object.keys(ST).map(k=>{const L=r.filter(t=>t.status===k);return `<div class="col" data-col="${k}"><h2><span>${ST[k]}</span><span>${L.length}</span></h2>${L.map(card).join('')||'<div class="empty">Bu sütun boş</div>'}</div>`}).join('')+'</div>';
  else if(view==='cal')V.innerHTML=cal(r);else if(view==='gantt')V.innerHTML=gantt(r);
  else V.innerHTML=r.length?`<table><thead><tr><th>İş</th><th>Proje</th><th>Sorumlu</th><th>Bitiş</th><th>Öncelik</th><th>İlerleme</th><th>Süre</th><th>Durum</th><th></th></tr></thead><tbody>${r.map(t=>`<tr><td>${esc(t.title)}</td><td>${esc(t.proj)||'-'}</td><td>${esc(t.who)||'-'}</td><td class="${late(t)?'late':''}">${fmt(t.due)}</td><td>${PR[t.pri]}</td><td>%${pct(t)}</td><td>${fmtT(secs(t))}</td>
    <td><select data-a="st" data-id="${t.id}">${Object.entries(ST).map(([k,v])=>`<option value="${k}"${k===t.status?' selected':''}>${v}</option>`).join('')}</select></td>
    <td><button data-a="edit" data-id="${t.id}">Düzenle</button> <button class="dng" data-a="del" data-id="${t.id}">Sil</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Eşleşen iş yok. Filtreleri temizleyin veya yeni iş ekleyin.</div>'; applyPermissions()}
function openD(id){
  editId=id||null;const t=tasks.find(x=>x.id===id)||{title:'',desc:'',who:me,helpers:[],start:'',due:'',pri:'orta',status:'yapilacak',proj:'',tags:[],rec:''};
  $('#dt').textContent=id?'İşi düzenle':'Yeni iş';
  $('#ft').value=t.title;$('#fd').value=t.desc;$('#fw').value=t.who;$('#fh').value=t.helpers.join(', ');$('#fst').value=t.start;$('#fdue').value=t.due;
  $('#fpri').value=t.pri;$('#fs').value=t.status;$('#fpr').value=t.proj;$('#ftg').value=t.tags.join(', ');$('#frec').value=t.rec;$('#dlg').showModal();$('#f').querySelectorAll('input,textarea,select,button[type=submit]').forEach(el=>el.disabled=!canWrite());$('#ft').focus()}

async function setStatus(id,status){
  const t=tasks.find(x=>x.id==id);if(!t||t.status===status)return;
  await mutate(()=>save({...stopped(t),status}),status==='bitti'?'Tamamlandı. Etkin bildirimler gönderim kuyruğuna alındı.':'Durum: '+ST[status]);
}
$('#f').addEventListener('submit',async e=>{
  e.preventDefault();
  const current=tasks.find(x=>x.id===editId);
  const o={...(current||{subs:[],time:0,ts:0}),title:$('#ft').value.trim(),desc:$('#fd').value.trim(),who:$('#fw').value.trim(),helpers:csv($('#fh').value),start:$('#fst').value,due:$('#fdue').value,pri:$('#fpri').value,status:$('#fs').value,proj:$('#fpr').value.trim(),tags:csv($('#ftg').value),rec:$('#frec').value};
  if(!o.title)return;
  if(o.start&&o.due&&o.start>o.due)return toast('Bitiş başlangıçtan önce olamaz');
  const submit=$('#f button[type=submit]');submit.disabled=true;
  try{if(await mutate(()=>save(o.status==='bitti'?stopped(o):o),current?'İş güncellendi':'İş eklendi'))$('#dlg').close()}
  finally{submit.disabled=!canWrite()}
});
$('#cancel').onclick=()=>$('#dlg').close();$('#new').onclick=()=>{if(canWrite())openD()};
['board','list','cal','gantt'].forEach(v=>$('#v-'+v).onclick=()=>{view=v;render()});
['q','fp','fproj','role','sort'].forEach(i=>$('#'+i).addEventListener('input',render));
for(const kind of ['late','done'])$('#a-'+kind).onchange=async e=>{
  const enabled=e.target.checked;
  if(user.role!=='yonetici'){render();return}
  await mutate(()=>api('/settings','PUT',{...auto,[kind]:enabled}),'Otomasyon ayarı kaydedildi');
  if(kind==='done'&&enabled&&!user.smtpConfigured)toast('Bildirim kuyruğu açık. E-posta gönderimi için SMTP yapılandırması bekleniyor.');
};
$('#me').onclick=()=>toast(me+' · '+({yonetici:'Yönetici',calisan:'Çalışan',izleyici:'İzleyici'}[user.role]));
$('#view').addEventListener('click',async e=>{
  const b=e.target.closest('[data-a]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;
  const a=b.dataset.a,id=+b.dataset.id,t=tasks.find(x=>x.id===id);
  if(a==='q'){$('#q').value=b.dataset.v;render()}
  else if(a==='edit')openD(id);
  else if(a==='next')await setStatus(id,{yapilacak:'devam',devam:'bitti',bitti:'yapilacak'}[t.status]);
  else if(a==='tm')await mutate(()=>save(t.ts?stopped(t):{...t,ts:Date.now(),status:t.status==='bitti'?'devam':t.status==='yapilacak'?'devam':t.status}));
  else if(a==='del'&&confirm('"'+t.title+'" silinsin mi?'))await mutate(()=>save(t,'DELETE'),'İş silindi');
  else if(a==='cp'){cm--;render()}else if(a==='cn'){cm++;render()}else if(a==='gp'){gw--;render()}else if(a==='gn'){gw++;render()}
});
$('#stats').addEventListener('click',e=>{const b=e.target.closest('[data-a=stat]');if(b){sf=sf===b.dataset.v?'':b.dataset.v;render()}});
$('#view').addEventListener('change',async e=>{
  const el=e.target,t=tasks.find(x=>x.id==el.dataset.id);if(!t)return;
  if(el.dataset.a==='st')await setStatus(t.id,el.value);
  else if(el.dataset.a==='sub')await mutate(()=>save({...t,subs:t.subs.map((s,i)=>i===+el.dataset.i?{...s,d:el.checked}:s)}));
});
$('#view').addEventListener('keydown',async e=>{
  if(e.key==='Enter'&&e.target.classList.contains('sa')){
    e.preventDefault();const v=e.target.value.trim(),t=tasks.find(x=>x.id==e.target.dataset.id);
    if(v&&t)await mutate(()=>save({...t,subs:[...t.subs,{t:v,d:false}]}));
  }
});
let drag=null;const V=$('#view');
V.addEventListener('dragstart',e=>{if(!canWrite()){e.preventDefault();return}const c=e.target.closest('.card');if(c){drag=c.dataset.id;e.dataTransfer.setData('text/plain',drag)}});
V.addEventListener('dragover',e=>{const c=e.target.closest('.col');if(c&&canWrite()){e.preventDefault();c.classList.add('over')}});
V.addEventListener('dragleave',e=>{const c=e.target.closest('.col');if(c)c.classList.remove('over')});
V.addEventListener('drop',async e=>{const c=e.target.closest('.col');if(c&&canWrite()){e.preventDefault();c.classList.remove('over');if(drag)await setStatus(drag,c.dataset.col);drag=null}});
$('#clearDone').onclick=async()=>{
  const completed=tasks.filter(t=>t.status==='bitti');if(!completed.length)return toast('Tamamlanan iş yok');
  if(confirm(completed.length+' tamamlanan iş silinsin mi?'))await mutate(async()=>{for(const t of completed)await save(t,'DELETE')},'Tamamlanan işler temizlendi');
};
$('#theme').onclick=()=>{const r=document.documentElement,d=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;r.dataset.theme=d?'light':'dark'};
$('#export').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(tasks,null,2)],{type:'application/json'}));a.href=url;a.download='isler.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Dışa aktarıldı')};
$('#import').onclick=()=>{if(canWrite())$('#file').click()};
$('#file').onchange=async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{
    if(file.size>1024*1024)throw new Error('Dosya en fazla 1 MB olabilir');
    const raw=JSON.parse(await file.text()),list=Array.isArray(raw)?raw:raw.tasks;
    if(!Array.isArray(list)||!list.length||list.length>100)throw new Error('1–100 iş içeren JSON dosyası gerekli');
    const imported=list.map(t=>{
      if(!t||typeof t.title!=='string'||!t.title.trim())throw new Error('Dosyada geçersiz iş var');
      return {title:t.title,desc:t.desc||'',who:t.who||'',helpers:t.helpers||[],start:t.start||'',due:t.due||'',pri:t.pri||'orta',status:t.status||'yapilacak',proj:t.proj||'',tags:t.tags||[],subs:t.subs||[],rec:t.rec||'',time:t.time||0,ts:0};
    });
    if(!confirm(imported.length+' iş yeni kayıt olarak eklenecek. Devam edilsin mi?'))return;
    await mutate(()=>api('/import','POST',imported),'İçe aktarıldı');
  }catch(e){toast(e.message||'Geçersiz dosya')}
};
function showLogin(){
  loadVersion++;
  session=null;tasks=[];user={};me='';$('#view').replaceChildren();$('#stats').replaceChildren();
  $('#toast').classList.remove('show');
  $('#workspace').hidden=true;$('#workspace-header').hidden=true;$('#login').hidden=false;
  if($('#dlg').open)$('#dlg').close();
}
async function start(){
  user=await api('/me');me=user.name;
  $('#mail-status').textContent=user.smtpConfigured?'':'E-posta gönderimi sonraki aşamada etkinleştirilecek.';
  await load();
  $('#workspace').hidden=false;$('#workspace-header').hidden=false;$('#login').hidden=true;
  const people=await api('/users');$('#people').innerHTML=people.map(x=>'<option value="'+esc(x.name)+'">').join('');
}
$('#login-form').onsubmit=async e=>{
  e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;$('#login-error').textContent='';
  try{const result=await signIn(client,$('#username').value,$('#password').value);if(result.error)throw new Error('Kullanıcı adı veya parola hatalı');session=result.data.session;await start()}
  catch(e){$('#login-error').textContent=e.message||'Giriş yapılamadı'}
  finally{button.disabled=false;$('#password').value=''}
};
$('#logout').onclick=async()=>{try{await signOut(client);showLogin()}catch{toast('Çıkış yapılamadı. Tekrar deneyin.')}};
$('#refresh').onclick=async()=>{try{await load();toast('İşler yenilendi')}catch(e){toast(e.message||'İşler yüklenemedi')}};
client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')showLogin()});
setInterval(()=>document.querySelectorAll('[data-tm]').forEach(s=>{const t=tasks.find(x=>x.id==s.dataset.tm);if(t)s.textContent=(t.ts?'⏸ ':'▶ ')+fmtT(secs(t))}),1000);
setInterval(async()=>{if(session&&!busy&&!$('#dlg').open&&!document.hidden&&!document.activeElement?.classList.contains('sa'))try{await load();syncFailed=false}catch{if(!syncFailed)toast('İşler yenilenemedi. Bağlantıyı kontrol edip Yenile düğmesini kullanın.');syncFailed=true}},30000);
try{session=await requireSession(client);if(session)await start();else showLogin()}
catch(e){showLogin();$('#login-error').textContent=e.message||'Oturum kontrol edilemedi';toast('İşler yüklenemedi. Yeniden giriş yapın.')}
