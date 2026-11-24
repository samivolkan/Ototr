import{steps,advanceSimulation}from './office-simulation-model.mjs';
const office=document.querySelector('.office');
const host=document.createElement('section');host.className='office-simulation';host.id='office-simulation';
const anchor=office.querySelector('.daily-actions');if(anchor)anchor.after(host);else office.prepend(host);
let step=0,started=false,paused=false,history=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paint(){
 const current=steps[step];
 office.classList.toggle('simulation-running',started);
 host.setAttribute('aria-label','Örnek iş simülasyonu');
 document.querySelectorAll('[data-team]').forEach(el=>{const active=started&&current.team===el.dataset.team&&step!==7;el.classList.toggle('demo-working',active);let mark=el.querySelector('.demo-work-marker');if(active&&el.classList.contains('room-label')&&!mark){mark=document.createElement('span');mark.className='demo-work-marker';mark.textContent='DEMO çalışıyor';el.append(mark);}if(!active)mark?.remove();});
 host.innerHTML=`<div class="simulation-head"><div><small>DEMO · YALNIZ BU EKRANDA · GERÇEK İŞLEM YOK</small><h2>${started?'Örnek iş: DEMO-FRA-001':'Bir işi ofiste baştan sona izle'}</h2></div><button data-sim="start">${started?'Yeniden başlat':'Örnek işi başlat'}</button>${started?'<button data-sim="close">Demoyu kapat</button>':''}</div>${started?`<p class="sim-route">Franchise → Finans → Sami → Franchise</p><h3>${esc(current.title)}</h3><p><b>Şu an kimde:</b> ${esc(current.owner)}</p><p><b>Beklenen adım:</b> ${esc(current.next)}</p><p>Adım ${step+1} / ${steps.length} · ${step===5?'Kararın gelene kadar durur':step===7?'Simülasyon bitti':paused?'Duraklatıldı':'4 saniyede bir ilerler'}</p>${step===5?'<div class="sim-decision"><button data-sim="approve">Demo: görüşmeye geç</button><button data-sim="revise">Demo: ek bilgi iste</button></div>':step<7?`<button data-sim="pause">${paused?'Devam et':'Duraklat'}</button><button data-sim="next">Sonraki adım →</button>`:''}<details><summary>İş ve devir geçmişi</summary><ol>${history.map(i=>`<li>${esc(steps[i].owner)} — ${esc(steps[i].title)}</li>`).join('')}</ol></details>`:'<p>Kurgusal adayın başvurusunu, ekipler arası kabul edilmiş devri ve senden beklenen kararı izle. Ekip ışığı turuncu yanıp söner; yeşil canlı iş göstergesinden ayrıdır.</p>'}`;
}
function move(action){const next=advanceSimulation(step,action);if(next!==step){step=next;history.push(step);}paint();}
host.addEventListener('click',e=>{const action=e.target.closest('[data-sim]')?.dataset.sim;if(!action)return;if(action==='close'){started=false;paused=false;step=0;history=[];paint();}else if(action==='start'){step=0;started=true;paused=false;history=[0];paint();}else if(action==='pause'){paused=!paused;paint();}else if(action==='next')move('tick');else move(action);});
setInterval(()=>{if(started&&!paused&&!document.hidden&&step!==5&&step!==7)move('tick');},4000);
paint();
