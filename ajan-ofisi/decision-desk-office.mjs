import{decisionRpc}from'./decision-desk-api.mjs';
import{validateDesk}from'./decision-desk-service.mjs';
export async function refreshDecisionDesk(){
 const target=document.querySelector('#decisionDeskStatus');
 try{
  const v=validateDesk(await decisionRpc('office_decision_queue',{p_action:'read'}));
  target.textContent=!v.configured?'Bu çalışma alanında karar masası henüz başlatılmadı.':`${v.items.length} karar · ${v.review_items.length} bağımsız plan incelemesi · ${v.budget.pending}/10 kapasite. Bugün ${v.budget.today_actual} dakika gerçekleşen, ${v.budget.today_reserved} dakika planlanan inceleme. ${v.is_owner?'Masanın karar sahibi sensin.':'Kararlar masanın sahibinde.'}`;
 }catch{target.textContent='Ortak karar masası doğrulanamadı; boş kuyruk varsayılmaz.';}
}
