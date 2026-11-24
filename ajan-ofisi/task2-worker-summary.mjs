export function task2WorkerSummary(value,now=Date.now()){
 if(!value)return 'TASK2: ilk arka plan okuması henüz doğrulanmadı.';
 if(value.status==='error')return 'TASK2 kaynağı okunamadı; önceki sayılar güncel kabul edilmiyor.';
 const s=value.snapshot,age=now-Date.parse(value.last_success_at);
 const fields=['total','open','owner_missing','owner_unresolved','acceptance_pending','past_due','handoff_pending','review_pending','closure_pending','unknown_status','decision_slots','decision_day_minutes','decision_week_minutes'];
 if(value.status!=='ok'||!Number.isFinite(age)||!s||!fields.every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)||s.open>s.total||!['owner_missing','owner_unresolved','acceptance_pending','past_due','handoff_pending','review_pending','closure_pending'].every(k=>s[k]<=s.open)||s.unknown_status>s.total)return 'TASK2 arka plan özeti doğrulanamadı.';
 if(age>720000||age< -60000)return 'TASK2 son okuması eski; yeni kontrol bekleniyor.';
 const labels={not_configured:'karar masası kurulmamış',owner_unavailable:'karar sahibi doğrulanamadı',queue_full:'karar kuyruğu dolu',day_full:'günlük inceleme kapasitesi dolu',week_full:'haftalık inceleme kapasitesi dolu',available:'karar kapasitesi uygun'};
 if(!Object.hasOwn(labels,s.decision_admission))return 'TASK2 karar kapasitesi doğrulanamadı.';
 return `TASK2 son arka plan okuması: ${s.open} açık iş · ${s.acceptance_pending} çalışan kabulü · ${s.handoff_pending} devir · ${s.review_pending} teslim incelemesi · ${s.closure_pending} yönetici kapanışı bekliyor. ${labels[s.decision_admission]}. Bu okuma iş atamaz veya onay vermez.`;
}
