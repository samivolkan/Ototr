export const observationLabels={owner_missing:'Sorumlusu belirtilmemiş açık işler',owner_unresolved:'Sorumlu eşlemesi doğrulanamayan işler',past_due:'Planlanan tarihi geçmiş açık işler',due_missing:'Tarihi belirtilmemiş açık işler',due_invalid:'Tarihi doğrulanamayan işler',unknown_status:'Durumu tanınmayan işler'};
export function validateJournal(data){
 if(data?.mode!=='source_observation_journal'||!Array.isArray(data.observations)||data.observations.length>6||!Array.isArray(data.events)||data.events.length>30)return false;
 const seen=new Set();
 return data.observations.every(o=>{if(seen.has(o.code))return false;seen.add(o.code);return Object.hasOwn(observationLabels,o.code)&&Number.isSafeInteger(o.value)&&o.value>=0&&Number.isSafeInteger(o.version)&&o.version>0&&['open','resolved'].includes(o.state)&&(o.state==='open')===(o.value>0)&&['observed_at','first_seen_at','last_changed_at'].every(k=>Number.isFinite(Date.parse(o[k])))&&(o.acknowledged_at===null||Number.isFinite(Date.parse(o.acknowledged_at)));})&&data.events.every(e=>Object.hasOwn(observationLabels,e.code)&&['opened','changed','reopened','resolved','acknowledged'].includes(e.kind)&&Number.isSafeInteger(e.value)&&e.value>=0&&Number.isFinite(Date.parse(e.at)));
}
export function observationStatus(o,now=Date.now()){
 const age=now-Date.parse(o.observed_at);if(age<0||age>180000||!Number.isFinite(age))return 'Kontrol eski · yeniden doğrula';
 if(o.state==='resolved')return 'Son kontrolde bu kategoride sorun görünmüyor';
 return o.acknowledged_at?'Özet görüldü · işler hâlâ açık':'İlgili yönetici özeti incelemeli';
}
export async function journalRequest(action,payload={}){
 const allowed={list:'list_office_work_observations',refresh:'refresh_office_work_observations',ack:'ack_office_work_observation'};
 if(!Object.hasOwn(allowed,action))throw Error('Tanımsız kontrol işlemi.');
 if(action!=='ack'&&Object.keys(payload).length)throw Error('Kapsam sunucuda belirlenir.');
 if(action==='ack'&&(!Object.hasOwn(observationLabels,payload.p_code)||!Number.isSafeInteger(payload.p_expected_version)||payload.p_expected_version<1||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.p_request_id)||Object.keys(payload).length!==3))throw Error('Geçerli kontrol kaydı, sürüm ve istek kimliği gerekli.');
 const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP oturumu gerekli.');
 const r=await fetch(`https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/rpc/${allowed[action]}`,{method:'POST',headers:{apikey:'sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE',Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Kontrol kaydı doğrulanamadı; kaynağı yenileyin.');const data=await r.json();if(!validateJournal(data))throw Error('Kontrol kaydının sözleşmesi doğrulanamadı.');return data;
}
