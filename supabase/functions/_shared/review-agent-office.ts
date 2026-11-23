export const REPLY_DELAY_MS = 120 * 60 * 1000;
export function assertReplyDelay(item:any, now=Date.now()) {
 const ready=Date.parse(item.draft_ready_at), due=Date.parse(item.auto_send_after);
 if(!Number.isFinite(ready)||!Number.isFinite(due)||due-ready<REPLY_DELAY_MS||now<due)throw Object.assign(new Error('Taslak hazır olduktan sonraki iki saatlik inceleme süresi henüz dolmadı.'),{status:409});
}
export async function officeReviewAction(db:any,body:any,access:any,user:any){
 if(access.role!=='admin'||!access.is_owner)throw Object.assign(new Error('Uzman yönetimi için bağlantı sahibi yönetici gerekli.'),{status:403});
 if(body.action==='office_review_profile_save'){
  const fields=['mission','scope','tone','escalation','acceptance'];const profile:any={};
  for(const key of fields){const value=body.profile?.[key];if(typeof value!=='string'||value.trim().length<5||value.length>2000)throw Object.assign(new Error('Görev alanları 5–2000 karakter olmalı.'),{status:400});profile[key]=value.trim();}
  if(!Number.isInteger(body.version)||body.version<1)throw Object.assign(new Error('Geçersiz sürüm.'),{status:400});
  const saved=await db.from('google_review_agent_profile').update({profile,version:body.version+1,updated_by:user.id,updated_at:new Date().toISOString()}).eq('id','REV-01').eq('version',body.version).select('id,profile,version,updated_at').maybeSingle();
  if(saved.error)throw Object.assign(new Error('Görev kartı kaydedilemedi.'),{status:503});if(!saved.data)throw Object.assign(new Error('Kart başka oturumda değişti; yenileyin.'),{status:409});return {profile:saved.data};
 }
 const [summary,profile]=await Promise.all([db.rpc('google_review_office_summary'),db.from('google_review_agent_profile').select('id,profile,version,updated_at').eq('id','REV-01').single()]);
 if(summary.error||profile.error)throw Object.assign(new Error('Yorum uzmanı durumu okunamadı.'),{status:503});
 return {summary:summary.data,profile:profile.data,checked_at:new Date().toISOString(),delay_minutes:120,worker_interval_minutes:5};
}
