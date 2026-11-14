const DEFAULT_URL='https://bsjkohwbtrfwrqcyhsfz.supabase.co';
const DEFAULT_KEY='sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE';
const CONFIG_KEY='ototr-dealer-supabase-config-v1';
const SESSION_KEY='ototr-dealer-supabase-session-v1';

function parse(value,fallback=null){try{return JSON.parse(value||'')||fallback}catch{return fallback}}
export function browserRuntimeConfig(){
  const stored=parse(globalThis.localStorage?.getItem(CONFIG_KEY),'')||{};
  const runtime=globalThis.OTOTR_SUPABASE_CONFIG||{};
  return{url:String(runtime.url||stored.url||DEFAULT_URL).replace(/\/$/,''),key:String(runtime.key||stored.key||DEFAULT_KEY)};
}
function storedSession(){
  const direct=parse(globalThis.localStorage?.getItem(SESSION_KEY)||globalThis.sessionStorage?.getItem(SESSION_KEY));
  if(direct?.access_token||direct?.refresh_token)return direct;
  const ref=new URL(browserRuntimeConfig().url).hostname.split('.')[0];
  const native=parse(globalThis.localStorage?.getItem(`sb-${ref}-auth-token`)||globalThis.sessionStorage?.getItem(`sb-${ref}-auth-token`));
  return native?.currentSession||native?.session||native||null;
}
function tokenSubject(token){try{const raw=String(token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),payload=JSON.parse(globalThis.atob(raw));return payload.sub||''}catch{return''}}
function saveSession(session){
  const safe={access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at||Math.floor(Date.now()/1000)+(Number(session.expires_in)||3600),user:session.user?{id:session.user.id,email:session.user.email}:undefined};
  globalThis.localStorage?.setItem(SESSION_KEY,JSON.stringify(safe));return safe;
}
function clearSession(){
  globalThis.localStorage?.removeItem(SESSION_KEY);globalThis.sessionStorage?.removeItem(SESSION_KEY);
  const ref=new URL(browserRuntimeConfig().url).hostname.split('.')[0];
  globalThis.localStorage?.removeItem(`sb-${ref}-auth-token`);globalThis.sessionStorage?.removeItem(`sb-${ref}-auth-token`);
}
async function browserSession(fetchImpl=fetch){
  const config=browserRuntimeConfig(),session=storedSession();
  if(session?.access_token&&(!session.expires_at||Number(session.expires_at)>Date.now()/1000+60||Number(session.expires_at)>Date.now()+60000))return session;
  if(!session?.refresh_token)return null;
  const response=await fetchImpl(`${config.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||'ERP oturumu yenilenemedi.');
  return saveSession({...body,refresh_token:body.refresh_token||session.refresh_token});
}
export function createFranchiseLiveClient({config=browserRuntimeConfig(),getSession=browserSession,fetchImpl=fetch}={}){
  async function authRequest(path,{body,accessToken}={}){
    const response=await fetchImpl(`${config.url}${path}`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.msg||result?.message||result?.error_description||'ERP oturum işlemi tamamlanamadı.');return result;
  }
  async function signIn({email,password}){
    const normalized=String(email||'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(normalized)||String(password||'').length<8)throw new Error('Geçerli e-posta ve en az 8 karakter parola zorunludur.');
    const session=await authRequest('/auth/v1/token?grant_type=password',{body:{email:normalized,password:String(password)}});if(!session?.access_token||!session?.refresh_token)throw new Error('ERP oturumu oluşturulamadı.');return saveSession(session);
  }
  async function requestPasswordRecovery({email,redirectTo}){
    const normalized=String(email||'').trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(normalized))throw new Error('Geçerli e-posta zorunludur.');
    const redirect=String(redirectTo||'');const suffix=redirect?`?redirect_to=${encodeURIComponent(redirect)}`:'';await authRequest(`/auth/v1/recover${suffix}`,{body:{email:normalized}});return true;
  }
  async function signOut(){
    const session=await getSession(fetchImpl);try{if(session?.access_token)await authRequest('/auth/v1/logout',{accessToken:session.access_token})}finally{clearSession()}return true;
  }
  async function request(path,{method='GET',body,headers={}}={}){
    const session=await getSession(fetchImpl);if(!session?.access_token)throw new Error('ERP Supabase oturumu bulunamadı. Ana ERP ekranından giriş yapın.');
    const response=await fetchImpl(`${config.url}${path}`,{method,headers:{apikey:config.key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',...headers},body});
    const result=await response.json().catch(()=>null);if(!response.ok)throw new Error(result?.message||result?.hint||'Franchise canlı işlemi tamamlanamadı.');return result;
  }
  const rpc=(name,payload={})=>request(`/rest/v1/rpc/${name}`,{method:'POST',body:JSON.stringify(payload)});
  const listDepartmentResponsibilities=()=>request('/rest/v1/franchise_department_responsibilities?select=department_code,role_code,assignment_level,is_active,created_at&is_active=eq.true&order=department_code,assignment_level');
  const listDepartmentOwnerCandidates=()=>request('/rest/v1/rpc/list_franchise_department_owner_candidates',{method:'POST',body:'{}'});
  const listDepartmentStaffingRequirements=()=>request('/rest/v1/rpc/list_franchise_department_staffing_requirements',{method:'POST',body:'{}'});
  const listRoleStaffingGaps=()=>request('/rest/v1/rpc/list_franchise_role_staffing_gaps',{method:'POST',body:'{}'});
  const listUserInvitationRequests=()=>request('/rest/v1/rpc/list_franchise_user_invitation_requests',{method:'POST',body:'{}'});
  function requestUserInvitation({email,displayName,erpRole,requestKey=globalThis.crypto?.randomUUID?.()}){if(!/^[0-9a-f-]{36}$/i.test(requestKey||'')||!String(email||'').trim().toLowerCase().endsWith('@ototr.com')||String(displayName||'').trim().length<2||!String(erpRole||'').trim())throw new Error('Geçerli ad, @ototr.com e-posta ve ERP rolü zorunludur.');return request('/rest/v1/rpc/request_franchise_user_invitation',{method:'POST',body:JSON.stringify({p_request_key:requestKey,p_email:String(email).trim().toLowerCase(),p_display_name:String(displayName).trim(),p_erp_role:String(erpRole).trim().toUpperCase()})})}
  function reviewUserInvitation({requestId,decision,note}){const normalizedDecision=String(decision||'').trim().toLowerCase(),normalizedNote=String(note||'').trim();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId||'')||!['approved','rejected'].includes(normalizedDecision)||normalizedNote.length<10||normalizedNote.length>500)throw new Error('Geçerli talep, karar ve 10–500 karakter BT inceleme notu zorunludur.');return request('/rest/v1/rpc/review_franchise_user_invitation',{method:'POST',body:JSON.stringify({p_request_id:requestId,p_decision:normalizedDecision,p_note:normalizedNote})})}
  async function assignPrimaryDepartmentOwner({departmentCode,userId,note}){const session=await getSession(fetchImpl),actorId=String(session?.user?.id||tokenSubject(session?.access_token));if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId))throw new Error('ERP oturum kullanıcı kimliği doğrulanamadı.');return request('/rest/v1/rpc/assign_franchise_primary_department_owner',{method:'POST',body:JSON.stringify({p_department_code:departmentCode,p_user_id:userId,p_assignment_note:note})})}
  async function assignDepartmentRoster({roster}){const session=await getSession(fetchImpl),actorId=String(session?.user?.id||tokenSubject(session?.access_token));if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId))throw new Error('ERP oturum kullanıcı kimliği doğrulanamadı.');if(!Array.isArray(roster)||roster.length!==13||new Set(roster.map(x=>x.department_code)).size!==13||new Set(roster.map(x=>x.user_id)).size!==13)throw new Error('13 departman için 13 farklı ana sorumlu seçilmelidir.');return request('/rest/v1/rpc/assign_franchise_department_roster',{method:'POST',body:JSON.stringify({p_roster:roster})})}
  async function loadUat(releaseCandidate){
    const q=encodeURIComponent(releaseCandidate),[scenarios,results,signoffCatalog,signoffs,status,rosterReadiness]=await Promise.all([
      request('/rest/v1/franchise_uat_scenarios?select=scenario_code,title,owner_roles,reviewer_roles,expected_result&is_active=eq.true&order=scenario_code'),
      request(`/rest/v1/franchise_uat_results?select=id,release_candidate,scenario_code,revision,status,executor_id,executor_role,evidence_sha256,result_summary,checker_id,checker_role,checker_note,submitted_at,reviewed_at&release_candidate=eq.${q}&order=scenario_code`),
      request('/rest/v1/franchise_uat_signoff_catalog?select=signoff_role,authorized_roles,required_scenarios,sequence_no&order=sequence_no'),
      request(`/rest/v1/franchise_uat_signoffs?select=id,release_candidate,signoff_role,signer_id,signer_role,evidence_sha256,decision,note,signed_at&release_candidate=eq.${q}&order=signed_at`),
      request(`/rest/v1/franchise_uat_release_status_v?select=release_candidate,approved_scenarios,approved_signoffs,uat_ready&release_candidate=eq.${q}`),
      request('/rest/v1/rpc/list_franchise_uat_roster_readiness',{method:'POST',body:'{}'})
    ]);return{scenarios,results,signoffCatalog,signoffs,rosterReadiness,status:status[0]||{release_candidate:releaseCandidate,approved_scenarios:0,approved_signoffs:0,uat_ready:false}};
  }
  return Object.freeze({
    getSession:()=>getSession(fetchImpl),signIn,requestPasswordRecovery,signOut,
    listQueue:()=>rpc('list_public_franchise_intake_queue'),canonicalize:(payload)=>rpc('canonicalize_public_franchise_application',payload),loadUat,
    submitUatResult:payload=>rpc('submit_franchise_uat_result',payload),
    reviewUatResult:payload=>rpc('review_franchise_uat_result',payload),
    signUatRelease:payload=>rpc('sign_franchise_uat_release',payload),
    listDepartmentResponsibilities,listDepartmentOwnerCandidates,listDepartmentStaffingRequirements,listRoleStaffingGaps,listUserInvitationRequests,requestUserInvitation,reviewUserInvitation,assignPrimaryDepartmentOwner,assignDepartmentRoster
  });
}
export const franchiseLiveClient=createFranchiseLiveClient();
