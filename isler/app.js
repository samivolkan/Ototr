import {createClient} from '../task-merkezi-v2/js/vendor/supabase.js';
const $=s=>document.querySelector(s),config=window.OTOTR_SUPABASE_CONFIG;
// Only the login session lives in sessionStorage. Business data never lives in browser storage.
const client=createClient(config.url,config.publishableKey,{auth:{storage:sessionStorage,storageKey:'ototr-isler24-session'}});
const API=config.islerApi||config.url+'/functions/v1/isler-api/api';
const ST={yapilacak:'Yapılacak',devam:'Devam ediyor',bitti:'Tamamlandı'},PR={yuksek:'Yüksek',orta:'Orta',dusuk:'Düşük'};
let saved=[],filterVersion=1,sel=new Set(),tasks=[],users=[],me='',user={},auto={late:false,done:false,version:1},view='board',sf='',editId=null,cm=0,gw=0,pid=null,busy=false,session=null,drag=null,epoch=Date.now(),tick=performance.now(),loading=false,syncFailed=false;
const serverNow=()=>epoch+performance.now()-tick;
const person=id=>users.find(u=>u.id===id)?.name||id||'';
const editable=t=>Boolean(session)&&user.role!=='izleyici'&&(!t||user.role==='yonetici'||t.creator===me||t.who===me||t.helpers.includes(me));
const V=$('#view'),setV=v=>{view=v;render()},dt=x=>new Date(x).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('u');t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),6000)}
async function api(path,method='GET',body){
 const current=await client.auth.getSession();session=current.data.session;
 if(!session)throw new Error('Oturum sona erdi. Yeniden giriş yapın.');
 const res=await fetch(API+path,{method,credentials:'omit',cache:'no-store',headers:{Authorization:'Bearer '+session.access_token,apikey:config.publishableKey,'Content-Type':'application/json','X-Kokpit-Request':'1'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await res.json();if(!res.ok){if(res.status===401)showLogin();throw new Error(data.error||'İşlem başarısız')}return data;
}
async function load(){
 if(loading){await loading;return load()}
 loading=(async()=>{
  const [list,settings,filters,identity,team]=await Promise.all([api('/isler'),api('/settings'),api('/filtreler'),api('/me'),api('/users')]);
  if(!session)return;tasks=list;auto=settings;saved=filters.data;filterVersion=filters.version;user=identity;me=user.id;users=team;epoch=user.serverTime;tick=performance.now();render();
 })();try{await loading}finally{loading=false}
}
const clean=t=>Object.fromEntries(['title','desc','who','helpers','start','due','pri','status','proj','tags','subs','rec','time','ts','ord','version'].filter(k=>t[k]!==undefined).map(k=>[k,t[k]]));
async function save(task){return api('/isler'+(task.id?'/'+task.id:''),task.id?'PUT':'POST',clean(task))}
function permissions(){
 ['new','import','clearDone','quick'].forEach(id=>$('#'+id).disabled=busy||!editable());
 $('#a-late').disabled=busy||user.role!=='yonetici';$('#a-done').disabled=busy||user.role!=='yonetici'||!user.smtpConfigured;
 $('#a-done').title=user.smtpConfigured?'':'E-posta gönderimi henüz etkinleştirilmedi';
 document.querySelectorAll('[data-id]').forEach(el=>{const t=tasks.find(t=>t.id===+el.dataset.id);if(!t)return;
  if(el.matches('button,input,select'))el.disabled=busy||(!editable(t)&&el.dataset.a!=='selc');if(el.classList.contains('card'))el.draggable=!busy&&editable(t);
 });
 if(pid)document.querySelectorAll('#pb input,#pb select,#pb button').forEach(el=>el.disabled=busy||!editable(tasks.find(t=>t.id===pid)));
 ['bst','bpr','bwho','bdel'].forEach(id=>$('#'+id).disabled=busy||![...sel].every(id=>editable(tasks.find(t=>t.id===id))));
 $('#refresh').disabled=busy;$('#logout').disabled=busy;
 const current=$('#bwho').value;$('#bwho').innerHTML='<option value="">Sorumlu ata…</option>'+users.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');$('#bwho').value=current;
}
function render(){renderContent();permissions()}
async function mutate(fn,message,{personal=false}={}){
 if(busy)return false;if(!personal&&!editable()){toast('Bu işlem için düzenleme yetkisi gerekli');return false}
 busy=true;permissions();
 try{const result=await fn();await load();if(message)toast(message);return result??true}
 catch(e){toast(e.name==='TimeoutError'?'Sunucu yanıt vermedi. Yenile ile kaydı kontrol edin.':e.message||'Bağlantı kurulamadı');try{await load()}catch{}return false}
 finally{busy=false;permissions()}
}

function openD(id){
 const t=tasks.find(x=>x.id===id)||{title:'',desc:'',who:me,helpers:[],start:'',due:'',pri:'orta',status:'yapilacak',proj:'',tags:[],rec:''};
 if(!editable(id?t:null))return toast('Bu işi düzenleme yetkiniz yok');editId=id||null;
 $('#dt').textContent=id?'İşi düzenle':'Yeni iş';
 $('#fw').innerHTML='<option value="">Atanmadı</option>'+users.map(u=>`<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
 $('#fh').innerHTML=users.map(u=>`<option value="${esc(u.id)}"${t.helpers.includes(u.id)?' selected':''}>${esc(u.name)}</option>`).join('');
 for(const [id,key] of Object.entries({ft:'title',fd:'desc',fw:'who',fst:'start',fdue:'due',fpri:'pri',fs:'status',fpr:'proj',frec:'rec'}))$('#'+id).value=t[key];
 $('#ftg').value=t.tags.join(', ');$('#dlg').showModal();$('#ft').focus();
}
async function openP(id){pid=id;renderP();permissions();$('#panel').classList.add('open');$('#scrim').classList.add('open');try{const log=await api('/isler/'+id+'/gecmis');if(pid===id){const t=tasks.find(t=>t.id===id);if(t)t.log=log}}catch(e){toast(e.message)}}
function closeP(){pid=null;$('#panel').classList.remove('open');$('#scrim').classList.remove('open')}
async function setStatus(id,status){const t=tasks.find(x=>x.id==id);if(t&&t.status!==status)await mutate(()=>save({...t,status}),'Durum güncellendi')}
function toggleT(t){return mutate(()=>api('/isler/'+t.id+'/sayac','POST',{version:t.version,action:t.ts?'stop':'start'}),t.ts?'Sayaç durdu':'Sayaç başladı')}
function occ(t,key){const d=new Date(t.due+'T00:00'),k=new Date(key+'T00:00');return t.rec==='gun'||(t.rec==='hafta'&&Math.round((k-d)/864e5)%7===0)||(t.rec==='ay'&&Math.min(d.getDate(),new Date(k.getFullYear(),k.getMonth()+1,0).getDate())===k.getDate())}
async function reorder(id,tid,col){const t=tasks.find(x=>x.id==id);if(!t||!editable(t))return;$('#sort').value='man';await mutate(()=>api('/isler/'+id+'/sirala','POST',{version:t.version,before:tid,status:col}),'Sıralama kaydedildi')}
const selection=ids=>ids.map(id=>{const t=tasks.find(t=>t.id===id);return {id,version:t?.version}});
async function delT(ids){
 if(!ids.length)return;const result=await mutate(()=>api('/isler/toplu','POST',{items:selection(ids),action:'delete'}));
 if(result){sel.clear();render();toastU(ids.length+' iş silindi',()=>mutate(()=>api('/isler/toplu','POST',{items:result.map(t=>({id:t.id,version:t.version})),action:'restore'}),'Geri alındı'));
  clearTimeout(toast.h);toast.h=setTimeout(()=>$('#toast').classList.remove('show','u'),Math.max(0,Math.min(...result.map(t=>t.undoUntil))-serverNow()));}
}
async function saveF(){const n=await ask('Filtre adı');if(!n)return;await mutate(()=>api('/filtreler','PUT',{version:filterVersion,data:[...saved,{n,q:$('#q').value,role:$('#role').value,proj:$('#fproj').value,pri:$('#fp').value,sort:$('#sort').value,sf}]}),'Filtre kaydedildi',{personal:true})}
function dl(name,text){const blob=new Blob([text],{type:name.endsWith('.csv')?'text/csv;charset=utf-8':'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Dışa aktarıldı')}
function expCsv(){const q=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';const rows=[['Başlık','Açıklama','Durum','Öncelik','Sorumlu','Yardımcılar','Başlangıç','Bitiş','Proje','Etiketler','İlerleme %','Süre'],...tasks.map(t=>[t.title,t.desc,ST[t.status],PR[t.pri],person(t.who),t.helpers.map(person).join('; '),t.start,t.due,t.proj,t.tags.join('; '),pct(t),fmtT(secs(t))])];dl('isler.csv','\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n'))}
$('#f').addEventListener('submit',async e=>{
 e.preventDefault();const old=tasks.find(x=>x.id===editId);if(editId&&!old)return toast('İş silinmiş. Listeyi yenileyin.');
 const o={...(old||{subs:[],time:0,ts:0}),title:$('#ft').value.trim(),desc:$('#fd').value.trim(),who:$('#fw').value,helpers:[...$('#fh').selectedOptions].map(o=>o.value),start:$('#fst').value,due:$('#fdue').value,pri:$('#fpri').value,status:$('#fs').value,proj:$('#fpr').value.trim(),tags:csv($('#ftg').value),rec:$('#frec').value};
 const button=$('#f button[type=submit]');button.disabled=true;try{if(await mutate(()=>save(o),'İş kaydedildi'))$('#dlg').close()}finally{button.disabled=false}
});
$('#cancel').onclick=()=>$('#dlg').close();$('#new').onclick=()=>openD();
['board','list','cal','gantt'].forEach(v=>$('#v-'+v).onclick=()=>setV(v));
['q','fp','fproj','role','sort'].forEach(i=>$('#'+i).addEventListener('input',render));
['late','done'].forEach(key=>$('#a-'+key).onchange=e=>mutate(()=>api('/settings','PUT',{...auto,[key]:e.target.checked}),'Ayarlar kaydedildi'));
$('#side').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.role!==undefined){$('#role').value=b.dataset.role;render()}
 else if(b.dataset.proj!==undefined){$('#fproj').value=b.dataset.proj;render()}
 else if(b.dataset.sf!==undefined){const i=+b.dataset.sf;if(e.target.dataset.sfd!==undefined){await mutate(()=>api('/filtreler','PUT',{version:filterVersion,data:saved.filter((_,j)=>j!==i)}),'Filtre silindi',{personal:true});return}
  const f=saved[i];$('#q').value=f.q;$('#role').value=f.role;$('#fproj').value=f.proj;$('#fp').value=f.pri;$('#sort').value=f.sort;sf=f.sf;render();}
});
$('#savef').onclick=saveF;
V.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b){const c=e.target.closest('.card');if(c&&!e.target.closest('input,select,label'))openP(+c.dataset.id);return}if(b.matches('select,input'))return;
 const a=b.dataset.a,id=+b.dataset.id,t=tasks.find(x=>x.id===id);
 if(a==='q'){$('#q').value=b.dataset.v;render()}else if(a==='edit')openD(id);else if(a==='next')setStatus(id,{yapilacak:'devam',devam:'bitti',bitti:'yapilacak'}[t.status]);else if(a==='tm')toggleT(t);else if(a==='del')delT([id]);else if(a==='cp'){cm--;render()}else if(a==='cn'){cm++;render()}else if(a==='gp'){gw--;render()}else if(a==='gn'){gw++;render()}
});
$('#stats').onclick=e=>{const b=e.target.closest('[data-a=stat]');if(b){sf=sf===b.dataset.v?'':b.dataset.v;render()}};
V.addEventListener('change',e=>{const el=e.target,t=tasks.find(x=>x.id==el.dataset.id);
 if(el.dataset.a==='selc'){el.checked?sel.add(t.id):sel.delete(t.id);renderBulk();permissions()}
 else if(el.dataset.a==='st')setStatus(t.id,el.value);
 else if(el.dataset.a==='sub')mutate(()=>save({...t,subs:t.subs.map((s,i)=>i===+el.dataset.i?{...s,d:el.checked}:s)}));
});
V.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('sa')){const text=e.target.value.trim(),t=tasks.find(x=>x.id==e.target.dataset.id);if(text)mutate(()=>save({...t,subs:[...t.subs,{t:text,d:false}]}))}});
V.addEventListener('dragstart',e=>{const c=e.target.closest('.card');if(c){drag=c.dataset.id;e.dataTransfer.setData('text/plain',drag)}});
V.addEventListener('dragover',e=>{const c=e.target.closest('.col');if(c){e.preventDefault();c.classList.add('over')}});
V.addEventListener('dragleave',e=>e.target.closest('.col')?.classList.remove('over'));
V.addEventListener('drop',e=>{const c=e.target.closest('.col');if(c){e.preventDefault();c.classList.remove('over');if(drag){const tg=e.target.closest('.card');if(tg&&tg.dataset.id!=drag)reorder(drag,+tg.dataset.id,c.dataset.col);else setStatus(drag,c.dataset.col);drag=null}}});
$('#pclose').onclick=closeP;$('#scrim').onclick=closeP;
$('#pb').addEventListener('change',e=>{const t=tasks.find(x=>x.id===pid),el=e.target;if(!t)return;if(el.dataset.p==='st')setStatus(pid,el.value);else if(el.dataset.p==='sub')mutate(()=>save({...t,subs:t.subs.map((s,i)=>i===+el.dataset.i?{...s,d:el.checked}:s)}))});
$('#pb').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.p==='cm'){const m=e.target.value.trim(),t=tasks.find(x=>x.id===pid);if(m&&t)mutate(()=>api('/isler/'+t.id+'/yorum','POST',{m,version:t.version}),'Yorum kaydedildi')}});
$('#pb').addEventListener('click',e=>{const b=e.target.closest('button[data-p]'),t=tasks.find(x=>x.id===pid);if(!b||!t)return;if(b.dataset.p==='edit'){closeP();openD(t.id)}else if(b.dataset.p==='del'){closeP();delT([t.id])}else if(b.dataset.p==='tm')toggleT(t)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&pid&&!$('#dlg').open)closeP()});
for(const [id,action] of Object.entries({bst:'status',bpr:'pri',bwho:'who'}))$('#'+id).onchange=async e=>{const value=e.target.value;e.target.value='';if(value)await mutate(()=>api('/isler/toplu','POST',{items:selection([...sel]),action,value}),'Seçili işler güncellendi')};
$('#bdel').onclick=()=>delT([...sel]);$('#bclr').onclick=()=>{sel.clear();render()};
$('#clearDone').onclick=()=>delT(tasks.filter(t=>t.status==='bitti'&&editable(t)).map(t=>t.id));
$('#theme').onclick=()=>{const r=document.documentElement,d=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;r.dataset.theme=d?'light':'dark'};
$('#export').onclick=()=>dl('isler.json',JSON.stringify({tasks,auto,saved},null,2));$('#csv').onclick=expCsv;$('#import').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>1048576)return toast('Dosya en fazla 1 MB olmalı');
 try{const data=JSON.parse(await file.text()),list=Array.isArray(data)?data:data.tasks;if(!Array.isArray(list))throw new Error('JSON iş listesi içermeli');
  const result=await mutate(()=>api('/import','POST',list.map(t=>({desc:'',who:'',helpers:[],start:'',due:'',pri:'orta',status:'yapilacak',proj:'',tags:[],subs:[],rec:'',time:0,ts:0,...t}))),'İşler içe aktarıldı');
  if(result&&Array.isArray(data.saved))await mutate(()=>api('/filtreler','PUT',{version:filterVersion,data:[...saved,...data.saved]}),'İşler ve filtreler içe aktarıldı',{personal:true});
  if(result&&data.auto&&user.role==='yonetici')await mutate(()=>api('/settings','PUT',{version:auto.version,late:Boolean(data.auto.late),done:user.smtpConfigured&&Boolean(data.auto.done)}),'Aktarım tamamlandı');
 }catch(e){toast(e.message||'Geçersiz dosya')}
};
$('#quick').addEventListener('keydown',async e=>{
 if(e.key!=='Enter'||busy)return;const s=e.target.value.trim();if(!s)return;
 const o={title:'',desc:'',who:me,helpers:[],start:'',due:'',pri:'orta',status:'yapilacak',proj:'',tags:[],rec:'',subs:[],time:0,ts:0},words=[];
 for(const x of s.split(/\s+/)){const l=x.toLocaleLowerCase('tr-TR');if(x[0]==='#'&&x.length>1)o.tags.push(x.slice(1));else if(x[0]==='@'&&x.length>1){const found=users.filter(u=>u.name.toLocaleLowerCase('tr-TR').startsWith(l.slice(1)));if(found.length!==1)return toast('Kişi adı tek bir kayıtlı kullanıcıyla eşleşmeli');o.who=found[0].id}else if(x[0]==='!')o.pri={y:'yuksek',o:'orta',d:'dusuk'}[l[1]]||'orta';else if(l==='bugün')o.due=today();else if(l==='yarın')o.due=iso(addD(new Date(),1));else if(l==='haftaya')o.due=iso(addD(new Date(),7));else if(/^\d{4}-\d\d-\d\d$/.test(x))o.due=x;else words.push(x)}
 o.title=words.join(' ');if(!o.title)return toast('Başlık yazın');if(await mutate(()=>save(o),'İş eklendi'))e.target.value='';
});
function showLogin(){session=null;tasks=[];users=[];saved=[];sel.clear();closeP();document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('.app').hidden=true;$('#login').hidden=false;$('#view').replaceChildren();$('#pb').replaceChildren();$('#bulk').classList.remove('show')}
async function boot(){try{await load();$('.app').hidden=false;$('#login').hidden=true}catch(e){showLogin();$('#login-error').textContent=e.message}}
$('#login-form').onsubmit=async e=>{e.preventDefault();$('#signin').disabled=true;$('#login-error').textContent='';try{const {data,error}=await client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});$('#password').value='';if(error)throw new Error(error.status===429?'Çok fazla giriş denemesi. Bir süre sonra tekrar deneyin.':'Giriş başarısız. ERP hesabınızı kontrol edin.');session=data.session;await boot()}catch(e){$('#login-error').textContent=e.message}finally{$('#signin').disabled=false}};
$('#logout').onclick=async()=>{await client.auth.signOut();showLogin()};
$('#refresh').onclick=()=>load().catch(e=>toast(e.message));
client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')showLogin()});
setInterval(()=>document.querySelectorAll('[data-tm]').forEach(el=>{const t=tasks.find(t=>t.id===+el.dataset.tm);if(t)el.textContent=(t.ts?'⏸ ':'▶ ')+fmtT(secs(t))}),1000);
setInterval(async()=>{if(!session||busy||loading||document.hidden||document.querySelector('dialog[open]')||document.activeElement?.matches('#pb input,.sa'))return;try{await load();syncFailed=false}catch(e){if(!syncFailed)toast('Ortak pano güncellenemedi: '+e.message);syncFailed=true}},15000);
addEventListener('offline',()=>toast('Çevrimdışısınız. Bağlantı kurulana kadar değişiklikler kaydedilemez.'));
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10),today=()=>iso(new Date());
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csv=s=>s.split(',').map(x=>x.trim()).filter(Boolean);
const fmt=d=>d?new Date(d+'T00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'short'}):'Tarih yok';
const fmtT=s=>{s=Math.floor(s);return[s/3600|0,(s/60|0)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':')};
const late=t=>t.due&&t.status!=='bitti'&&t.due<today();
const secs=t=>(t.time||0)+(t.ts?Math.max(0,(serverNow()-t.ts)/1000):0);
const pct=t=>t.subs.length?Math.round(t.subs.filter(s=>s.d).length/t.subs.length*100):0;

function filtered(){
  const q=$('#q').value.toLowerCase(),p=$('#fp').value,pr=$('#fproj').value,ro=$('#role').value,s=$('#sort').value,w={yuksek:0,orta:1,dusuk:2};
  let r=tasks.filter(t=>(!q||[t.title,t.desc,person(t.who),t.proj,...t.tags,...t.helpers.map(person)].join(' ').toLowerCase().includes(q))&&(!p||t.pri===p)&&(!pr||t.proj===pr)
    &&(!ro||(ro==='me'?t.who===me:ro==='help'?t.helpers.includes(me):t.creator===me)));
  if(sf==='late')r=r.filter(late);else if(sf)r=r.filter(t=>t.status===sf);
  return r.sort((x,y)=>s==='man'?(x.ord??1e9)-(y.ord??1e9):s==='pri'?w[x.pri]-w[y.pri]:s==='new'?y.created-x.created:(x.due||'9')<(y.due||'9')?-1:1)}
function card(t){
  const nx={yapilacak:'Başla',devam:'Bitir',bitti:'Yeniden aç'}[t.status],p=pct(t);
  return `<div class="card p-${t.pri} ${t.status==='bitti'?'done':''}" draggable="true" data-id="${t.id}">
  <div class="t"><input type="checkbox" class="sel" data-a="selc" data-id="${t.id}" ${sel.has(t.id)?'checked':''} title="Seç">${esc(t.title)}${t.rec?' ↻':''}</div>${t.desc?`<div class="d">${esc(t.desc)}</div>`:''}
  <div class="meta">${t.proj?`<span class="tag" data-a="q" data-v="${esc(t.proj)}">${esc(t.proj)}</span>`:''}${t.tags.map(g=>`<span class="tag" data-a="q" data-v="${esc(g)}">#${esc(g)}</span>`).join('')}
  <span class="${late(t)?'late':''}">${fmt(t.due)}${late(t)?' (gecikti)':''}</span><span>· ${esc(person(t.who))||'Atanmadı'}${t.helpers.length?' +'+t.helpers.length:''}</span></div>
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
    h+=`<div class="cd${key===today()?' td':''}"><i>${k}</i>`+r.filter(t=>t.due===key).map(t=>`<div class="chip p-${t.pri}" data-a="edit" data-id="${t.id}">${esc(t.title)}</div>`).join('')+r.filter(t=>t.rec&&t.status!=='bitti'&&t.due&&t.due<key&&occ(t,key)).map(t=>`<div class="chip ghost p-${t.pri}" data-a="edit" data-id="${t.id}">↻ ${esc(t.title)}</div>`).join('')+'</div>'}
  return h+'</div>'}
function gantt(r){
  const b=new Date();b.setHours(0,0,0,0);b.setDate(b.getDate()-((b.getDay()+6)%7)+gw*7);const D=28,dd=s=>Math.round((new Date(s+'T00:00')-b)/864e5);
  const rows=r.filter(t=>t.due||t.start);
  return `<div class="cn"><button data-a="gp">‹</button><b>${fmt(iso(b))} – ${fmt(iso(addD(b,D-1)))}</b><button data-a="gn">›</button></div><div class="gt">`+(rows.map(t=>{
    const e=dd(t.due||t.start),s=Math.min(dd(t.start||t.due),e),l=Math.max(s,0),rr=Math.min(e,D-1);
    return `<div class="gr"><span class="gl">${esc(t.title)}</span><div class="gb">${rr>=l?`<div class="bar2 p-${t.pri}${t.status==='bitti'?' dn':''}" style="left:${l/D*100}%;width:${(rr-l+1)/D*100}%" data-a="edit" data-id="${t.id}" title="${fmt(t.start||t.due)} – ${fmt(t.due||t.start)}"></div>`:''}</div></div>`}).join('')||'<div class="empty">Tarihli iş yok.</div>')+'</div>'}
const ringHtml=()=>{const n=tasks.length,p=n?Math.round(tasks.filter(t=>t.status==='bitti').length/n*100):0;return `<div class="st ringc"><div class="ring" style="--p:${p}"><b>%${p}</b></div><span>Tamamlanma<br>oranı</span></div>`};
function renderContent(){
  const c=k=>tasks.filter(t=>t.status===k).length,l=tasks.filter(late).length;
  $('#stats').innerHTML=ringHtml()+[['','Tümü',tasks.length],['yapilacak','Yapılacak',c('yapilacak')],['devam','Devam ediyor',c('devam')],['bitti','Tamamlandı',c('bitti')],['late','Geciken',l]]
    .map(([k,n,v])=>`<button class="st" data-a="stat" data-v="${k}" style="${sf===k?'border-color:var(--ac)':''}"><b${k==='late'&&v?' class="late"':''}>${v}</b><span>${n}</span></button>`).join('');
  const pv=$('#fproj').value;$('#fproj').innerHTML='<option value="">Tüm projeler</option>'+[...new Set(tasks.map(t=>t.proj).filter(Boolean))].sort().map(x=>`<option${x===pv?' selected':''}>${esc(x)}</option>`).join('');
  $('#identity').textContent=user.name+' · '+({yonetici:'Yönetici',calisan:'Çalışan',izleyici:'İzleyici'}[user.role]||'');$('#a-late').checked=auto.late;$('#a-done').checked=auto.done;
  ['board','list','cal','gantt'].forEach(v=>$('#v-'+v).classList.toggle('on',view===v));
  renderSide();renderSaved();renderBulk();if(pid)renderP();const r=filtered(),V=$('#view');
  if(view==='board')V.innerHTML='<div class="board">'+Object.keys(ST).map(k=>{const L=r.filter(t=>t.status===k);return `<div class="col" data-col="${k}"><h2><span>${ST[k]}</span><span>${L.length}</span></h2>${L.map(card).join('')||'<div class="empty">Bu sütun boş</div>'}</div>`}).join('')+'</div>';
  else if(view==='cal')V.innerHTML=cal(r);else if(view==='gantt')V.innerHTML=gantt(r);
  else V.innerHTML=r.length?`<table><thead><tr><th>İş</th><th>Proje</th><th>Sorumlu</th><th>Bitiş</th><th>Öncelik</th><th>İlerleme</th><th>Süre</th><th>Durum</th><th></th></tr></thead><tbody>${r.map(t=>`<tr><td>${esc(t.title)}</td><td>${esc(t.proj)||'-'}</td><td>${esc(person(t.who))||'-'}</td><td class="${late(t)?'late':''}">${fmt(t.due)}</td><td>${PR[t.pri]}</td><td>%${pct(t)}</td><td>${fmtT(secs(t))}</td>
    <td><select data-a="st" data-id="${t.id}">${Object.entries(ST).map(([k,v])=>`<option value="${k}"${k===t.status?' selected':''}>${v}</option>`).join('')}</select></td>
    <td><button data-a="edit" data-id="${t.id}">Düzenle</button> <button class="dng" data-a="del" data-id="${t.id}">Sil</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">Eşleşen iş yok. Filtreleri temizleyin veya yeni iş ekleyin.</div>'}

function renderSide(){const ro=$('#role').value,pr=$('#fproj').value;
 document.querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('on',b.dataset.role===ro));
 const ps=[...new Set(tasks.map(t=>t.proj).filter(Boolean))].sort();
 $('#projs').innerHTML=`<button class="nv${!pr?' on':''}" data-proj="">Tüm projeler</button>`+ps.map(p=>`<button class="nv${pr===p?' on':''}" data-proj="${esc(p)}">${esc(p)}<i>${tasks.filter(t=>t.proj===p&&t.status!=='bitti').length}</i></button>`).join('')}

function renderP(){const t=tasks.find(x=>x.id===pid);if(!t){closeP();return}
 $('#pt').textContent=t.title;const p=pct(t);
 $('#pb').innerHTML=`<div class="meta"><span class="tag">${PR[t.pri]}</span>${t.proj?`<span class="tag">${esc(t.proj)}</span>`:''}${t.tags.map(g=>`<span class="tag">#${esc(g)}</span>`).join('')}${t.rec?'<span class="tag">↻ '+({gun:'Günlük',hafta:'Haftalık',ay:'Aylık'}[t.rec])+'</span>':''}</div>
 <p class="d" style="margin-top:10px">${esc(t.desc)||'Açıklama yok.'}</p>
 <dl><dt>Durum</dt><dd><select data-p="st">${Object.entries(ST).map(([k,v])=>`<option value="${k}"${k===t.status?' selected':''}>${v}</option>`).join('')}</select></dd>
 <dt>Sorumlu</dt><dd>${esc(person(t.who))||'-'}</dd><dt>Yardımcılar</dt><dd>${esc(t.helpers.map(person).join(', '))||'-'}</dd><dt>Oluşturan</dt><dd>${esc(person(t.creator))||'-'}</dd>
 <dt>Tarih</dt><dd class="${late(t)?'late':''}">${fmt(t.start)} – ${fmt(t.due)}</dd><dt>Süre sayacı</dt><dd><button data-p="tm" data-tm="${t.id}">${t.ts?'⏸ ':'▶ '}${fmtT(secs(t))}</button></dd></dl>
 <h4>Alt görevler${t.subs.length?' · %'+p:''}</h4>${t.subs.map((s,i)=>`<label class="sb"><input type="checkbox" data-p="sub" data-i="${i}" ${s.d?'checked':''}>${esc(s.t)}</label>`).join('')||'<div class="d">Alt görev yok.</div>'}
 <h4>Yorumlar</h4>${(t.comments||[]).map(c=>`<div class="cm"><small>${esc(c.a)} · ${dt(c.d)}</small>${esc(c.m)}</div>`).join('')}<input data-p="cm" placeholder="Yorum yaz ve Enter'a bas">
 <h4>Geçmiş</h4>${(t.log||[]).slice(0,12).map(l=>`<div class="lg">${dt(l.d)} · ${esc(l.m)}</div>`).join('')||'<div class="lg">Kayıt yok.</div>'}
 <div class="act" style="margin-top:18px"><button data-p="edit">Düzenle</button><button class="dng sp" data-p="del">Sil</button></div>`}

function renderBulk(){sel.forEach(id=>{if(!tasks.some(t=>t.id===id))sel.delete(id)});$('#bulk').classList.toggle('show',sel.size>0);$('#bn').textContent=sel.size+' iş seçili'}

function renderSaved(){$('#savedf').innerHTML=saved.map((f,i)=>`<button class="nv" data-sf="${i}">${esc(f.n)}<i data-sfd="${i}">✕</i></button>`).join('')||'<div class="lg" style="padding:2px 10px">Henüz yok</div>'}

function ask(label,def=''){return new Promise(res=>{const d=$('#ask');$('#al').textContent=label;$('#ai').value=def;d.showModal();$('#ai').focus();const done=v=>{d.close();res(v)};$('#aok').onclick=()=>done($('#ai').value.trim()||null);$('#acn').onclick=()=>done(null);$('#ai').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();done($('#ai').value.trim()||null)}};d.oncancel=()=>res(null)})}
function toastU(m,fn){const t=$('#toast');t.innerHTML=esc(m)+' <button id="tu">Geri al</button>';t.classList.add('show','u');clearTimeout(toast.h);$('#tu').onclick=()=>{clearTimeout(toast.h);t.classList.remove('show','u');fn()};toast.h=setTimeout(()=>t.classList.remove('show','u'),7000)}

let pidx=0,pitems=[];
const cmds=()=>[['Yeni iş  (N)',()=>openD()],['Görünüm: Pano  (1)',()=>setV('board')],['Görünüm: Liste  (2)',()=>setV('list')],['Görünüm: Takvim  (3)',()=>setV('cal')],['Görünüm: Gantt  (4)',()=>setV('gantt')],['Görünürdeki işleri seç',()=>{filtered().forEach(t=>sel.add(t.id));render()}],['Filtreyi kaydet',saveF],['Excel (CSV) indir',expCsv],['JSON indir',()=>$('#export').click()],['Tema değiştir',()=>$('#theme').click()]];
function palRender(){const q=$('#pi').value.toLowerCase();pitems=[...cmds().filter(c=>c[0].toLowerCase().includes(q)),...(q?tasks.filter(t=>t.title.toLowerCase().includes(q)).slice(0,6).map(t=>['İş: '+t.title,()=>openP(t.id)]):[])];pidx=Math.max(0,Math.min(pidx,pitems.length-1));$('#pl').innerHTML=pitems.map((c,i)=>`<button class="nv${i===pidx?' on':''}" data-i="${i}">${esc(c[0])}</button>`).join('')||'<div class="empty">Sonuç yok</div>'}
function palOpen(){$('#pi').value='';pidx=0;palRender();$('#pal').showModal();$('#pi').focus()}
function palRun(i){const c=pitems[i];if(c){$('#pal').close();c[1]()}}
$('#pi').addEventListener('input',()=>{pidx=0;palRender()});
$('#pi').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();pidx=Math.min(pidx+1,pitems.length-1);palRender()}else if(e.key==='ArrowUp'){e.preventDefault();pidx=Math.max(pidx-1,0);palRender()}else if(e.key==='Enter'){e.preventDefault();palRun(pidx)}});
$('#pl').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)palRun(+b.dataset.i)});
addEventListener('keydown',e=>{const typing=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palOpen();return}if(typing||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;if(e.key==='n'){e.preventDefault();openD()}else if(e.key==='/'){e.preventDefault();$('#q').focus()}else if(e.key.length===1&&'1234'.includes(e.key))setV(['board','list','cal','gantt'][+e.key-1])});


const initial=await client.auth.getSession();session=initial.data.session;if(session)await boot();
