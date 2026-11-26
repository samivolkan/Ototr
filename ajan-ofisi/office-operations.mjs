import {createJourney,tickJourney,journeyStages} from './office-demo-journey.mjs';
import {createDemo,taskProgress,taskStatus,taskTimes,reportProgress,duration,advanceDemo} from './branch-operations-model.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cases=[],selected=null,detail=null,opened=false,mode='demo';
let journey=null,playing=false;
function startJourney(){playing=true;journey=createJourney();cases=[journey.car];selected=journey.car.id;detail=null;opened=true;render();}
function stepJourney(){if(!journey||journey.done)return;tickJourney(journey);if(journey.done)playing=false;render();}

function demo(){cases=createDemo();const first=cases[0];for(const [station,index,label] of [['mechanical',11,'Alt takım bağlantıları'],['body',3,'Sol arka çamurluk ölçümü'],['intake',17,'Araç kabul bilgilerinin kontrolü']]){const t=first.tasks.find(t=>t.station===station);t.currentItemId=t.items[index].id;t.items[index].label=label;}selected=first.id;}
demo();
const office=$('.office'),controls=$('.office-controls'),viewport=$('#sceneViewport'),three=$('#office3d');
const workspace=document.createElement('div');workspace.className='office-command';
const visual=document.createElement('div');visual.className='office-command-visual';
office.prepend(controls,workspace);workspace.append(visual);visual.append(three,viewport);
const panel=document.createElement('aside');panel.className='office-operation-panel';panel.setAttribute('aria-label','Ofis içi operasyon takibi');workspace.append(panel);
const labels=document.createElement('div');labels.className='office-master-labels';$('#scene').append(labels);
const zone=$('.operations-zone');zone.setAttribute('aria-expanded','false');zone.setAttribute('aria-controls','officeOperationBody');
const current=()=>cases.find(c=>c.id===selected);
const percent=p=>p.pct===null?'Doğrulanmadı':'%'+p.pct;
const taskValue=t=>t?.station==='presentation'?taskStatus(t):percent(taskProgress(t));
const activeTest=t=>t?.status==='active'&&!t.waitReason?t.items?.find(i=>i.id===t.currentItemId&&!i.done)?.label||'Aktif test kaydı yok':taskStatus(t);
const bar=(p,name)=>`<progress aria-label="${esc(name)}" max="100" value="${p.pct??0}"></progress>`;
function render(){
 const c=current();zone.setAttribute('aria-expanded',String(opened));$('#scene').classList.toggle('ops-open',opened);
 const sourceText='DEMO · Örnek araçlar ve kişiler';
 panel.innerHTML=`<header><div><small>OTOTR OPERASYON</small><h2>${opened?'Anlık operasyon':'Koordinatör görünümü'}</h2></div>${opened?'<button data-ops-close aria-label="Operasyon panelini kapat">×</button>':''}</header><p class="ops-source" role="status">${esc(sourceText)}</p><div id="officeOperationBody">${opened?simulationControls()+content(c):'<p class="ops-intro">Operasyon Masası’na tıkla; araçları, ustaların görevlerini ve tamamlanan testleri burada takip et.</p><button data-ops-start class="ops-primary">Demo aracı baştan sona çalıştır →</button><button data-ops-open>Operasyon Masası’nı aç</button>'}</div><footer><span>Demo modu · ERP bağlantısı kapalı</span><button data-ops-demo>Örnek araç listesine dön</button><a href="branch-operations.html">Ayrıntılı operasyon ekranı ↗</a></footer>`;
 labels.hidden=!opened||!c;
 labels.innerHTML=c?['mechanical','body',journey?.stage>=4?'presentation':'intake'].map(station=>{const t=c.tasks.find(t=>t.station===station);const p=taskProgress(t);return `<button class="office-master ${station} ${playing&&t?.status==='active'&&!t?.waitReason?'is-demo-working':''}" data-ops-task="${station}" aria-label="${esc((t?.owner||'Atama yok')+' '+(t?.title||station)+' '+taskValue(t))}" aria-pressed="${detail===station}"><strong>${esc(t?.owner||'Atama yok')} <b>${taskValue(t)}</b></strong><span>${esc(taskStatus(t))}${t?.station==='presentation'?' · Sunum':''}</span>${bar(p,t?.title||station)}</button>`;}).join(''):'';
}
function simulationControls(){return `<section class="ops-simulation"><b>Tek araç · uçtan uca demo</b><p>Canlı kayıt, gerçek baskı veya müşteriye mesaj yok. Yaklaşık 54 saniye.</p><div><button data-ops-start>${journey?'Baştan başlat':'Demoyu başlat'}</button>${journey&&!journey.done?`<button data-ops-pause>${playing?'Duraklat':'Devam et'}</button><button data-ops-step>Bir adım ilerlet</button>`:''}</div>${journey?`<ol class="ops-journey">${journeyStages.map((name,i)=>`<li class="${i===journey.stage?'current':i<journey.stage?'done':''}">${name}</li>`).join('')}</ol><p class="ops-handoff" role="status">${esc(journey.history.at(-1))}${!playing&&!journey.done?' · Duraklatıldı':''}</p><details><summary>Devir geçmişi (${journey.history.length})</summary>${journey.history.map(x=>`<p>${esc(x)}</p>`).join('')}</details>`:''}</section>`;}
function content(c){
 if(!c)return '<p class="ops-intro">Doğrulanmış araç kaydı bekleniyor. ERP kaynak sekmesini açık tut.</p>';
 const rp=reportProgress(c),tasks=detail?c.tasks.filter(t=>t.station===detail):journey?[...c.tasks].sort((a,b)=>Number(b.status==='active')-Number(a.status==='active')):c.tasks;
 return `<label class="ops-picker">Araç / plaka<select id="officeOperationPlate">${cases.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.plate)}</option>`).join('')}</select></label><div class="ops-report"><b>Tüm Rapor <span>${percent(rp)}</span></b>${bar(rp,'Tüm Rapor')}<small>${rp.done??'—'} / ${rp.total??'—'} zorunlu kalem</small></div>${detail?'<button data-ops-back>← Tüm görevler</button>':''}<div class="ops-tasks">${tasks.map(t=>{const p=taskProgress(t),times=taskTimes(t);return `<article><button data-ops-task="${esc(t.station)}"><strong>${esc(t.owner||'Sorumlu doğrulanmadı')} <b>${taskValue(t)}</b></strong><span>${esc(t.title)} · ${esc(taskStatus(t))}</span></button><p class="ops-test">${esc(activeTest(t))}</p>${bar(p,t.title)}<small>${p.total===null?'Ara kontrol maddesi yok':`${p.done} / ${p.total} madde tamamlandı`}</small>${t.waitReason?`<p>${esc(t.waitReason)}</p>`:''}${detail?`<dl><dt>İşlem süresi</dt><dd>${duration(times.active)}</dd><dt>Bekleme süresi</dt><dd>${duration(times.waiting)}</dd></dl>${t.items?.length?`<details><summary>Test maddeleri</summary><ul>${t.items.map(i=>`<li>${i.done?'✓':'○'} ${esc(i.label)}</li>`).join('')}</ul></details>`:''}${mode==='demo'&&!journey&&t.station!=='presentation'?'<button data-ops-advance>Demo: bir maddeyi tamamla</button>':''}`:''}</article>`;}).join('')}</div>`;
}
function open(){opened=true;render();if(innerWidth<800)panel.scrollIntoView({behavior:'smooth',block:'nearest'});}
zone.addEventListener('click',e=>{e.preventDefault();open();});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-ops-start]'))startJourney();
 if(e.target.closest('[data-ops-pause]')){playing=!playing;render();}
 if(e.target.closest('[data-ops-step]')){playing=false;stepJourney();}

 if(e.target.closest('[data-ops-open]'))open();
 if(e.target.closest('[data-ops-close]')){opened=false;detail=null;render();zone.focus();}
 const target=e.target.closest('[data-ops-task]');if(target){opened=true;detail=target.dataset.opsTask;render();}
 if(e.target.closest('[data-ops-back]')){detail=null;render();}
 if(e.target.closest('[data-ops-demo]')){playing=false;journey=null;mode='demo';demo();detail=null;opened=true;render();}
 if(e.target.closest('[data-ops-advance]')&&mode==='demo'){advanceDemo(current(),detail);render();}

});
panel.addEventListener('change',e=>{if(e.target.id==='officeOperationPlate'){selected=e.target.value;detail=null;render();panel.scrollTop=0;}});
// This office demonstration deliberately exposes no live-source connection.
setInterval(()=>{if(playing&&!document.hidden)stepJourney();},3000);
render();
