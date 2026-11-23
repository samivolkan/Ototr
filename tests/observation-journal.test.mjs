import test from'node:test';import assert from'node:assert/strict';import{validateJournal,observationStatus,journalRequest}from'../ajan-ofisi/observation-journal.mjs';
const at='2026-11-24T00:00:00Z',now=Date.parse(at),o={code:'past_due',value:1,version:1,state:'open',observed_at:at,first_seen_at:at,last_changed_at:at,acknowledged_at:null};
const data={mode:'source_observation_journal',observations:[o],events:[]};
test('journal validates source state and distinguishes receipt from completion and stale data',()=>{
 assert.ok(validateJournal(data));assert.equal(validateJournal({...data,observations:[o,o]}),false);assert.equal(validateJournal({...data,observations:[{...o,state:'resolved'}]}),false);assert.equal(validateJournal({...data,observations:[{...o,version:0}]}),false);assert.equal(validateJournal({...data,observations:[{...o,observed_at:'invalid'}]}),false);
 assert.match(observationStatus({...o,acknowledged_at:at},now),/işler hâlâ açık/);assert.match(observationStatus(o,now+180001),/eski/);assert.match(observationStatus({...o,state:'resolved',value:0},now),/Son kontrolde/);
});
test('journal API cannot choose a scope or send an unrecognized action; receipts preserve request identity',async()=>{
 const prevWindow=globalThis.window,prevFetch=globalThis.fetch;let calls=0;
 try{globalThis.window={};globalThis.fetch=async()=>{calls++;throw Error('Unexpected network');};await assert.rejects(journalRequest('send'));await assert.rejects(journalRequest('refresh',{scope:'other'}));await assert.rejects(journalRequest('ack',{p_code:'past_due',p_expected_version:0,p_request_id:'fake'}));await assert.rejects(journalRequest('refresh'),/oturumu/);assert.equal(calls,0);
 globalThis.window.OTOTRGetERPAuthSession=async()=>({access_token:'synthetic'});const payload={p_code:'past_due',p_expected_version:1,p_request_id:'30000000-0000-4000-8000-000000000001'};
 globalThis.fetch=async(url,opts)=>{calls++;assert.match(url,/ack_office_work_observation$/);assert.deepEqual(JSON.parse(opts.body),payload);return{ok:true,json:async()=>data};};assert.deepEqual(await journalRequest('ack',payload),data);assert.equal(calls,1);
 globalThis.fetch=async()=>({ok:true,json:async()=>({mode:'unknown'})});await assert.rejects(journalRequest('list'),/sözleşmesi/);
 }finally{globalThis.window=prevWindow;globalThis.fetch=prevFetch;}
});
