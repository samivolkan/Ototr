import{createDecisionDesk}from'./decision-desk-service.mjs';
import{decisionRpc}from'./decision-desk-api.mjs';
const desk=createDecisionDesk({rpc:decisionRpc,newId:()=>crypto.randomUUID()}),$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let current=null,busy=false,sourceReady=false;
const taskId=new URLSearchParams(location.search).get('task');
function card(row,isOwner){
 const fields={finding:'Bulgu',evidence:'İncelenmiş kanıt',recommendation:'Öneri ve etkisi',risk:'Risk',effort:'Tahmini efor',decision:'İstenen karar'};
 let form='';
 if(row.state==='review_required'&&row.can_review&&row.source_current)form+=`<label>İnceleme kanıtı ve gerekçesi<textarea name="note" minlength="5" maxlength="2000"></textarea></label><button name="action" value="review">Planı inceledim, karar sahibine ilet</button>`;
 if(isOwner){
  form+=`<label>${row.state==='pending'?'Kararın veya iptal gerekçen':'İptal gerekçen'}<textarea name="answer" minlength="3" maxlength="2000"></textarea></label>`;
  if(row.state==='pending'&&row.source_current)form+='<label>Gerçek inceleme süresi (dakika)<input name="minutes" type="number" min="0" max="1440"></label><button name="action" value="answer">Kararı kaydet</button> ';
  form+='<button name="action" value="cancel">Gerekçeyle iptal et</button>';
 }
 return `<article><h3>${esc(row.decision_key)}</h3><p>Öncelik ${esc(row.priority)} · ${esc(row.scheduled_day)} · ${esc(row.reserved_minutes)} dakika planlandı</p>${!row.source_current?'<p class="warning">Kaynak değişti. Bu eski talep yanıtlanamaz; yeniden hazırlanmalı.</p>':''}<details><summary>Kanıt ve planı incele</summary><dl>${Object.entries(fields).map(([k,l])=>`<dt>${l}</dt><dd>${esc(row.plan[k])}</dd>`).join('')}</dl>${row.review_note?`<p>İnceleme: ${esc(row.review_note)}</p>`:''}</details>${form?`<form data-decision-id="${esc(row.id)}">${form}</form>`:''}</article>`;
}
function render(v){
 current=v;$('#setup').hidden=v.configured;for(const id of ['budget','decisionSection','reviewSection'])$('#'+id).hidden=!v.configured;
 if(!v.configured)return;
 const b=v.budget;$('#budget').innerHTML=`<h2>İnceleme kapasitesi</h2><div class="budget-grid"><div><b>${b.pending} / 10</b>Açık madde</div><div><b>${b.today_actual+b.today_reserved} / 45 dk</b>Bugün: ${b.today_actual} gerçekleşen + ${b.today_reserved} planlanan</div><div><b>${b.week_actual+b.week_reserved} / 840 dk</b>Bu hafta: ${b.week_actual} gerçekleşen + ${b.week_reserved} planlanan</div></div>${b.pending>=10||b.today_actual+b.today_reserved>=45||b.week_actual+b.week_reserved>=840?'<p class="warning">Yeni talep için kapasite kısıtlı. Mevcut işleri azaltın veya uygun güne planlayın.</p>':''}`;
 $('#ownerNote').textContent=v.is_owner?'Bu masanın karar sahibi sensin.':'Bu masadaki kararları yalnız sahibi sonuçlandırabilir.';
 $('#decisions').innerHTML=v.items.map(r=>card(r,v.is_owner)).join('')||'<p>Bağlı TASK2 kapsamında karar bekleyen madde yok.</p>';
 $('#reviews').innerHTML=v.review_items.map(r=>card(r,v.is_owner)).join('')||'<p>Bağımsız plan incelemesi bekleyen madde yok.</p>';
 $('#planForm').hidden=!sourceReady;
}
async function run(fn){
 if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{render(await fn());$('#message').textContent='Karar masası sunucudan doğrulandı.';}catch(error){$('#message').textContent=error.message||'Karar masası doğrulanamadı.';}
 finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
async function load(){await run(()=>desk.read());if(taskId&&taskId.length<=100&&current?.configured){
 $('#sourceSection').hidden=false;
 try{const source=await desk.loadSource(taskId);sourceReady=true;$('#sourceEvidence').textContent=source.reference;$('#sourceStatus').textContent='Güncel, bağımsız incelenmiş teslim okundu. Plan ayrıca başka bir yönetici tarafından incelenecek.';$('#planForm').hidden=false;}
 catch(error){sourceReady=false;$('#planForm').hidden=true;$('#sourceStatus').textContent=error.message;}
}}
$('#refresh').onclick=load;$('#initialize').onclick=async()=>{await run(()=>desk.act('initialize'));if(current?.configured)await load();};
$('#planForm').onsubmit=async event=>{event.preventDefault();const draft=Object.fromEntries(new FormData(event.currentTarget));await run(()=>desk.act('enqueue',draft));};
document.addEventListener('submit',async event=>{const id=event.target.dataset.decisionId;if(!id)return;event.preventDefault();const action=event.submitter?.value;if(!['review','answer','cancel'].includes(action))return;const draft={...Object.fromEntries(new FormData(event.target)),id};await run(()=>desk.act(action,draft));});
let tries=0;const boot=setInterval(()=>{if(window.OTOTRGetERPAuthSession||++tries>=20){clearInterval(boot);load();}},500);
