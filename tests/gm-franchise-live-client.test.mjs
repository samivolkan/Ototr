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
