import {runtimeConfig} from '../franchise-aday-portali/applicant-portal-client.mjs';

const required=name=>{const value=process.env[name];if(!value)throw new Error(`${name} gerekli`);return value};
const maker={email:required('FRANCHISE_PORTAL_MAKER_EMAIL'),password:required('FRANCHISE_PORTAL_MAKER_PASSWORD')};
const applicant={email:required('FRANCHISE_PORTAL_APPLICANT_EMAIL'),password:required('FRANCHISE_PORTAL_APPLICANT_PASSWORD')};
const caseId=required('FRANCHISE_PORTAL_CASE_ID');
const applicantUserId=required('FRANCHISE_PORTAL_APPLICANT_USER_ID');
const config=runtimeConfig();

async function signIn(account){
  const response=await fetch(`${config.url}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify(account)});
  const session=await response.json().catch(()=>null);
  if(!response.ok||!session?.access_token)throw new Error(`Sentetik portal oturumu acilamadi (${response.status}: ${session?.error_code||session?.message||'bilinmeyen hata'})`);
  return session;
}

const headers=session=>({apikey:config.key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'});
async function rpc(session,name,payload={}){
  const response=await fetch(`${config.url}/rest/v1/rpc/${name}`,{method:'POST',headers:headers(session),body:JSON.stringify(payload)});
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.message||`${name} basarisiz`);
  return result;
}
async function expectDenied(session,name,payload){
  const response=await fetch(`${config.url}/rest/v1/rpc/${name}`,{method:'POST',headers:headers(session),body:JSON.stringify(payload)});
  if(response.ok)throw new Error(`${name} beklenen yetki reddini vermedi`);
  return true;
}
async function logout(session){
  const response=await fetch(`${config.url}/auth/v1/logout`,{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${session.access_token}`}});
  return response.ok;
}

const makerSession=await signIn(maker),applicantSession=await signIn(applicant);
let assignmentId='',itemId='';
try{
  await expectDenied(applicantSession,'create_franchise_portal_assignment',{p_case_id:caseId,p_branch_id:null,p_user_id:applicantUserId,p_persona:'applicant',p_scope:'application',p_reference_code:'SYN-PORTAL-WRAPPER-DENIED'});
  assignmentId=String(await rpc(makerSession,'create_franchise_portal_assignment',{p_case_id:caseId,p_branch_id:null,p_user_id:applicantUserId,p_persona:'applicant',p_scope:'application',p_reference_code:'SYN-PORTAL-WRAPPER-001'}));
  itemId=String(await rpc(makerSession,'create_franchise_portal_item',{p_assignment_id:assignmentId,p_item_type:'appointment',p_title:'Sentetik portal randevusu',p_safe_payload:{synthetic:true},p_due_at:null}));
  await expectDenied(makerSession,'complete_franchise_portal_item',{p_item_id:itemId,p_status:'confirmed',p_action_reference:null});
  await rpc(applicantSession,'complete_franchise_portal_item',{p_item_id:itemId,p_status:'confirmed',p_action_reference:null});
  await rpc(makerSession,'close_franchise_portal_assignment',{p_assignment_id:assignmentId,p_status:'completed'});
  const [makerLogout,applicantLogout]=await Promise.all([logout(makerSession),logout(applicantSession)]);
  console.log(JSON.stringify({makerAuthenticated:true,applicantAuthenticated:true,applicantCreateDenied:true,makerCompleteDenied:true,applicantCompletion:true,assignmentClosed:true,sessionsRevoked:makerLogout&&applicantLogout,assignmentId,itemId}));
}catch(error){
  await Promise.allSettled([logout(makerSession),logout(applicantSession)]);
  throw error;
}
