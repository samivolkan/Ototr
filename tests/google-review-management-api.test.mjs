import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';
import { edgeSource } from './helpers/edge-source.mjs';

const source = await readFile(new URL('../supabase/functions/google-business-oauth/index.ts', import.meta.url), 'utf8');
const javascript = await edgeSource(new URL('../supabase/functions/google-business-oauth/index.ts',import.meta.url));
const OWNER = '11111111-1111-4111-8111-111111111111';
const ITEM = '22222222-2222-4222-8222-222222222222';
const LEGAL = '33333333-3333-4333-8333-333333333333';
const BRANCH = 'branch-google-nilufer';
const CONNECTION = 'ototr-primary';
const STAMP = '2026-11-14T23:30:05.099964+00:00';
const clone = value => structuredClone(value);

function fixture(options = {}) {
  let handler;
  const tables = {
    google_business_connections: [{ id: CONNECTION, connected_by: OWNER, oauth_client_id: 'client', connected_at: STAMP, refresh_token_encrypted: 'must-not-leak' }],
    google_review_policies: [{ connection_id: CONNECTION, auto_reply_enabled: false, default_sla_hours: 24, approver_roles: ['GENERAL_MANAGER'], admin_user_ids: [OWNER], updated_at: STAMP }],
    google_review_audit_log: [],
    app_users: [{ id: ITEM, auth_user_id: OWNER, full_name: 'Test Owner', role: 'GENERAL_MANAGER', is_active: true, branch_id: null, email: 'private@example.invalid', phone: 'must-not-leak' }],
    google_review_bulk_jobs: [],
    google_review_email_outbox: [{ id: LEGAL, connection_id: CONNECTION, template_key: 'review', status: 'pending', created_at: STAMP, sent_at: null, body: 'private body', to_addresses: ['private@example.invalid'] }],
    google_review_work_items: [],
    google_review_management_resources: [],
    google_review_notifications: [],
    google_review_ai_generations: [],
    google_review_ai_outcomes: [],
    google_review_branch_registry: [],
    google_review_targets: [],
    google_review_collection_policies: [],
  };
  const writes = [], remote = [];
  let beforeUpdate = null, afterWrite = null;
  const db = { from(table) {
    assert.ok(Object.hasOwn(tables, table), `Unexpected table ${table}`);
    const predicates = [];
    let fields = '*', operation = 'select', values, single = false, maximum = Infinity, conflict;
    const query = {
      select(value = '*') { fields = value; return this; },
      eq(key, value) { predicates.push(row => row[key] === value); return this; },
      in(key, value) { predicates.push(row => value.includes(row[key])); return this; },
      order() { return this; }, limit(value) { maximum = value; return this; },
      maybeSingle() { single = true; return this; },
      update(value) { operation = 'update'; values = value; return this; },
      insert(value) { operation = 'insert'; values = value; return this; },
      upsert(value, options) { operation='upsert';values=value;conflict=options;return this; },
      then(resolve, reject) { return Promise.resolve().then(async () => {
        if (table === options.failTable) return { data: null, error: { code: 'XX000' } };
        if (operation === 'update' && beforeUpdate) { const fn = beforeUpdate; beforeUpdate = null; fn(table, tables); }
        let rows = tables[table].filter(row => predicates.every(predicate => predicate(row)));
        if (operation === 'insert') { const added = { updated_at:STAMP,...clone(values) }; tables[table].push(added); rows = [added]; }
        if (operation === 'upsert') {
          const keys=conflict.onConflict.split(',');
          const found=tables[table].find(row=>keys.every(key=>row[key]===values[key]));
          if(found){if(!conflict.ignoreDuplicates)Object.assign(found,clone(values));rows=[found];}
          else{const added={updated_at:STAMP,...(table==='google_review_management_resources'?{archived:false}:{}),...clone(values)};tables[table].push(added);rows=[added];}
        }
        if (operation === 'update') for (const row of rows) Object.assign(row, clone(values));
        if (operation !== 'select') writes.push({ table, values: clone(values), count: rows.length });
        if (operation !== 'select' && afterWrite) { const fn = afterWrite; afterWrite = null; await fn(table, tables); }
        const projected = rows.slice(0, maximum).map(row => fields === '*' ? clone(row) : Object.fromEntries(fields.split(',').map(field => [field, row[field]])));
        return { data: single ? projected[0] || null : projected, error: null };
      }).then(resolve, reject); },
    };
    return query;
  } };
  const env = { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'public', SUPABASE_SERVICE_ROLE_KEY: 'server-secret', GOOGLE_OAUTH_CLIENT_ID: options.rotated ? 'rotated-client' : 'client', OPENAI_API_KEY: 'private-ai-key', OPENAI_MODEL: 'fixture-model' };
  const context = vm.createContext({ URL, URLSearchParams, Request, Response, TextEncoder, TextDecoder, Uint8Array, AbortSignal, crypto: webcrypto,
    createClient: () => ({ ...db, auth: { getUser: async () => ({ data: { user: { id: options.user || OWNER, user_metadata: { role: 'admin' } } }, error: null }) } }),
    fetch: async (...args) => { remote.push(args); if(options.fetch)return options.fetch(...args);throw new Error('No remote writes allowed in management test'); },
    Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } },
  });
  vm.runInContext(`${javascript}\nglobalThis.api = { publishWork, assertNoLegalHold, activateBranchSettings, assertAutomaticReply };`, context);
  return { tables, writes, remote, context, db,
    race(fn) { beforeUpdate = fn; },
    afterWrite(fn) { afterWrite = fn; },
    async request(body, authenticated = true) {
      const response = await handler(new Request('https://fixture.invalid/functions/v1/google-business-oauth', { method: 'POST', headers: { 'content-type': 'application/json', ...(authenticated ? { authorization: 'Bearer fixture' } : {}) }, body: JSON.stringify(body) }));
      return { status: response.status, data: await response.json() };
    },
    item(extra = {}) { const value = { id: ITEM, connection_id: CONNECTION, branch_id: BRANCH, location_id: '123', account_id: '456', review_id: 'review', kind: 'reply', status: 'approval_pending', reply_text: 'Preserve this exact draft', note: '', review_snapshot: {}, version: 1, updated_at: STAMP, ...extra }; tables.google_review_work_items.push(value); return value; },
  };
}
const read = { action: 'management_read', branch_id: BRANCH };
const policy = { action: 'management_update', branch_id: BRANCH, entity: 'policy', expected_updated_at: STAMP, default_sla_hours: 48 };
const task = { action: 'management_update', branch_id: BRANCH, entity: 'task', item_id: LEGAL, expected_version: 1 };
const reject = { action: 'reject_draft', branch_id: BRANCH, item_id: ITEM, expected_version: 1, reason: 'Düzeltilecek içerik' };

