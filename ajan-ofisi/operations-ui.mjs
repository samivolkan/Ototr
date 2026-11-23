import data from'./management-data.mjs?v=ops-1';
import{sourceDefinitions,controlSummary,managerBrief}from'./operations-model.mjs';
import{readOperationalSource}from'./operations-api.mjs';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cache={},summary=controlSummary({}),busy=false;
function item(i){return `<article class="control-item"><h3>${esc(i.title)}</h3><small>${esc(i.owner||'Demo akışı')}</small>${i.next?`<p>${esc(i.next)}</p>`:''}<a href="${esc(i.href)}">İlgili kaydı incele →</a></article>`;}
function render(){summary=controlSummary(cache);$('#controlStatus').textContent=summary.message+' Son okuma: '+new Date(summary.checkedAt).toLocaleTimeString('tr-TR',{timeZone:'Europe/Istanbul'});
 $('#sources').innerHTML=summary.sources.map(s=>`<article><span class="source-state" data-status="${s.status}">${({verified:'Bağlantı doğrulandı',stale:'Veri eski',unavailable:'Bağlantı doğrulanamadı'})[s.status]}</span><h3>${esc(s.name)}</h3><p>${esc(s.scope)}</p><strong>${s.status!=='verified'?'Durum bilinmiyor':s.id==='franchise'?`${s.value.case_count} süreç`:s.id==='reviews'?`${s.value.preparing+s.value.waiting+s.value.human} bekleyen işlem`:`${s.value.tasks.length} demo aday`}</strong><a href="${s.href}">Kaynağı aç →</a></article>`).join('');
 $('#decisions').innerHTML=summary.decisions.map(item).join('')||`<p>${summary.complete?'Bağlı kaynaklarda karar kaydı görünmüyor.':'Bağlantılar eksik; kararların tamamı doğrulanamadı.'}</p>`;
 $('#internal').innerHTML=summary.internal.map(item).join('')||'<p>Bağlı kaynaklarda işaretlenen engel veya inceleme yok.</p>';
 $('#demo').innerHTML=summary.demo.map(item).join('')||'<p>Karar aşamasında doğrulanmış demo aday yok.</p>';
 const coverage={FRA:'Gerçek kayıt özeti + ayrı demo akışı',FIN:'Yalnız Franchise devir özeti; muhasebenin bütünü bağlı değil',REV:'Nilüfer yanıt özeti; diğer şubeler ve kişisel hedefler bu kapsama bağlı değil',SEO:'Ayrı raporlama ekranı mevcut; bu merkezde çalışma durumu doğrulanmıyor',OPS:'Görev tasarımı hazır; iş emri olay bağlantısı bekliyor'};
 $('#coverage').innerHTML=data.modules.map(m=>`<article><h3>${esc(m.name)}</h3><span>${m.kind==='proposed'?'Önerilen rol':'Tanımlı ekip'}</span><p>${esc(coverage[m.id]||'Bu merkezde doğrulanmış operasyon veri bağlantısı yok.')}</p><small>${m.agents.length} rol · ${esc(m.manager)}</small></article>`).join('');
}
async function refresh(){if(busy||document.hidden)return;busy=true;$('#refreshControl').disabled=true;
 await Promise.allSettled(sourceDefinitions.map(async d=>{try{const value=await readOperationalSource(d.id);cache[d.id]={value,receivedAt:Date.now()};}catch{cache[d.id]={error:true,receivedAt:Date.now()};}render();}));
 busy=false;$('#refreshControl').disabled=false;
}
$('#refreshControl').onclick=refresh;$('#downloadBrief').onclick=()=>{const url=URL.createObjectURL(new Blob([managerBrief(controlSummary(cache))],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ototr-coordinator-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();let attempts=0;const boot=setInterval(()=>{if(window.OTOTRGetERPAuthSession||++attempts>=20){clearInterval(boot);refresh();}},500);setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();refresh();}});
