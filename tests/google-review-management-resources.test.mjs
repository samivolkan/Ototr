import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
const source=await readFile(new URL('../supabase/functions/_shared/review-management.ts',import.meta.url),'utf8');
const js=stripTypeScriptTypes(source.replace(/^export /gm,''),{mode:'transform'});
const context=vm.createContext({crypto:webcrypto});vm.runInContext(js+'\nglobalThis.api={handleReviewManagement,loadReviewAccess,assertReviewLifecycle,validateResource};',context);const api=context.api;
const OWNER='11111111-1111-4111-8111-111111111111',USER='22222222-2222-4222-8222-222222222222',OTHER='33333333-3333-4333-8333-333333333333',ID='44444444-4444-4444-8444-444444444444',WORK='55555555-5555-4555-8555-555555555555';
const BRANCH='branch-google-nilufer',CONN='ototr-primary',RESOURCE='google_review_management_resources';
const plain=x=>JSON.parse(JSON.stringify(x));
const data={
 templates:{name:'Teşekkür',category:'olumlu',body:'Merhaba {{musteri_adi}}. {{sube_adi}} olarak teşekkür ederiz.',scope:'branch'},
 experiments:{name:'Ton deneyi',variant_a:'Sıcak',variant_b:'Kısa',status:'draft',traffic_percent:50},
 escalation_rules:{name:'SLA',event:'sla_overdue',after_hours:4,to_role:'GENERAL_MANAGER',enabled:true},
 notification_rules:{user_id:USER,event:'sla_overdue',enabled:true,channels:['in_app']},
 store_groups:{name:'Bursa',branch_ids:[BRANCH]},
 branch_settings:{lifecycle:'active',tone:'inherit',sla_hours:24},
 delegations:{from_user_id:OWNER,to_user_id:USER,starts_at:'2026-01-01T00:00:00Z',ends_at:'2026-12-31T00:00:00Z',scope:'approvals',active:true},
 legal_cases:{work_item_id:WORK,category:'İnceleme',notes:'Not',stage:'open'},
 complaints:{work_item_id:WORK,category:'Bekleme',notes:'Not',stage:'received',severity:'normal'},
 compensations:{work_item_id:WORK,amount:123.45,currency:'TRY',reason:'Telafi önerisi',status:'proposed'},
 retention_policy:{review_days:365,closed_task_days:365,audit_days:730},
 user_permissions:{user_id:USER,role:'operator',active:true},
 ai_config:{persona:'Kısa ve doğal',banned_words:['garanti'],knowledge_lock:'Yalnızca doğrulanmış şube bilgileri'},
};
function fixture({user=OWNER,role='admin',canAdmin=true,canManageGrants=true}={}){
 const tables={[RESOURCE]:[],google_review_notifications:[],google_review_work_items:[],google_review_audit_log:[],google_reviews:[],google_review_policies:[{connection_id:CONN,default_sla_hours:24}],app_users:[{id:OWNER,auth_user_id:OWNER,full_name:'Owner',role:'GENERAL_MANAGER',is_active:true},{id:USER,auth_user_id:USER,full_name:'User',role:'OPERATIONS',is_active:true},{id:OTHER,auth_user_id:OTHER,full_name:'Other',role:'OPERATIONS',is_active:false}]};
 const mutations=[],rpcs=[];
 const db={from(table){assert.ok(tables[table],table);let filters=[],columns='*',single=false,payload,operation='select',start=0,end=Infinity,count=false;
  const q={select(c='*',o={}){columns=c;count=o.count==='exact';return this;},eq(k,v){filters.push(r=>r[k]===v);return this;},in(k,v){filters.push(r=>v.includes(r[k]));return this;},lt(k,v){filters.push(r=>r[k]<v);return this;},order(){return this;},range(a,b){start=a;end=b+1;return this;},limit(n){end=n;return this;},maybeSingle(){single=true;return this;},update(v){operation='update';payload=v;return this;},insert(v){operation='insert';payload=v;return this;},then(resolve,reject){return Promise.resolve().then(()=>{let selected=tables[table].filter(r=>filters.every(f=>f(r)));if(operation==='update'){for(const r of selected)Object.assign(r,plain(payload));}if(operation==='insert'){selected=[{id:webcrypto.randomUUID(),...plain(payload)}];tables[table].push(...selected);}if(operation!=='select')mutations.push({table,operation,payload:plain(payload)});const total=selected.length;selected=selected.slice(start,end).map(r=>columns==='*'?plain(r):Object.fromEntries(columns.split(',').map(c=>[c,r[c]])));return{data:single?selected[0]||null:selected,error:null,...count?{count:total}:{}};}).then(resolve,reject);}};return q;
 },async rpc(name,p){rpcs.push({name,p:plain(p)});if(name==='google_review_run_escalation')return{data:{created:0,evaluated:0},error:null};assert.equal(name,'google_review_save_resource');let existing=tables[RESOURCE].find(r=>r.id===p.p_id);if(!p.p_expected_version&&existing){if(existing.version===1&&JSON.stringify(existing.data)===JSON.stringify(p.p_data))return{data:{resource:plain(existing),replayed:true},error:null};return{data:null,error:{code:'40001'}};}if(p.p_expected_version&&(!existing||existing.version!==p.p_expected_version))return{data:null,error:{code:'40001'}};if(!existing&&tables[RESOURCE].some(r=>r.kind===p.p_kind&&r.key===p.p_key))return{data:null,error:{code:'23505'}};const item=p.p_work_id?tables.google_review_work_items.find(r=>r.id===p.p_work_id):null;if(item&&(item.version!==p.p_expected_work_version||(p.p_work_status==='done'&&item.review_snapshot?.legal_hold)))return{data:null,error:{code:'40001'}};if(existing){Object.assign(existing,{data:p.p_data,version:existing.version+1});}else{existing={id:p.p_id,connection_id:p.p_connection_id,branch_id:p.p_branch_id,kind:p.p_kind,key:p.p_key,data:p.p_data,version:1,archived:false};tables[RESOURCE].push(existing);}if(item){item.status=p.p_work_status;item.version++;item.note=p.p_data.notes;}mutations.push({table:RESOURCE,operation:'rpc'});return{data:{resource:plain(existing),item:item?plain(item):null},error:null};}};
 const connection={id:CONN,connected_by:OWNER};const ctx={db,connection,user:{id:user},role,canAdmin,canManageGrants};
 return{db,ctx,tables,mutations,rpcs,call(body){return api.handleReviewManagement({...ctx,body:{branch_id:BRANCH,...body}});},resource(kind,extra={}){const row={id:webcrypto.randomUUID(),connection_id:CONN,branch_id:BRANCH,kind,key:kind==='user_permissions'?USER:'default',data:plain(data[kind]),version:1,archived:false,...extra};tables[RESOURCE].push(row);return row;},work(extra={}){const row={id:WORK,connection_id:CONN,branch_id:BRANCH,kind:'reply',status:'approval_pending',review_id:'review',review_snapshot:{reviewer_name:'Test'},reply_text:'Old',version:1,created_at:'2020-01-01T00:00:00Z',updated_at:'2020-01-01T00:00:00Z',...extra};tables.google_review_work_items.push(row);return row;}};
}
test('strict resource validators accept all thirteen documented domains and reject arbitrary fields',()=>{
 for(const[kind,d]of Object.entries(data)){assert.ok(api.validateResource(kind,d));assert.throws(()=>api.validateResource(kind,{...d,api_key:'secret'}),/Desteklenmeyen/);}
 assert.throws(()=>api.validateResource('unknown',{}),/Desteklenmeyen/);
 for(const patch of [{branch_ids:['branch-google-gebze']},{branch_ids:[]},{branch_ids:[BRANCH,'branch-google-inegol']}])assert.throws(()=>api.validateResource('store_groups',{...data.store_groups,...patch}));
 assert.throws(()=>api.validateResource('notification_rules',{...data.notification_rules,channels:['email']}));
 assert.throws(()=>api.validateResource('experiments',{...data.experiments,variant_b:'Sıcak'}));
 assert.throws(()=>api.validateResource('branch_settings',{...data.branch_settings,sla_hours:0}));
 assert.throws(()=>api.validateResource('compensations',{...data.compensations,status:'recorded'}));
});
test('extended read is scope isolated, returns real resource rows and private actor inbox only',async()=>{
 const f=fixture();f.resource('templates');f.resource('templates',{branch_id:'branch-google-gebze'});f.tables.google_review_notifications.push({id:ID,user_id:OWNER,connection_id:CONN,branch_id:BRANCH},{id:OTHER,user_id:USER,connection_id:CONN,branch_id:BRANCH});
 const result=await f.call({action:'management_extended_read'});assert.equal(result.branch_id,BRANCH);assert.equal(result.resources.templates.length,1);assert.equal(result.notifications.length,1);assert.equal(result.actor.id,OWNER);assert.ok(result.users.every(u=>!u.email&&!u.phone));
 await assert.rejects(f.call({action:'management_extended_read',branch_id:'branch-google-gebze'}),/yalnızca canlı Bursa/);
});
test('resources save persistently with CAS and caller ID retry, rejecting stale updates',async()=>{
 const f=fixture();const body={action:'resource_save',resource:'templates',id:ID,expected_version:0,data:data.templates};const created=await f.call(body);assert.equal(created.resource.version,1);assert.equal(created.resource.id,ID);
 const again=await f.call(body);assert.equal(again.replayed,true);assert.equal(f.tables[RESOURCE].length,1);
 const edit={...body,expected_version:1,data:{...data.templates,name:'Yeni'}};assert.equal((await f.call(edit)).resource.version,2);await assert.rejects(f.call(edit),/Kayıt değişti/);
});
test('viewer and operator cannot change admin configuration; grants require owner',async()=>{
 for(const role of['viewer','operator','legal']){const f=fixture({role,canAdmin:false,canManageGrants:false});await assert.rejects(f.call({action:'resource_save',resource:'templates',expected_version:0,data:data.templates}),e=>e.status===403);}
 const f=fixture({user:USER,role:'admin',canAdmin:true,canManageGrants:false});await assert.rejects(f.call({action:'resource_save',resource:'user_permissions',expected_version:0,data:data.user_permissions}),e=>e.status===403);
 const own=fixture();await assert.rejects(own.call({action:'resource_save',resource:'user_permissions',expected_version:0,data:{...data.user_permissions,user_id:OWNER}}),/sahibinin erişimi/);
 await assert.rejects(own.call({action:'resource_save',resource:'user_permissions',expected_version:0,data:{...data.user_permissions,user_id:OTHER}}),/Etkin ERP/);
});
test('grant access rejects inactive users and returns null for no grant; owners need no resource lookup',async()=>{
 const f=fixture();const input={db:f.db,connection:f.ctx.connection,allowlist:[]};assert.equal((await api.loadReviewAccess({...input,userId:OWNER})).is_owner,true);assert.equal(await api.loadReviewAccess({...input,userId:USER}),null);
 const grant=f.resource('user_permissions');assert.equal((await api.loadReviewAccess({...input,userId:USER})).role,'operator');grant.data.active=false;assert.equal(await api.loadReviewAccess({...input,userId:USER}),null);grant.data.active=true;f.tables.app_users.find(u=>u.auth_user_id===USER).is_active=false;assert.equal(await api.loadReviewAccess({...input,userId:USER}),null);
});
test('delegation is time bounded and provides approval capability without admin settings role',async()=>{
 const f=fixture();const now=Date.now(),delegation=f.resource('delegations',{data:{...data.delegations,starts_at:new Date(now-60000).toISOString(),ends_at:new Date(now+60000).toISOString()}});const input={db:f.db,connection:f.ctx.connection,allowlist:[],userId:USER};
 const access=await api.loadReviewAccess(input);assert.equal(access.role,'operator');assert.equal(access.can_approve,true);assert.equal(access.is_owner,false);delegation.data.ends_at=new Date(now-1).toISOString();assert.equal(await api.loadReviewAccess(input),null);
});
test('lifecycle stops template application and manual escalation; absent setting is active',async()=>{
 const f=fixture();assert.equal(await api.assertReviewLifecycle(f.ctx),null);f.resource('branch_settings',{data:{...data.branch_settings,lifecycle:'paused'}});await assert.rejects(api.assertReviewLifecycle(f.ctx),e=>e.status===409);await assert.rejects(f.call({action:'escalation_run'}),e=>e.status===409);await assert.rejects(f.call({action:'template_apply'}),e=>e.status===409);assert.equal(f.mutations.length,0);
});
test('case metadata and real task status use the same atomic RPC version guard',async()=>{
 const f=fixture();const item=f.work({kind:'legal',status:'open',review_snapshot:{legal_hold:true}});const body={action:'resource_save',resource:'legal_cases',expected_version:0,expected_work_version:1,data:{...data.legal_cases,stage:'closed'}};
 await assert.rejects(f.call(body),e=>e.status===409);assert.equal(f.tables[RESOURCE].length,0);assert.equal(item.status,'open');item.review_snapshot.legal_hold=false;const result=await f.call(body);assert.equal(result.item.status,'done');assert.equal(result.item.version,2);assert.equal(result.resource.data.stage,'closed');
});
test('template application preserves hold, clears rejection, appends signature, never publishes',async()=>{
 const f=fixture();const template=f.resource('templates',{id:ID});const item=f.work({review_snapshot:{reviewer_name:'Test',legal_hold:true,rejection:{reason:'edit'}}});
 const result=await f.call({action:'template_apply',id:ID,expected_version:1,work_item_id:WORK,expected_work_version:1,variant:'a'});assert.ok(result.item.reply_text.includes('Merhaba Test'));assert.ok(result.item.reply_text.endsWith('OTOTR Bursa Nilüfer Otoekspertiz Ekibi'));assert.equal(result.item.review_snapshot.legal_hold,true);assert.equal(result.item.review_snapshot.rejection,undefined);assert.equal(result.item.status,'approval_pending');assert.equal(result.item.version,2);assert.equal(f.tables.google_review_audit_log[0].action,'template_apply');
 await assert.rejects(f.call({action:'template_apply',id:ID,expected_version:1,work_item_id:WORK,expected_work_version:1,variant:'a'}),e=>e.status===409);assert.equal(item.version,2);
});
test('notification reads cannot mark another recipient notification',async()=>{
 const f=fixture();f.tables.google_review_notifications.push({id:ID,connection_id:CONN,branch_id:BRANCH,user_id:USER,read_at:null});await assert.rejects(f.call({action:'notification_read',id:ID,read:true}),e=>e.status===404);assert.equal(f.tables.google_review_notifications[0].read_at,null);f.tables.google_review_notifications[0].user_id=OWNER;assert.ok((await f.call({action:'notification_read',id:ID,read:true})).notification.read_at);
});
test('retention preview excludes unresolved and held records and never deletes',async()=>{
 const f=fixture();await assert.rejects(f.call({action:'retention_preview'}),/Önce saklama/);f.resource('retention_policy');f.work({review_id:'protected',kind:'legal',status:'open',review_snapshot:{legal_hold:true}});f.work({id:ID,review_id:'closed',status:'published'});f.tables.google_reviews.push({id:'protected',branch_id:BRANCH,review_date:'2020-01-01'},{id:'closed',branch_id:BRANCH,review_date:'2020-01-01'},{id:'demo',branch_id:'branch-google-gebze',review_date:'2020-01-01'});
 const result=await f.call({action:'retention_preview'});assert.equal(result.destructive,false);assert.equal(result.candidates.reviews,1);assert.equal(result.candidates.closed_tasks,1);assert.equal(result.protected_reviews,1);assert.equal(f.mutations.length,0);
});
test('archiving resource uses optimistic version and preserves protected settings',async()=>{
 const f=fixture();const row=f.resource('templates',{id:ID});await assert.rejects(f.call({action:'resource_archive',resource:'templates',id:ID,expected_version:2}),e=>e.status===409);const archived=await f.call({action:'resource_archive',resource:'templates',id:ID,expected_version:1});assert.equal(archived.resource.archived,true);assert.equal(row.version,2);
 f.resource('user_permissions',{id:OTHER});await assert.rejects(f.call({action:'resource_archive',resource:'user_permissions',id:OTHER,expected_version:1}),/durumunu değiştirin/);
});
test('manual escalation calls the same database worker used by the scheduled cron',async()=>{
 const f=fixture();const result=await f.call({action:'escalation_run'});assert.equal(result.created,0);assert.equal(f.rpcs[0].name,'google_review_run_escalation');assert.equal(f.rpcs[0].p.p_connection_id,CONN);
});