const newBranch={action:'branch_create',id:'branch-custom-test-example1',name:'Örnek Şube',city:'Bursa',region:'Marmara',test_mode:true,target:30,sla_hours:24,interval_minutes:60,map:{lat:40.19,lng:29.06,address:'Örnek konum'}};

test('custom branch SLA has its own revision, survives reread and cannot overwrite a concurrent update',async()=>{
 const f=fixture(), b=(await f.request(newBranch)).data.item;
 const read=()=>f.request({action:'management_read',branch_id:b.id});
 assert.equal((await read()).data.policy.updated_at,b.updated_at);
 const change={action:'management_update',entity:'policy',branch_id:b.id,expected_updated_at:b.updated_at,default_sla_hours:48};
 assert.equal((await f.request(change)).status,200);
 assert.equal((await read()).data.policy.default_sla_hours,48);
 assert.equal(f.tables.google_review_policies[0].default_sla_hours,24);
 assert.equal((await f.request(change)).status,409);
 const stamp=(await read()).data.policy.updated_at;
 f.race((table,tables)=>{if(table==='google_review_branch_registry')tables[table][0].updated_at='2026-11-19T01:02:03Z';});
 assert.equal((await f.request({...change,expected_updated_at:stamp})).status,409);
 assert.equal(f.tables.google_review_branch_registry[0].sla_hours,48);
});

