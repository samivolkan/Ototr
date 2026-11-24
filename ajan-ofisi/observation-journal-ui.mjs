import{observationLabels,observationStatus,journalRequest}from'./observation-journal.mjs';
const root=document.querySelector('#observationJournal'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,busy=false,error=null;const requests=new Map();
const date=t=>new Date(t).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'});
const events={opened:'Kontrolde fark edildi',changed:'Kaynak değişti; özet yeniden inceleme bekliyor',reopened:'Kaynakta tekrar göründü',resolved:'Kaynakta bu kategorinin sayısı sıfırlandı',acknowledged:'Özet görüldü olarak işaretlendi'};
function render(){
 root.querySelector('[data-journal-status]').textContent=error||(!data?'Kontrol geçmişi yükleniyor…':'Kontrol kayıtları sunucuda saklandı. Bu, görev kabulü veya tamamlanma onayı değildir.');
 root.querySelector('[data-journal-items]').innerHTML=(data?.observations||[]).map(o=>`<article class="control-item"><h3>${esc(observationLabels[o.code])}</h3><p>${o.value} iş · ${esc(observationStatus(o))}</p><small>Son kontrol: ${esc(date(o.observed_at))} · İlk görülme: ${esc(date(o.first_seen_at))}</small><div class="actions"><a href="#legacy-work-source">Kaynak kapsamını incele →</a>${o.state==='open'?`<button data-ack="${o.code}" data-version="${o.version}" ${busy||o.acknowledged_at||error?'disabled':''}>${o.acknowledged_at?'Özet görüldü':'Özeti gördüm'}</button>`:''}</div></article>`).join('')||(data?'<p>Bu kapsamda henüz kalıcı kontrol kaydı oluşmadı.</p>':'');
 root.querySelector('[data-journal-events]').innerHTML=(data?.events||[]).map(e=>`<li>${esc(date(e.at))} · ${esc(observationLabels[e.code])} · ${esc(events[e.kind])} (${e.value}) · ${e.origin==='worker'?'Arka plan kontrolü':'Ekran kontrolü'}</li>`).join('');
}
async function refresh(){if(busy||document.hidden)return;busy=true;try{data=await journalRequest('refresh');error=null;}catch{error='Kontrol geçmişi yenilenemedi. Önceki kayıtlar güncel kabul edilmemeli.';}finally{busy=false;render();}}
root.addEventListener('click',async e=>{const b=e.target.closest('[data-ack]');if(!b||busy)return;
 const key=b.dataset.ack+':'+b.dataset.version;if(!requests.has(key))requests.set(key,crypto.randomUUID());
 busy=true;render();try{data=await journalRequest('ack',{p_code:b.dataset.ack,p_expected_version:Number(b.dataset.version),p_request_id:requests.get(key)});error=null;requests.delete(key);}catch{error='İşlem doğrulanamadı. Yenile ile güncel kaydı kontrol edin; işler tamamlandı sayılmadı.';}finally{busy=false;render();}});
document.querySelector('#refreshControl').addEventListener('click',refresh);render();let attempts=0;const boot=setInterval(()=>{if(window.OTOTRGetERPAuthSession||++attempts>=20){clearInterval(boot);refresh();}},500);
setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
