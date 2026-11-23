export const endpoint='https://bsjkohwbtrfwrqcyhsfz.supabase.co';
const key='sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE';
export async function franchiseOfficeRequest(name,payload={}){
 if(!['franchise_office_summary','save_franchise_agent_profile'].includes(name))throw Error('Bu masada işlem yetkisi yok.');
 const session=await window.OTOTRGetERPAuthSession?.();if(!session?.access_token)throw Error('ERP oturumu gerekli. Ana ERP ekranından giriş yapın.');
 const response=await fetch(`${endpoint}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(!response.ok)throw Error(data.message||'Franchise bağlantısı doğrulanamadı.');return data;
}
export const statusLabels={in_review:'Değerlendirmede',conditionally_approved:'Koşullu onay',approved:'Onaylandı',opening:'Açılış hazırlığı',active:'Aktif',rejected:'Reddedildi',closed:'Kapandı',pending:'Devir sırası',processing:'İşleniyor',processed:'Teknik işlem tamamlandı',failed:'Hata / inceleme',dead_letter:'Tekrar deneme durdu',pending_second_approval:'İkinci onay bekliyor'};
export function displayCount(value){return Number.isSafeInteger(value)&&value>=0?String(value):'—';}
export function validateProfile(p){return p&&typeof p==='object'&&Object.keys(p).length===5&&['mission','scope','handoff','escalation','acceptance'].every(k=>typeof p[k]==='string'&&p[k].trim().length>=5&&p[k].length<=2000);}