test('automatic publication requires enabled policy and exact verified safe AI output',async()=>{
 const f=fixture();f.tables.google_review_policies[0].auto_reply_enabled=true;
 const reply='Doğrulanmış örnek AI yanıtı';
 const hash=Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(reply))),b=>b.toString(16).padStart(2,'0')).join('');
 f.tables.google_review_ai_generations.push({id:LEGAL,connection_id:CONNECTION,branch_id:BRANCH,review_id:'review',context:'generate',status:'succeeded',reply_sha256:hash,requires_human_review:false});
 const item=f.item({draft_ready_at:'2026-01-01T00:00:00Z',auto_send_after:'2026-01-01T02:00:00Z',draft_source:'openai',reply_text:reply,review_snapshot:{rating:5,comment:'Memnunum.',ai_analysis:{generation_id:LEGAL,requires_human_review:false}}});
 await f.context.api.assertAutomaticReply(f.db,item);
 for(const patch of [{draft_source:'manual'},{reply_text:'Sonradan değiştirilen metin'},{review_snapshot:{...item.review_snapshot,rating:3}},{review_snapshot:{...item.review_snapshot,comment:'Avukatım dönüş yapacak.'}},{review_snapshot:{...item.review_snapshot,ai_analysis:{requires_human_review:false}}},{review_snapshot:{...item.review_snapshot,legal_hold:true}}])await assert.rejects(f.context.api.assertAutomaticReply(f.db,{...item,...patch}));
 f.tables.google_review_policies[0].auto_reply_enabled=false;
 await assert.rejects(f.context.api.assertAutomaticReply(f.db,item));
 assert.equal(f.remote.length,0);assert.equal(f.writes.length,0);
});

test('sample target persists only within its branch and stale saves fail',async()=>{
 const f=fixture(), b=(await f.request(newBranch)).data.item;
 const target=f.tables.google_review_targets[0];
 const save={action:'target_save',branch_id:b.id,month:target.month,target:40,expected_version:1};
 assert.equal((await f.request(save)).status,200);
 const list=await f.request({action:'targets_list',branch_id:b.id});
 assert.equal(list.data.items[0].target,40);assert.equal(list.data.items[0].version,2);
 assert.equal((await f.request(save)).status,409);
 assert.equal((await f.request({action:'targets_list',branch_id:BRANCH})).data.items.length,0);
 assert.equal(f.remote.length,0);
});

test('branch creation retry recovers partial defaults and never duplicates a branch or target',async()=>{
 const f=fixture();
 await f.request(newBranch);
 f.tables.google_review_management_resources.pop();f.tables.google_review_collection_policies.length=0;
 const retried=await f.request(newBranch);
 assert.equal(retried.status,200);assert.equal(retried.data.reused,true);
 assert.equal(f.tables.google_review_branch_registry.length,1);assert.equal(f.tables.google_review_targets.length,1);
 assert.equal(f.tables.google_review_management_resources.length,4);assert.equal(f.tables.google_review_collection_policies.length,1);
 assert.equal((await f.request({...newBranch,name:'Another name'})).status,409);
});

test('existing ERP defaults are reported honestly without fabricating missing branch settings',async()=>{
 const f=fixture(), result=await f.request({action:'branch_onboarding',branch_id:BRANCH});
 assert.equal(result.data.checklist.ai,true);assert.equal(result.data.sources.ai,'erp');
 assert.equal(result.data.collection.enabled,false);assert.equal(result.data.sources.collection,'default_disabled');
 assert.equal(result.data.checklist.target,false);
 assert.equal(f.writes.length,0);
});

test('Bursa-only access never grants access to a new branch',async()=>{
 const f=fixture({user:ITEM});grant(f,'admin');
 f.tables.google_review_branch_registry.push({...newBranch,id:newBranch.id,onboarding:{test:true}});
 for(const action of ['management_read','target_save','branch_onboarding','resource_save'])assert.equal((await f.request({action,branch_id:newBranch.id})).status,403);
 assert.equal(f.writes.length,0);
});

test('new-branch scoped grants do not require or confer Bursa access',async()=>{
 const f=fixture({user:ITEM});grant(f,'viewer');f.tables.google_review_management_resources[0].branch_id=newBranch.id;
 f.tables.google_review_branch_registry.push({...newBranch,connection_id:CONNECTION,onboarding:{test:true},updated_at:STAMP});
 assert.equal((await f.request({action:'management_read',branch_id:newBranch.id})).status,200);
 assert.equal((await f.request({action:'management_read',branch_id:BRANCH})).status,403);
});

