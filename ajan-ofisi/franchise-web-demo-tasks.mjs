import{demoRequest}from'./franchise-web-demo-api.mjs?v=2';
import{workflowView}from'./franchise-demo-workflow.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let host=document.querySelector('#web-demo-tasks'),office=!!document.querySelector('#scene'),busy=false,last=null,mutating=false;
if(!host&&office){host=document.createElement('section');host.id='web-demo-tasks';host.className='demo-task-office';document.querySelector('.office').append(host);}
function workflowCard(t){
 const w=workflowView(t);
 return `<div class="handoff-workflow"><h3>${esc(w.title)}</h3><p>Kalıcı sunucu kaydı · kontrollü demo ilerletme. “Alındı” ve hazırlık adımları senaryo kayıtlarıdır; ajan/LLM çalışması veya insan onayı değildir.</p>
 <div class="handoff-route" aria-label="Birimler arası devir"><span>FRA-01</span><b>→</b><span>MGR-FRA</span><b>→</b><span class="${w.step?'route-active':''}">FRA-02 / FRA-03</span><b>↘</b><span class="${w.step?'route-active':''}">MGR-FIN → FIN-04 / FIN-02</span><b>→</b><span>BEK-01 · denetim bekliyor</span><b>→</b><span class="${w.step===4?'route-wait':''}">COO-01 → Sami</span></div>
 ${w.next?`<button class="demo-advance" data-advance="${esc(t.task_id)}" data-step="${w.step}">${esc(w.next)}</button>`:'<p class="demo-decision-stop"><strong>Karar kapısında durdu.</strong> Bu demo gerçek karar veya otomatik onay kaydetmez.</p>'}
 <div role="status" class="demo-action-status" data-action-status="${esc(t.task_id)}"></div>
 <div class="handoff-packages">${w.packages.map(p=>`<article><span class="demo-task-tag">${esc(p.manager)} → ${p.id}</span><h4>${esc(p.title)}</h4><b>${esc(p.status)}</b><p><b>Bulgu:</b> ${esc(p.finding)}</p><p><b>Kanıt:</b> ${esc(p.evidence)}<br>ERP: ${esc(t.application_id)} · Paket: ${esc(p.key)}</p><p><b>Öneri:</b> ${esc(p.recommendation)}</p><p><b>Risk:</b> ${p.risk} · <b>Efor:</b> ${p.effort}</p><p><b>Sami kararı:</b> ${esc(p.decision)}</p><p>Gerçek belge/inceleme sonucu değil; demo hazırlık şablonu. BEK-01 denetimi tamamlanmadı.</p></article>`).join('')}</div>
 ${w.step?'<p class="demo-task-note"><b>MGR-HR → HR-02:</b> eğitim ihtiyacı listesi sonraki aşamada. Sözleşme/kurulum kapıları nedeniyle beklemede; İK ajanı etkinleştirilmedi. Diğer ekiplere bu aşamada gereksiz iş açılmadı.</p>':''}
 ${w.decisions.length?`<section class="demo-decisions"><h3>Sami · ${w.decisions.length} karar başlığı · önerilen inceleme 10 dk</h3><p>Bu adayın demo karar listesi; genel canlı onay kuyruğu veya ayrılmış inceleme süresi değildir. Genel kuyruk 10 maddeye ulaştığında yeni iş açılmamalı.</p>${w.decisions.map(d=>`<article><h4>${d.id} · ${esc(d.title)}</h4><p>${esc(d.recommendation)}</p><p>${esc(d.effect)}</p><small>${d.minutes} dk öneri · cevap bekleniyor · karar kaydı yapılmadı</small></article>`).join('')}</section>`:''}
 <h4>Devir günlüğü</h4><ol class="handoff-log">${(t.workflow_events||[]).map(e=>`<li><time>${new Date(e.at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</time> · ${esc(e.label)} · DEMO</li>`).join('')||'<li>Yönetici incelemesi henüz ilerletilmedi.</li>'}</ol></div>`;
}
function render(data,error){
 last=data;const tasks=data?.tasks||[];if(!host)return;
 const open=new Set([...host.querySelectorAll('details[open]')].map(e=>e.dataset.details));
 host.innerHTML=`<div class="demo-task-head"><div><p class="eyebrow">WEB → FRANCHISE → FİNANS → KOORDİNATÖR</p><h2>Adayın görev ve devir masası</h2></div><button id="demoTaskRefresh">Yenile</button></div><p class="demo-task-note">${error?esc(error):data?`Sunucu doğrulandı · ${tasks.length} demo aday · ${new Date(data.checked_at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}`:'Sunucu bağlantısı kontrol ediliyor…'}</p><p class="demo-task-note">Gerçek sunucu kayıtları, kurgusal senaryo. LLM, gerçek mesaj, tahsilat, sözleşme veya şube aktivasyonu yok. Kod yazma kapalı.</p>${tasks.map(t=>`<article class="demo-task-card"><div class="demo-task-head"><div><span class="demo-task-tag">DEMO · FRA-01</span><h3>${esc(t.full_name)} · ${esc(t.province)} / ${esc(t.district)}</h3></div><b>${esc(workflowView(t).taskStatus)}</b></div><p><strong>Görev:</strong> <code>${esc(t.task_id)}</code><br><strong>ERP başvuru:</strong> <code>${esc(t.application_id)}</code></p>${workflowCard(t)}<details data-details="${esc(t.task_id)}" ${open.has(t.task_id)?'open':''}><summary>İlk temas soruları ve kaynak başvuru</summary><ol>${t.prepared_output.questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ol><p><b>Eksik:</b> ${t.prepared_output.missing_evidence.map(esc).join(' · ')}</p><p><b>Kanıt:</b> ${esc(t.prepared_output.source_reference)}</p><p>${esc(t.prepared_output.engine)}</p></details>${office?'<a href="franchise-specialist.html#web-demo-tasks">Uzmanın görev ekranını aç →</a>':''}</article>`).join('')||(data?'<p>Bu oturuma ait sunucu demo görevi yok.</p>':'')}`;
 document.querySelector('#demoTaskRefresh').onclick=refresh;decorate();
}
function decorate(){
 const tasks=last?.tasks||[],count=tasks.length,step=Math.max(0,...tasks.map(t=>workflowView(t).step));
 for(const team of ['FRA','FIN'])document.querySelectorAll(`[data-team="${team}"]`).forEach(el=>{
  const label=team==='FRA'?(count?`Franchise · ${count} aday · ${step===4?'karar bekliyor':'demo'}`:'Franchise'):(step?`Finans · ${tasks.filter(t=>t.workflow_step>0).length*2} demo paket`:'Finans');
  if(el.closest('#threeLabels'))el.textContent=label;else{const name=el.querySelector('.room-name');if(name)name.textContent=label;}
  el.classList.toggle('has-web-task',team==='FRA'?count>0:step>0);
 });
 const state=document.querySelector('#demoAgentTaskState');if(state)state.textContent=!last?'Demo bağlantısı doğrulanamadı':count?`FRA-01 · ${count} demo aday · ${workflowView(tasks[0]).title}`:'Demo başvuru bekliyor';
}
async function refresh(){if(busy||mutating||document.hidden)return;busy=true;try{render(await demoRequest('list_franchise_office_demo_tasks'));}catch(e){render(null,e.message);}finally{busy=false;}}
if(host){
 host.addEventListener('click',async e=>{
  const b=e.target.closest('[data-advance]');if(!b||mutating)return;mutating=true;b.disabled=true;
  const status=host.querySelector(`[data-action-status="${b.dataset.advance}"]`);status.textContent='Aşama sunucuya kaydediliyor…';
  try{await demoRequest('advance_franchise_office_demo',{p_task_id:b.dataset.advance,p_expected_step:Number(b.dataset.step)});render(await demoRequest('list_franchise_office_demo_tasks'));}
  catch(err){status.textContent=`Doğrulanamadı: ${err.message}. Yenile ile sunucu durumunu kontrol edin.`;b.disabled=false;}
  finally{mutating=false;}
 });
 render(null);let tries=0;const boot=setInterval(()=>{if(window.OTOTRGetERPAuthSession||++tries>=20){clearInterval(boot);refresh();}},500);
 setInterval(refresh,10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});document.querySelector('#view3d')?.addEventListener('click',()=>setTimeout(decorate,100));
}
