export function validateWorker(d){return d?.source==='isler24'&&d.scope==='current_user_scope'&&d.interval_minutes===5&&typeof d.enabled==='boolean'&&typeof d.scheduled==='boolean'&&(!d.scheduled||d.enabled)&&Number.isSafeInteger(d.run_count)&&d.run_count>=0&&Number.isInteger(d.consecutive_failures)&&d.consecutive_failures>=0&&d.consecutive_failures<=3&&['not_started','waiting','ok','error','expired','revoked','stopped'].includes(d.last_status)&&Number.isFinite(Date.parse(d.next_stop))&&['expires_at','last_attempt_at','last_success_at'].every(k=>d[k]===null||Number.isFinite(Date.parse(d[k])))&&(!d.enabled||d.expires_at!==null);}
export function workerLabel(d,now=Date.now()){
 if(!validateWorker(d))return 'Yürütücü durumu doğrulanamadı';
 if(!d.enabled)return ({revoked:'Yetki değiştiği için durdu',expired:'Süre dolduğu için durdu',error:'Tekrarlanan hata nedeniyle durdu',stopped:'Durduruldu'})[d.last_status]||'Başlatılmadı';
 if(Date.parse(d.expires_at)<=now)return 'Süre doldu · yeni kontrol yapılmamalı';
 if(!d.scheduled)return 'Zamanlayıcı doğrulanamadı';
 if(d.last_status==='waiting'||!d.last_success_at)return 'Zamanlandı · ilk başarılı çalışma bekleniyor';
 if(d.last_status==='error')return `Kontrol hatası · ${d.consecutive_failures}/3`;
 const age=now-Date.parse(d.last_success_at);if(age>720000||age< -60000)return 'Son başarılı çalışma eski · inceleme gerekli';
 return 'Arka planda kontrol çalışıyor';
}
export async function workerRequest(action){
 const names={status:'office_worker_status',start:'start_office_readonly_worker',stop:'stop_office_readonly_worker'};
 if(!Object.hasOwn(names,action))throw Error('Tanımsız yürütücü işlemi.');
 const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP oturumu gerekli.');
 const r=await fetch(`https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/rpc/${names[action]}`,{method:'POST',headers:{apikey:'sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE',Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Yürütücü işlemi doğrulanamadı.');const d=await r.json();if(!validateWorker(d))throw Error('Yürütücü yanıtı doğrulanamadı.');return d;
}