test('Google activation verifies location AND account before admitting a new branch',async()=>{
 for(const mismatch of ['none','store','account']){
  const f=fixture({fetch:async(url,init)=>{
   assert.equal(init?.method||'GET','GET');
   if(String(url).includes('businessinformation'))return Response.json({name:'locations/789',storeCode:mismatch==='store'?'999':'456'});
   if(mismatch==='account')return Response.json({error:{message:'Account mismatch'}},{status:403});
   return Response.json({reviews:[]});
  }});
  vm.runInContext("decrypt=async()=> 'fixture';accessToken=async()=> 'fixture';",f.context);
  const b=(await f.request({...newBranch,test_mode:false,account_id:'123',store_code:'456',location_id:'789'})).data.item;
  const result=await f.request({action:'branch_activate',branch_id:b.id});
  assert.equal(result.status,mismatch==='none'?200:mismatch==='store'?409:403,JSON.stringify(result.data));
  assert.equal(f.tables.google_review_branch_registry[0].lifecycle,mismatch==='none'?'live':'live_candidate');
  if(mismatch==='none')assert.ok(f.tables.google_review_branch_registry[0].google_verified_at);
 }
});
test('branch onboarding persists map and all initial resources with no remote sends',async()=>{
 const f=fixture(), result=await f.request(newBranch);
 assert.equal(result.status,201,JSON.stringify(result.data));
 const b=result.data.item;
 assert.equal(b.onboarding.test,true);assert.equal(b.onboarding.map.lat,40.19);
 assert.equal(f.tables.google_review_management_resources.filter(r=>r.branch_id===b.id).length,4);
 assert.equal(f.tables.google_review_targets[0].target,30);
 assert.match(f.tables.google_review_targets[0].month,/^20\d{2}-\d{2}-01$/);
 assert.equal(f.tables.google_review_collection_policies[0].enabled,false);
 const check=await f.request({action:'branch_onboarding',branch_id:b.id});
 assert.equal(check.data.branch_id,b.id);assert.equal(check.data.checklist.target,true);
 assert.equal(check.data.checklist.live,false);
 for(const action of ['branch_activate','sync_reviews','publish_reply','collection_enqueue','prepare_draft']){
  const denied=await f.request({action,branch_id:b.id});
  assert.equal(denied.status,409,action+JSON.stringify(denied.data));
 }
 assert.equal(f.remote.length,0);
});
test('branch setup rejects unsafe coordinates, invalid targets and live IDs on a test branch',async()=>{
 for(const patch of [{target:'bad'},{target:0},{sla_hours:1.5},{interval_minutes:4},{map:{lat:'',lng:29}},{map:{lat:40,lng:181}},{account_id:'123'},{name:'x'}]){
  const f=fixture(), result=await f.request({...newBranch,...patch});
  assert.equal(result.status,400,JSON.stringify(patch)+JSON.stringify(result.data));
  assert.equal(f.tables.google_review_branch_registry.length,0);
 }
 const f=fixture();
 const result=await f.request({...newBranch,test_mode:false,account_id:'123',store_code:'456',location_id:'789'});
 assert.equal(result.status,201,JSON.stringify(result.data));
 assert.equal(result.data.item.lifecycle,'live_candidate');
});
test('branch edits are isolated, audited and reject stale writes',async()=>{
 const f=fixture(), created=await f.request(newBranch), row=created.data.item;
 const update={action:'branch_update',branch_id:row.id,expected_updated_at:row.updated_at,name:'Örnek Deneme Şubesi',map:{lat:40.2,lng:29.1,address:'Yeni örnek konum'}};
 assert.equal((await f.request({...update,expected_updated_at:'stale'})).status,409);
 const saved=await f.request(update);
 assert.equal(saved.status,200,JSON.stringify(saved.data));
 assert.equal(saved.data.item.name,'Örnek Deneme Şubesi');
 assert.equal(saved.data.item.onboarding.test,true);
 assert.equal(f.tables.google_review_targets[0].target,30);
 assert.equal(f.tables.google_review_branch_registry.length,1);
 assert.equal(f.remote.length,0);
});

