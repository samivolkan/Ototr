import{decisionRpc}from'./decision-desk-api.mjs';
import{validateDesk}from'./decision-desk-service.mjs';
export async function refreshDecisionDesk(){
 const preview=document.querySelector('#personalDecisionPreview');if(preview)preview.replaceChildren();
 const target=document.querySelector('#decisionDeskStatus');
 try{
  const v=validateDesk(await decisionRpc('office_decision_queue',{p_action:'read'}));
  if(preview&&v.configured){if(v.is_owner){for(const row of v.items){const card=document.createElement('article');card.className='control-item';const title=document.createElement('h3');title.textContent=row.plan.decision;const why=document.createElement('p');why.textContent='Neden: '+row.plan.finding;const state=document.createElement('p');state.textContent=row.source_current?'Kararın bekleniyor':'Kaynak değişmiş; güncellenmesi bekleniyor';const a=document.createElement('a');a.href='decision-desk.html';a.textContent='Kanıtı incele ve karar ver →';card.append(title,why,state,a);preview.append(card);}if(!v.items.length)preview.textContent='Bağlı TASK2 kapsamında senden beklenen karar yok.';}else preview.textContent='Bu masanın kararları başka bir yetkilide; sana atanmış karar olarak gösterilmez.';}
 target.textContent=!v.configured?'Bu çalışma alanında karar masası henüz başlatılmadı.':`${v.items.length} karar · ${v.review_items.length} bağımsız plan incelemesi · ${v.budget.pending}/10 kapasite. Bugün ${v.budget.today_actual} dakika gerçekleşen, ${v.budget.today_reserved} dakika planlanan inceleme. ${v.is_owner?'Masanın karar sahibi sensin.':'Kararlar masanın sahibinde.'}`;
 }catch{target.textContent='Ortak karar masası doğrulanamadı; boş kuyruk varsayılmaz.';}
}
