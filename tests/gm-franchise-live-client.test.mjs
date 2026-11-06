import assert from'node:assert/strict';import test from'node:test';
import{createFranchiseLiveClient}from'../gm-franchise/franchise-live-client.mjs';

test('live client reuses authenticated ERP session and publishable key',async()=>{
 const calls=[],fetchImpl=async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>[]}};
 const client=createFranchiseLiveClient({config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>({access_token:'session-token'}),fetchImpl});
 await client.listQueue();assert.equal(calls[0].url,'https://project.supabase.co/rest/v1/rpc/list_public_franchise_intake_queue');
 assert.equal(calls[0].options.headers.apikey,'publishable');assert.equal(calls[0].options.headers.Authorization,'Bearer session-token');
});

test('canonicalization sends only explicit normalized fields',async()=>{
 let sent;const client=createFranchiseLiveClient({config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>({access_token:'session-token'}),fetchImpl:async(_url,options)=>{sent=JSON.parse(options.body);return{ok:true,json:async()=>"case-id"}}});
 const payload={p_source_application_id:'source',p_applicant_user_id:'applicant',p_candidate_name:'Normalized Company'};await client.canonicalize(payload);
 assert.deepEqual(sent,payload);assert.ok(!('phone'in sent));assert.ok(!('full_name'in sent));assert.ok(!('payload'in sent));
});

test('live client fails closed without ERP session',async()=>{
 const client=createFranchiseLiveClient({config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>null,fetchImpl:async()=>{throw new Error('network must not run')}});
 await assert.rejects(()=>client.listQueue(),/ERP Supabase oturumu bulunamadı/);
});

test('GM sign-in uses Supabase Auth and never persists the password',async()=>{
 const calls=[],saved=new Map(),previous=globalThis.localStorage;globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
 try{
  const client=createFranchiseLiveClient({
   config:{url:'https://project.supabase.co',key:'publishable'},
   fetchImpl:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({access_token:'access',refresh_token:'refresh',expires_in:3600,user:{id:'11111111-1111-4111-8111-111111111111',email:'gm@ototr.com'}})}}
  });
  await client.signIn({email:' GM@OTOTR.COM ',password:'correct-password'});
  assert.equal(calls[0].url,'https://project.supabase.co/auth/v1/token?grant_type=password');assert.equal(calls[0].options.headers.apikey,'publishable');assert.deepEqual(JSON.parse(calls[0].options.body),{email:'gm@ototr.com',password:'correct-password'});
  const persisted=[...saved.values()].join(' ');assert.doesNotMatch(persisted,/correct-password/);assert.match(persisted,/access/);
 }finally{globalThis.localStorage=previous}
});

test('password recovery is enumeration-safe and logout clears the browser session',async()=>{
 const calls=[],saved=new Map([['ototr-dealer-supabase-session-v1',JSON.stringify({access_token:'access',refresh_token:'refresh'})]]),previousLocal=globalThis.localStorage,previousSession=globalThis.sessionStorage;
 globalThis.localStorage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};globalThis.sessionStorage={getItem:()=>null,removeItem:()=>{}};
 try{
  const client=createFranchiseLiveClient({config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>({access_token:'access'}),fetchImpl:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({})}}});
  await client.requestPasswordRecovery({email:'gm@ototr.com',redirectTo:'https://example.test/gm-franchise/#organizasyon'});assert.match(calls[0].url,/\/auth\/v1\/recover\?redirect_to=/);assert.deepEqual(JSON.parse(calls[0].options.body),{email:'gm@ototr.com'});
  await client.signOut();assert.equal(calls[1].url,'https://project.supabase.co/auth/v1/logout');assert.equal(saved.has('ototr-dealer-supabase-session-v1'),false);
 }finally{globalThis.localStorage=previousLocal;globalThis.sessionStorage=previousSession}
});

test('live UAT workspace reads governed records and writes only through command RPCs',async()=>{
 const calls=[],fetchImpl=async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>url.includes('release_status')?[{approved_scenarios:0,approved_signoffs:0,uat_ready:false}]:[]}};
 const client=createFranchiseLiveClient({config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>({access_token:'session-token'}),fetchImpl});
 const workspace=await client.loadUat('rc-2026.11.05');assert.equal(workspace.status.uat_ready,false);assert.equal(calls.length,5);
 await client.submitUatResult({p_release_candidate:'rc-2026.11.05',p_scenario_code:'UAT-01',p_evidence_sha256:'a'.repeat(64),p_result_summary:'Sentetik UAT sonucu kanıtlandı.'});
 await client.reviewUatResult({p_result_id:'result-id',p_decision:'approved',p_checker_note:'Bağımsız inceleme tamamlandı.'});
 await client.signUatRelease({p_release_candidate:'rc-2026.11.05',p_signoff_role:'Franchise Sorumlusu',p_evidence_sha256:'b'.repeat(64),p_decision:'approved',p_note:'Departman kabulü tamamlandı.'});
 assert.match(calls[5].url,/rpc\/submit_franchise_uat_result$/);assert.match(calls[6].url,/rpc\/review_franchise_uat_result$/);assert.match(calls[7].url,/rpc\/sign_franchise_uat_release$/);
 for(const call of calls.slice(5))assert.equal(call.options.method,'POST');
});

test('department owner workspace reads privacy-minimized rows and binds assignment to session actor',async()=>{
 const calls=[],fetchImpl=async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>[]}},actor='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222';
 const client=createFranchiseLiveClient({config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>({access_token:'session-token',user:{id:actor}}),fetchImpl});
 await client.listDepartmentResponsibilities();assert.match(calls[0].url,/select=department_code,role_code,assignment_level,is_active,created_at/);assert.doesNotMatch(calls[0].url,/user_id/);
 await client.assignPrimaryDepartmentOwner({departmentCode:'finance',userId:owner,note:'Sentetik finans sorumlusu ataması'});const sent=JSON.parse(calls[1].options.body);assert.equal(calls[1].url,'https://project.supabase.co/rest/v1/rpc/assign_franchise_primary_department_owner');assert.deepEqual(sent,{p_department_code:'finance',p_user_id:owner,p_assignment_note:'Sentetik finans sorumlusu ataması'});
});

test('thirteen-owner roster is submitted through one atomic RPC',async()=>{
 const calls=[],actor='11111111-1111-4111-8111-111111111111',roster=Array.from({length:13},(_,i)=>({department_code:'department-'+i,user_id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,assignment_note:'Sentetik toplu kadro atama notu'}));
 const client=createFranchiseLiveClient({
  config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>({access_token:'session-token',user:{id:actor}}),
  fetchImpl:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({assignedDepartments:13,complete:true})}}
 });
 const result=await client.assignDepartmentRoster({roster});assert.equal(result.complete,true);assert.equal(calls.length,1);assert.match(calls[0].url,/rpc\/assign_franchise_department_roster$/);assert.deepEqual(JSON.parse(calls[0].options.body),{p_roster:roster});
});

test('department owner assignment fails closed without a valid session actor or department',async()=>{
 const client=createFranchiseLiveClient({config:{url:'https://project.supabase.co',key:'publishable'},getSession:async()=>({access_token:'bad-token'}),fetchImpl:async()=>{throw new Error('network must not run')}});await assert.rejects(()=>client.assignPrimaryDepartmentOwner({departmentCode:'finance',userId:'22222222-2222-4222-8222-222222222222',note:'Sentetik finans sorumlusu ataması'}),/oturum kullanıcı kimliği/);
});
