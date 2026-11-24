import data from './management-data.mjs?v=ops-1';
import {STATES,cleanNotes,selectedModules,planningSummary} from './management-model.mjs';
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='ototr.management.planning.v1';
let notes={},filter='all',current=null;
try {notes=cleanNotes(JSON.parse(localStorage.getItem(key)||'{}'),data.modules);} catch {}
function render(){
 const list=selectedModules(data.modules,$('#search').value,filter).sort((a,b)=>a.phase-b.phase);
 $('#count').textContent=`${list.length} birim · Durum etiketleri kişisel plan takibidir.`;
 $('#modules').innerHTML=list.map(m=>`<button class="module" data-module="${m.id}"><span class="card-top"><span class="pill ${m.kind==='proposed'?'proposed':''}">${esc(m.mode)}</span><span>${m.id} ↗</span></span><h3>${esc(m.name)}</h3><p>${esc(m.mission)}</p><div class="card-meta"><span>${m.agents.length} ${m.kind==='proposed'?'önerilen rol':'uzman'}</span><span>${esc(m.window)}</span></div><div class="next"><small>SONRAKİ ADIM</small><p>${esc(m.next)}</p></div><div class="card-bottom"><span>${esc(m.managerName || m.manager)}</span><b>${STATES[notes[m.id]?.state]||STATES.planned}</b></div></button>`).join('') || '<p>Bu aramayla eşleşen birim yok.</p>';
}
function open(id){current=data.modules.find(m=>m.id===id);if(!current)return;const m=current;
 $('#detailLabel').textContent=`${m.id} · ${m.kind==='proposed'?'ÖNERİLEN EKİP':'MEVCUT EKİP'}`;$('#title').textContent=m.name;
 $('#detailContent').innerHTML=`<p>${esc(m.mission)}</p><div class="notice"><b>${esc(m.mode)}</b><br>Bu kart çalışan ajan veya iş tamamlanma kanıtı değildir.</div><h3>Uzman görev kartları</h3>${m.agents.map(a=>`<article class="agent"><b>${esc(a.id)} · ${esc(a.name)}</b><p>${esc(a.scope)}</p><p><strong>Teslim:</strong> ${esc(a.deliverable)}</p></article>`).join('')}<h3>İş nasıl ilerleyecek?</h3><ol><li>Uzman kaynak ve kanıtı toplar; eksik bilgi varsa soru listesi hazırlar.</li><li>${esc(m.managerName || m.manager)} çıktıların tekrarlarını eler ve teslimi kontrol eder.</li><li>Bağımsız bekçi risk kurallarına göre inceler; üretici kendi işini onaylayamaz.</li><li>Koordinatör gerekli kararı Sami'nin kuyruğuna kapasite varsa sunar.</li></ol><p><b>Senden istenen karar:</b> ${esc(m.decision)}</p><p><b>Bağımlılıklar:</b> ${m.dependencies.map(id=>esc(data.modules.find(x=>x.id===id)?.name||id)).join(', ')||'Başlangıç kaynak incelemesi'}</p><h3>Devir paketi</h3><p>Tek iş kimliği · kaynak ve sürüm · gönderen/alıcı · gerekli kanıt · kabul koşulu · sonraki adım. Teslim edildi, kabul edildi anlamına gelmez.</p><p><b>Zorunlu çıktı:</b> Bulgu · dosya ve satır aralığıyla kanıt · öneri · risk (${esc(m.risk)}) · tahmini efor · gerekiyorsa Sami kararı. Kanıt yoksa bulgu yerine soru kaydedilir.</p>${m.href?`<a class="action-link" href="${m.href}">Mevcut ilgili ekranı aç →</a>`:'<p class="muted">Operasyon ekranı bağlantısı henüz doğrulanmadı.</p>'}`;
 $('#state').innerHTML=Object.entries(STATES).map(([v,t])=>`<option value="${v}">${t}</option>`).join('');$('#state').value=notes[m.id]?.state||'planned';$('#note').value=notes[m.id]?.note||'';$('#saveStatus').textContent='';$('#detail').showModal();
}
$('#modules').addEventListener('click',e=>{const b=e.target.closest('[data-module]');if(b)open(b.dataset.module);});
$('#search').addEventListener('input',render);
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();}));
$('#close').addEventListener('click',()=>$('#detail').close());
$('#noteForm').addEventListener('submit',e=>{e.preventDefault();const next=cleanNotes({...notes,[current.id]:{state:$('#state').value,note:$('#note').value}},data.modules);try{localStorage.setItem(key,JSON.stringify(next));notes=next;render();$('#saveStatus').textContent='Bu tarayıcıya kaydedildi. Ekibe görev veya onay gönderilmedi.';}catch{$('#saveStatus').textContent='Kaydedilemedi. Tarayıcı depolaması kapalı olabilir; notunuzu kopyalayın.'}});
$('#export').addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([planningSummary(data,notes)],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='ototr-management-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
$('#managementRoles').innerHTML=data.managementRoles.map(r=>`<p><b>${esc(r.name)}</b><br>${esc(r.scope)}</p>`).join('');render();
function openHash(){const id=location.hash.slice(1);if(data.modules.some(m=>m.id===id)&&!$('#detail').open)open(id);}
addEventListener('hashchange',openHash);openHash();
