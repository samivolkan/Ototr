import{taskCard}from'./franchise-friendly-view.mjs';
import{demoRequest}from'./franchise-web-demo-api.mjs?v=2';
import{workflowView}from'./franchise-demo-workflow.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let host=document.querySelector('#web-demo-tasks'),office=!!document.querySelector('#scene'),busy=false,last=null,mutating=false;
if(!host&&office){host=document.createElement('section');host.id='web-demo-tasks';host.className='demo-task-office';document.querySelector('.office').append(host);}
function render(data,error){
 last=data;const tasks=data?.tasks||[];if(!host)return;
 const open=new Set([...host.querySelectorAll('details[open]')].map(e=>e.dataset.details));
 const active=document.activeElement;const focused=host.contains(active)?active.closest('details')?.dataset.details:null;
 host.innerHTML=`<div class="demo-task-head"><div><p class="eyebrow">ADAY TAKİBİ</p><h2>İşler ve kararlar</h2></div><button id="demoTaskRefresh">Yenile</button></div><p class="demo-task-note">${error?esc(error):data?`Güncel · ${new Date(data.checked_at).toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'})}`:'Bilgiler yükleniyor…'}</p><p class="friendly-demo-notice"><b>Demo çalışma alanı</b> · Kurgusal aday, kayıtlı ilerleme. Gerçek mesaj, ödeme veya otomatik onay yok.</p>${tasks.map(taskCard).join('')||(data?'<p>Henüz takip edilen demo aday yok.</p>':'')}`;
 host.querySelectorAll('details').forEach(d=>{if(open.has(d.dataset.details))d.open=true;if(focused===d.dataset.details)d.querySelector('summary').focus({preventScroll:true});});
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