test('verified branch activation advances the working lifecycle without losing its tone or SLA',async()=>{
 const f=fixture(),id='branch-custom-active-example';
 f.tables.google_review_management_resources.push({connection_id:CONNECTION,branch_id:id,kind:'branch_settings',key:'default',archived:false,version:3,data:{lifecycle:'live_candidate',tone:'empatik',sla_hours:48}});
 await f.context.api.activateBranchSettings(f.db,id,OWNER);
 const r=f.tables.google_review_management_resources[0];
 assert.deepEqual(r.data,{lifecycle:'live',tone:'empatik',sla_hours:48});
 assert.equal(r.version,4);
 await f.context.api.activateBranchSettings(f.db,id,OWNER);
 assert.equal(r.version,4);
});

function grant(f,role) {
  f.tables.app_users.push({id:LEGAL,auth_user_id:ITEM,full_name:'Scoped user',is_active:true,role:'EMPLOYEE'});
  f.tables.google_review_management_resources.push({id:LEGAL,connection_id:CONNECTION,branch_id:BRANCH,kind:'user_permissions',key:ITEM,archived:false,data:{user_id:ITEM,role,active:true}});
}
test('granted viewer can read but cannot mutate, reconnect Google, or promote their role',async()=>{
  const f=fixture({user:ITEM});grant(f,'viewer');
  assert.equal((await f.request(read)).status,200);
  for(const body of [policy,reject,{action:'start'},{action:'target_save',branch_id:BRANCH},{action:'resource_save',branch_id:BRANCH,resource:'user_permissions'}]) assert.equal((await f.request(body)).status,403);
  assert.equal(f.writes.length,0);
});
test('operator can update complaint work but cannot change legal holds or global policy',async()=>{
  const f=fixture({user:ITEM});grant(f,'operator');
  f.item({id:LEGAL,kind:'complaint',status:'open'});
  assert.equal((await f.request({...task,note:'Real task note'})).status,200);
  f.tables.google_review_work_items[0].kind='legal';
  assert.equal((await f.request({...task,expected_version:2,hold:true})).status,403);
  assert.equal((await f.request(policy)).status,403);
});
test('module admin changes policy but only connection owner can reconnect or manage grants',async()=>{
  const f=fixture({user:ITEM});grant(f,'admin');
  assert.equal((await f.request(policy)).status,200);
  assert.equal((await f.request({action:'start'})).status,403);
  assert.equal((await f.request({action:'resource_save',branch_id:BRANCH,resource:'user_permissions',expected_version:0,data:{user_id:ITEM,role:'admin',active:true}})).status,403);
});
test('deactivated granted users lose access immediately',async()=>{
  const f=fixture({user:ITEM});grant(f,'admin');f.tables.app_users[1].is_active=false;
  assert.equal((await f.request(read)).status,403);
});
test('paused Bursa blocks draft and public reply before any external call',async()=>{
  const f=fixture(); f.tables.google_review_management_resources.push({connection_id:CONNECTION,branch_id:BRANCH,kind:'branch_settings',key:'default',archived:false,data:{lifecycle:'paused'}});
  for(const action of ['prepare_draft','save_draft','publish_reply']) assert.equal((await f.request({action,branch_id:BRANCH})).status,409);
  assert.equal(f.remote.length,0);assert.equal(f.writes.length,0);
});

