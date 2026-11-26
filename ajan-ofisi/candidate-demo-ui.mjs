import {scenes,questions} from './candidate-demo-data.mjs';
import catalog from './management-data.mjs';
import {initialState,transition,canAdvance,demoReport} from './candidate-demo-model.mjs';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const teams=[['OPS','Operasyon'],['FRA','Franchise'],['FIN','Finans'],['HR','İnsan Kaynakları'],['COM','Şikayet'],['REV','Yorum'],['SALE','Saha Satış'],['SEO','SEO / Web'],['DEV','Yazılım · öneri'],['SOC','Sosyal · öneri']];
const names=Object.fromEntries([...teams,['COO','Koordinatör'],['BEK','Bağımsız bekçi'],['SAMI','Sami']]);
const experts=Object.fromEntries(catalog.modules.flatMap(m=>m.agents.map(a=>[a.id,a.name])));
let state=initialState(),playing=false,elapsed=0,lastTick=performance.now();
function pause(){playing=false;updatePlayer();}
function updatePlayer(){const gate=!!scenes[state.index].decision&&!state.approved.includes(state.index);$('#play').textContent=playing?'Ⅱ Duraklat':'▶ Otomatik gösterimi başlat';$('#play').disabled=gate||state.finished;$('#next').disabled=!canAdvance(state);$('#prev').disabled=state.index===0;$('#next').textContent=state.index===scenes.length-1?'Gösterimi tamamla ✓':'Sonraki →';$('#playerState').textContent=state.finished?'Gösterim tamamlandı':gate?'Demo kararın bekleniyor · otomatik ilerleme durdu':playing?`Oynatılıyor · sonraki sahne ${Math.ceil(Number($('#speed').value)-elapsed)} sn`:'Duraklatıldı · elle ilerletebilirsin';}
function render(){const s=scenes[state.index];if(s.decision&&!state.approved.includes(state.index))playing=false;
 document.body.classList.toggle('decision-scene',!!s.decision);
 $('#sceneNumber').textContent=`${String(state.index+1).padStart(2,'0')} / ${scenes.length} · ${s.title.toLocaleUpperCase('tr')}`;$('#sceneDay').textContent=s.day;$('#sceneTitle').textContent=s.headline;$('#story').textContent=s.story;$('#actions').innerHTML=s.actions.map((a,i)=>`<div><b>${i+1}</b><span>${esc(a)}</span></div>`).join('');$('#output').textContent=s.output;$('#advice').textContent=s.advice;$('#adviceTitle').textContent=s.decision?'Sami, karar sende.':'Sana düşen';$('#decisionCount').textContent=`${state.approved.length} / 3`;
 if(s.decision&&state.approved.includes(state.index))$('#output').textContent='Demo insan kararı kaydedildi. Bu senaryodaki paket onaylandı; gerçek işlem yapılmadı.';
 $('#agents').innerHTML=s.agents.length?s.agents.map(id=>`<p><span>${esc(id)}</span><b>${esc(experts[id]||id)}</b></p>`).join(''):'<p><span>COO-01</span><b>Koordinatör · birleşik sonuç özeti</b></p>';
 $('#rooms').innerHTML=teams.map(([id,name])=>`<div class="room ${s.route.includes(id)?'active':''} ${s.team===id?'lead':''}"><div class="desk"><i class="person"></i><i class="monitor"></i><i class="table"></i></div><b>${name}</b><small>${s.team===id?'Dosya sorumlusu':s.route.includes(id)?'Bu sahnede iş devri':'Diğer sahnelerde görevli'}</small></div>`).join('');
 $('#flow').innerHTML=s.route.map((id,i)=>`${i?'<span class="arrow">→</span>':''}<span class="node ${id==='SAMI'?'human':''}">${esc(names[id])}</span>`).join('');
 $('#timeline').innerHTML=scenes.map((x,i)=>`<li class="${i===state.index?'current':i<state.index?'past':''}"><span>${i<state.index?'✓':String(i+1).padStart(2,'0')}</span><b>${esc(x.title)}</b>${x.decision?'<small>Karar</small>':''}</li>`).join('');
 $('#decision').hidden=!s.decision;if(s.decision){$('#decisionTitle').textContent=s.decision.title;$('#decisionReason').textContent=s.decision.reason;const rev=state.revisions.includes(state.index),res=state.resolved.includes(state.index),approved=state.approved.includes(state.index);$('#revisionState').textContent=approved?'Demo karar kaydedildi. Sonraki sahneye geçebilirsin.':rev&&!res?'Revizyon istendi: uzman eksik kanıtı ve güncel sürümü hazırlayana kadar süreç durdu.':res?'Eksiklerin tamamlandığı demo olayı gösterildi. Yeniden insan kararı gerekiyor.':'Otomatik ilerleme burada durur. Gerçek onay verilmez.';$('#approve').textContent=s.decision.approve;$('#approve').disabled=approved||(rev&&!res);$('#resolve').hidden=!rev||res||approved;$('#revise').disabled=approved;}
 $('#progress').style.width=`${((state.index+(state.finished?1:0))/scenes.length)*100}%`;$('#ending').hidden=!state.finished;$('#caption').textContent=`${s.day} · ${s.title} · ${s.agents.length} uzman rolü`;updatePlayer();
}
function act(action){state=transition(state,action);elapsed=0;lastTick=performance.now();render();}
$('#play').addEventListener('click',()=>{playing=!playing;lastTick=performance.now();updatePlayer();});$('#next').addEventListener('click',()=>act('next'));$('#prev').addEventListener('click',()=>{pause();act('back');});
for(const a of ['approve','revise','resolve'])$('#'+a).addEventListener('click',()=>{pause();act(a);});
for(const id of ['restart','again'])$('#'+id).addEventListener('click',()=>{pause();act('reset');});
$('#speed').addEventListener('change',()=>{elapsed=0;lastTick=performance.now();updatePlayer();});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#playerState').textContent='Tam ekran kullanılamadı; tarayıcı tam ekranını kullanabilirsin.'}});
$('#questions').innerHTML=questions.map(([q,a,owner],i)=>`<article><span>0${i+1}</span><div><h3>${esc(q)}</h3><p><b>Örnek cevap:</b> ${esc(a)}</p><small>${esc(owner)}</small></div></article>`).join('');
$('#questionsOpen').addEventListener('click',()=>{pause();$('#questionDialog').showModal();});$('#questionsClose').addEventListener('click',()=>$('#questionDialog').close());
$('#quickQuestions').addEventListener('click',()=>{pause();$('#questionDialog').showModal();});
$('#recordMode').addEventListener('click',()=>{const on=document.body.classList.toggle('recording');$('#recordMode').setAttribute('aria-pressed',String(on));$('#recordMode').textContent=on?'Detaylı görünüm':'Kayıt düzeni';});
$('#report').addEventListener('click',()=>{pause();const u=URL.createObjectURL(new Blob([demoReport(state)],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='ototr-candidate-simulation.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
setInterval(()=>{const now=performance.now(),dt=(now-lastTick)/1000;lastTick=now;if(!playing)return;elapsed+=dt;if(elapsed>=Number($('#speed').value)){if(canAdvance(state))act('next');else pause();}updatePlayer();},200);
render();
