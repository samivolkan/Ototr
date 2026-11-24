export const routingLabels={owner_missing:'Sorumlu atanmamış',owner_ambiguous:'Birden fazla ana sorumlu',identity_or_scope_invalid:'Hesap veya kapsam eşleşmiyor',task_manager_access_missing:'Görev yöneticisi yetkisi doğrulanmadı',reporting_link_invalid:'Raporlama bağlantısı eksik',verified:'Sorumlu ve yetki eşleşiyor'};
export const departmentLabels={franchise:'Franchise',finance:'Finans',accounting:'Muhasebe',legal:'Hukuk',hr:'İnsan Kaynakları',academy:'Eğitim',operations:'Operasyon',procurement:'Satın Alma',it:'Yazılım / BT',marketing:'Pazarlama',quality:'Kalite',ohs:'İş Güvenliği',architecture:'Mimari'};
const fields=['primary_count','valid_primary_count','manager_primary_count','invalid_reporting_links','eligible_accounts','writable_accounts'];
export function routingReadiness(value){
 if(value?.source!=='franchise_responsibility_readiness'||value.scope!=='current_user_scope'||value.authorization_changed!==false||!Number.isFinite(Date.parse(value.observed_at))||!Array.isArray(value.departments)||!value.departments.length)throw Error('Sorumluluk kaynağı doğrulanamadı.');
 const seen=new Set();
 for(const d of value.departments){
  if(!Object.hasOwn(departmentLabels,d.department)||seen.has(d.department)||!fields.every(f=>Number.isSafeInteger(d[f])&&d[f]>=0)||d.valid_primary_count>d.primary_count||d.manager_primary_count>d.valid_primary_count||d.writable_accounts>d.eligible_accounts)throw Error('Sorumluluk sayıları doğrulanamadı.');
  seen.add(d.department);
  const status=d.primary_count===0?'owner_missing':d.primary_count>1?'owner_ambiguous':d.valid_primary_count!==1?'identity_or_scope_invalid':d.manager_primary_count!==1?'task_manager_access_missing':d.invalid_reporting_links>0?'reporting_link_invalid':'verified';
  if(d.status!==status)throw Error('Sorumluluk durumu doğrulanamadı.');
 }
 return {verified:value.departments.filter(d=>d.status==='verified').length,total:value.departments.length,departments:structuredClone(value.departments)};
}