test('management requires authenticated server-authorized owner, ignores editable role metadata', async () => {
  assert.equal((await fixture().request(read, false)).status, 401);
  for (const action of [read, policy, task, reject]) assert.equal((await fixture({ user: ITEM }).request(action)).status, 403);
});
test('all management actions reject demo branches before mutations', async () => {
  const f = fixture();
  for (const action of [read, policy, task, reject]) assert.equal((await f.request({ ...action, branch_id: 'branch-google-gebze' })).status, 400);
  assert.equal(f.writes.length, 0);
});
test('read returns real safe policy/users/outbox and declares absent capabilities', async () => {
  const f = fixture({ rotated: true });
  const result = await f.request(read);
  assert.equal(result.status, 200);
  assert.equal(result.data.policy.default_sla_hours, 24);
  assert.equal(result.data.settings.google_connected, false);
  assert.equal(result.data.settings.openai_model, 'fixture-model');
  assert.equal(result.data.capabilities.templates, false);
  assert.equal(result.data.capabilities.auto_reply, false);
  assert.equal(result.data.users[0].google_management_enabled, true);
  assert.equal(result.data.notifications[0].status, 'pending');
  const encoded = JSON.stringify(result.data);
  for (const secret of ['must-not-leak', 'private@example', 'private body', 'private-ai-key', 'server-secret', 'admin_user_ids', 'auth_user_id']) assert.ok(!encoded.includes(secret), secret);
  assert.equal(f.remote.length, 0);
});
test('management fails visibly on database error instead of pretending lists are empty', async () => {
  assert.equal((await fixture({ failTable: 'app_users' }).request(read)).status, 503);
});
test('policy save persists audited SLA, preserves auto publication and access policy', async () => {
  const f = fixture();
  const result = await f.request(policy);
  assert.equal(result.status, 200);
  assert.equal(result.data.policy.default_sla_hours, 48);
  assert.equal(f.tables.google_review_policies[0].auto_reply_enabled, false);
  assert.deepEqual(f.tables.google_review_policies[0].admin_user_ids, [OWNER]);
  assert.equal(f.tables.google_review_audit_log[0].action, 'policy_update');
  assert.equal((await f.request(policy)).status, 409);
});
test('policy rejects privilege fields, invalid SLA and concurrent update', async () => {
  for (const value of [0, 169, 1.1, '24']) assert.equal((await fixture().request({ ...policy, default_sla_hours: value })).status, 400);
  assert.equal((await fixture().request({ ...policy, auto_reply_enabled: true })).status, 400);
  const f = fixture(); f.race((_, tables) => { tables.google_review_policies[0].updated_at = '2026-11-15T01:00:00Z'; });
  assert.equal((await f.request(policy)).status, 409);
});
test('legal hold persists on task and reply and blocks publication without remote calls', async () => {
  const f = fixture(), reply = f.item(); f.item({ id: LEGAL, kind: 'legal', status: 'open' });
  const result = await f.request({ ...task, hold: true });
  assert.equal(result.status, 200);
  assert.equal(result.data.item.review_snapshot.legal_hold, true);
  assert.equal(reply.review_snapshot.legal_hold, true);
  assert.equal(reply.version, 2);
  await assert.rejects(f.context.api.publishWork(f.db, { id: OWNER }, { item_id: ITEM, expected_version: 2, approved: true }, 'unused'), /Hukuki kilit/);
  assert.equal(f.remote.length, 0);
  assert.equal((await f.request({ ...task, expected_version: 2, status: 'done' })).status, 409);
  assert.equal((await f.request({ action: 'update_task', item_id: LEGAL, expected_version: 2, status: 'done' })).status, 409);
});
test('legal hold release allows audited task closure and preserves note if omitted', async () => {
  const f = fixture(), reply = f.item({ review_snapshot: { legal_hold: true } });
  f.item({ id: LEGAL, kind: 'legal', status: 'open', note: 'Existing note', review_snapshot: { legal_hold: true } });
  const result = await f.request({ ...task, hold: false, status: 'done' });
  assert.equal(result.status, 200);
  assert.equal(result.data.item.status, 'done');
  assert.equal(result.data.item.note, 'Existing note');
  assert.equal(reply.review_snapshot.legal_hold, false);
});
test('hold refuses in-flight publication or concurrent reply change', async () => {
  for (const status of ['publishing', 'publish_unknown', 'preparing']) {
    const f = fixture(); f.item({ status }); f.item({ id: LEGAL, kind: 'legal', status: 'open' });
    assert.equal((await f.request({ ...task, hold: true })).status, 409);
    assert.equal(f.tables.google_review_work_items[1].review_snapshot.legal_hold, true);
    assert.equal(f.tables.google_review_work_items[1].version, 2);
  }
  const f = fixture(); const reply = f.item(); f.item({ id: LEGAL, kind: 'legal', status: 'open' });
  f.race(() => { reply.status = 'publishing'; });
  assert.equal((await f.request({ ...task, hold: true })).status, 409);
  assert.equal(f.tables.google_review_work_items[1].review_snapshot.legal_hold, true);
  reply.status = 'publish_failed';
  const retry = await f.request({ ...task, expected_version: 2, hold: true });
  assert.equal(retry.status, 200);
  assert.equal(reply.review_snapshot.legal_hold, true);
});

