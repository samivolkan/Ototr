import {runtimeConfig} from '../franchise-aday-portali/applicant-portal-client.mjs';

const required=name=>{const value=process.env[name];if(!value)throw new Error(`${name} gerekli`);return value};
const email=required('FRANCHISE_HANDOFF_EMAIL'),password=required('FRANCHISE_HANDOFF_PASSWORD');
const sourceId=required('FRANCHISE_HANDOFF_SOURCE_ID'),applicantId=required('FRANCHISE_HANDOFF_APPLICANT_ID');
const config=runtimeConfig();
const auth=await fetch(`${config.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
const session=await auth.json().catch(()=>null);if(!auth.ok||!session?.access_token)throw new Error('Sentetik Franchise uzmanı oturumu açılamadı');
const headers={apikey:config.key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'};
const rpc=async(name,payload={})=>{const response=await fetch(`${config.url}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(payload)}),result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.message||`${name} başarısız`);return result};
const queue=await rpc('list_public_franchise_intake_queue'),item=queue.find(x=>x.source_application_id===sourceId);
if(!item||item.status!=='ready_for_canonicalization')throw new Error('Sentetik başvuru hazır kuyrukta bulunamadı');
const serialized=JSON.stringify(item);if(/full_name|phone|payload|request_meta/i.test(serialized))throw new Error('Kuyruk kişisel veya ham veri döndürdü');
const expected={budget_band:'5m_10m',equity_band:'3m_7m',management_experience_years:7,sector_experience:'automotive',company_status:'limited',location_status:'candidate_found',partnership_structure:'single'};
for(const[key,value]of Object.entries(expected))if(item[key]!==value)throw new Error(`Kuyruk profil alanı eşleşmedi: ${key}`);
const result=await rpc('canonicalize_public_franchise_application',{p_source_application_id:sourceId,p_applicant_user_id:applicantId,p_candidate_name:'Sentetik Kanonik Aday',p_contact_reference:'SYN-CONTACT-PROFILE-E2E',p_budget_band:item.budget_band,p_equity_band:item.equity_band,p_management_experience_years:item.management_experience_years,p_sector_experience:item.sector_experience,p_company_status:item.company_status,p_location_status:item.location_status,p_partnership_structure:item.partnership_structure,p_identity_verification_ref:'SYN-ID-VERIFIED',p_financial_document_ref:'SYN-FIN-VERIFIED'});
const caseId=String(result?.case_id||result?.id||result);if(!/^[0-9a-f-]{36}$/i.test(caseId))throw new Error('Kanonik dosya kimliği dönmedi');
const after=await rpc('list_public_franchise_intake_queue');if(after.some(x=>x.source_application_id===sourceId))throw new Error('Kanonikleştirilen başvuru açık kuyrukta kaldı');
console.log(JSON.stringify({authenticatedQueue:true,noRawPii:true,structuredProfile:true,canonicalized:true,removedFromOpenQueue:true,caseId}));
