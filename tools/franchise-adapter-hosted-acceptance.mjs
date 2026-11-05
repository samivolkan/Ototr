import {FRANCHISE_EVENT_CONTRACTS} from '../supabase/functions/_shared/franchise-integration-contracts.mjs';
import {processOutboxBatch,SOURCE_ENV} from '../supabase/functions/franchise-outbox-worker/handler.mjs';

const endpoint='https://httpbin.org/anything';
const syntheticToken='synthetic-hosted-acceptance-token';
const values={
  payment_plan_id:'PAY-SYN',payment_verification_id:'VER-SYN',branch_id:'BR-SYN',due_diligence_id:'DD-SYN',contract_id:'CON-SYN',territory_id:'TER-SYN',
  staff_id:'STAFF-SYN',role_key:'manager',course_id:'COURSE-SYN',certificate_id:'CERT-SYN',site_visit_id:'SITE-SYN',trial_operation_id:'TRIAL-SYN',
  order_id:'ORDER-SYN',delivery_id:'DELIVERY-SYN',equipment_id:'EQUIP-SYN',calibration_id:'CAL-SYN',access_account_id:'ACCESS-SYN',
  brand_application_id:'BRAND-SYN',campaign_id:'CAMPAIGN-SYN',audit_id:'AUDIT-SYN',corrective_action_id:'CA-SYN',risk_assessment_id:'RISK-SYN',
  emergency_plan_id:'EMERGENCY-SYN',project_id:'PROJECT-SYN',handover_id:'HANDOVER-SYN',franchise_case_id:'CASE-SYN',chart_reference:'CHART-SYN',current_account_id:'CURRENT-SYN',reconciliation_id:'RECON-SYN'
};
const envValues={FRANCHISE_ADAPTER_ALLOWED_HOSTS:'httpbin.org'};
for(const[source,[urlKey,tokenKey]]of Object.entries(SOURCE_ENV)){envValues[urlKey]=endpoint;envValues[tokenKey]=syntheticToken}
const env=name=>envValues[name]||'';
const events=Object.entries(FRANCHISE_EVENT_CONTRACTS).map(([source,types],index)=>{
  const[event_type,definition]=Object.entries(types)[0],payload=Object.fromEntries(definition.required.map(key=>[key,values[key]||`${key}-SYN`]));
  return{id:`e2e-adapter-${String(index+1).padStart(2,'0')}`,franchise_case_id:'00000000-0000-4000-8000-000000000001',source,event_type,payload,contract_version:1,created_at:'2026-11-05T00:00:00Z',lease_token:`lease-${index+1}`};
});
const received=[],finished=[];
const fetcher=async(url,init)=>{
  for(let attempt=1;attempt<=3;attempt++){
    const response=await fetch(url,init),echo=await response.clone().json().catch(()=>null);
    const authorization=echo?.headers?.Authorization||echo?.headers?.authorization,idempotency=echo?.headers?.['Idempotency-Key']||echo?.headers?.['idempotency-key'];
    if(response.ok&&authorization===`Bearer ${syntheticToken}`&&idempotency&&echo?.json?.id===idempotency&&echo?.json?.franchiseCaseId==='00000000-0000-4000-8000-000000000001'){
      received.push({id:idempotency,status:response.status,attempt});return response;
    }
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,250*attempt));
  }
  throw new Error('Hosted echo güvenlik başlıklarını veya minimal olay gövdesini doğrulamadı');
};
const results=await processOutboxBatch(events,{env,fetcher,finish:async(id,leaseToken,success,error)=>finished.push({id,leaseToken,success,error})});
if(results.length!==events.length||received.length!==events.length||finished.length!==events.length||results.some(x=>!x.ok)||finished.some(x=>!x.success||x.error)){
  console.error(JSON.stringify({resultCount:results.length,receivedCount:received.length,finishedCount:finished.length,failures:results.filter(x=>!x.ok).map(x=>({id:x.id,error:x.error}))}));
  throw new Error('Tüm departman adaptör teslimleri tamamlanmadı');
}
console.log(JSON.stringify({sources:events.map(x=>x.source),delivered:received.length,finished:finished.length,allSuccessful:true,noProductionData:true}));