test('a newly created reply sees the persisted legal hold before reply-row synchronization', async () => {
  const f = fixture(); f.item({ id: LEGAL, kind: 'legal', status: 'open' });
  f.afterWrite(async () => {
    f.item();
    await assert.rejects(f.context.api.publishWork(f.db, { id: OWNER }, { item_id: ITEM, expected_version: 1, approved: true }, 'unused'), /Hukuki kilit/);
  });
  const result = await f.request({ ...task, hold: true });
  assert.equal(result.status, 200);
  assert.equal(f.tables.google_review_work_items[1].review_snapshot.legal_hold, true);
  assert.equal(f.remote.length, 0);
});

test('a hold synchronization failure returns explicit saved partial state and can be retried', async () => {
  const f = fixture(), reply = f.item({ status: 'publishing' }); f.item({ id: LEGAL, kind: 'legal', status: 'open' });
  const partial = await f.request({ ...task, hold: true });
  assert.equal(partial.status, 409);
  assert.match(partial.data.error, /tercihi kaydedildi/);
  assert.equal(f.tables.google_review_work_items[1].review_snapshot.legal_hold, true);
  reply.status = 'publish_failed';
  const retry = await f.request({ ...task, expected_version: 2, hold: true });
  assert.equal(retry.status, 200);
  assert.equal(reply.review_snapshot.legal_hold, true);
});

test('legacy create and ID-based mutation endpoints enforce the demo boundary without external calls', async () => {
  for (const branch_id of ['branch-google-gebze', 'branch-google-inegol']) {
    const f = fixture(); f.item({ branch_id });
    for (const action of ['prepare_draft', 'save_draft', 'create_task']) {
      const result = await f.request({ action, branch_id, account_id: '123', location_id: '456', review_id: 'review', reply_text: 'demo', kind: 'legal' });
      assert.equal(result.status, 400, action);
    }
    for (const action of ['publish_reply', 'verify_reply', 'update_task', 'reject_draft']) {
      const result = await f.request({ action, branch_id: BRANCH, item_id: ITEM, expected_version: 1, approved: true, status: 'done', reason: 'demo' });
      assert.equal(result.status, 400, action);
    }
    const result = await f.request({ action: 'bulk_route', item_ids: [ITEM], idempotency_key: 'demo-boundary-test' });
    assert.equal(result.status, 400);
    assert.equal(f.writes.length, 0);
    assert.equal(f.remote.length, 0);
  }
});
test('task update rejects wrong kind, missing fields, invalid values and stale version', async () => {
  const f = fixture(); f.item({ id: LEGAL, kind: 'complaint', status: 'open' });
  assert.equal((await f.request(task)).status, 400);
  assert.equal((await f.request({ ...task, hold: true })).status, 400);
  assert.equal((await f.request({ ...task, status: 'resolved' })).status, 400);
  assert.equal((await f.request({ ...task, note: 'x'.repeat(2001) })).status, 400);
  assert.equal((await f.request({ ...task, status: 'done', expected_version: 2 })).status, 409);
  const result = await f.request({ ...task, status: 'done' });
  assert.equal(result.status, 200); assert.equal(result.data.item.version, 2);
});
test('reject preserves draft, records reason and audit, blocks publication until revised', async () => {
  const f = fixture(), reply = f.item();
  const result = await f.request(reject);
  assert.equal(result.status, 200);
  assert.equal(reply.reply_text, 'Preserve this exact draft');
  assert.equal(reply.review_snapshot.rejection.reason, reject.reason);
  assert.equal(reply.approved_by, null);
  assert.equal(reply.version, 2);
  assert.equal(f.tables.google_review_audit_log[0].action, 'reject_draft');
  await assert.rejects(f.context.api.publishWork(f.db, { id: OWNER }, { item_id: ITEM, expected_version: 2, approved: true }, 'unused'), /reddedilmiş/);
  assert.equal(f.remote.length, 0);
});
test('reject refuses published, uncertain, concurrent or reasonless draft', async () => {
  for (const status of ['published', 'publishing', 'publish_unknown', 'preparing']) {
    const f = fixture(); f.item({ status }); assert.equal((await f.request(reject)).status, 409);
  }
  const f = fixture(), reply = f.item();
  assert.equal((await f.request({ ...reject, reason: ' ' })).status, 400);
  assert.equal((await f.request({ ...reject, expected_version: 3 })).status, 409);
  f.race(() => { reply.status = 'publishing'; });
  assert.equal((await f.request(reject)).status, 409);
  assert.ok(!reply.review_snapshot.rejection);
});
