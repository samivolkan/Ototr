const BASE='https://bsjkohwbtrfwrqcyhsfz.supabase.co',KEY='sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function financeHealth(value,now=Date.now()){
 const o=value?.outbox,e=value?.integrationErrors,a=value?.auditIntegrity;
 if(!['HEALTHY','DEGRADED','CRITICAL'].includes(value?.status)||value.rawPayloadExposed!==false||!Number.isFinite(Date.parse(value.generatedAtUtc))||now-Date.parse(value.generatedAtUtc)>180000||Date.parse(value.generatedAtUtc)>now+30000||!o||!e||!a||typeof a.valid!=='boolean'||![o.pending,o.failed,o.deadLetter,o.oldestPendingAgeSeconds,e.open,e.retryScheduled,a.checkedEventCount,a.invalidEventCount].every(n=>Number.isSafeInteger(n)&&n>=0)||a.invalidEventCount>a.checkedEventCount)throw Error('Finans özeti doğrulanamadı.');
 const expected=!a.valid||o.deadLetter>0?'CRITICAL':o.failed>0||e.open>0||o.oldestPendingAgeSeconds>=300?'DEGRADED':'HEALTHY';
 if(expected!==value.status||(a.valid&&a.invalidEventCount>0))throw Error('Finans durumları uyuşmuyor.');
 return {status:value.status,observedAt:value.generatedAtUtc,pending:o.pending,failed:o.failed,deadLetter:o.deadLetter,openErrors:e.open,retryScheduled:e.retryScheduled,auditValid:a.valid,checkedEvents:a.checkedEventCount,invalidEvents:a.invalidEventCount};
}
export function createOfficeFinanceClient({getSession,fetchImpl=fetch,uuid=()=>crypto.randomUUID()}){
 let scopes=new Map();
 async function request(path,body,profile){const session=await getSession();if(!session?.access_token)throw Error('ERP oturumu gerekli.');const r=await fetchImpl(BASE+path,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',...(profile?{'Content-Profile':profile}:{'Correlation-Id':uuid()})},body:JSON.stringify(body),cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Finans yetkisi veya bağlantısı doğrulanamadı.');return r.json();}
 return {
 async discover(){scopes=new Map();const rows=await request('/rest/v1/rpc/list_session_branch_scopes',{},'finance_api');if(!Array.isArray(rows))throw Error('Finans kapsamı doğrulanamadı.');const next=new Map();for(const r of rows){if(![r.legal_entity_id,r.dealer_account_id,r.branch_id].every(x=>UUID.test(x||'')))throw Error('Finans kapsamı doğrulanamadı.');const key=[r.legal_entity_id,r.dealer_account_id,r.branch_id].join('/');if(next.has(key))throw Error('Tekil finans kapsamı gerekli.');next.set(key,{legalEntityId:r.legal_entity_id,dealerAccountId:r.dealer_account_id,branchId:r.branch_id,label:String(r.branch_code||'Yetkili şube').slice(0,80)});}scopes=next;return [...next].map(([key,s])=>({key,label:s.label}));},
 async read(key){const s=scopes.get(key);if(!s)throw Error('Önce yetkili finans kapsamını seç.');const value=await request('/functions/v1/finance-read',{operationId:'getFinanceOperationalHealth',scope:{legalEntityId:s.legalEntityId,dealerAccountId:s.dealerAccountId,branchId:s.branchId},pathParams:{},query:{}});return financeHealth(value?.data??value);}
 };
}
