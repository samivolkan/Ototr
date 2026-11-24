import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {randomUUID} from 'node:crypto';
const {PGlite}=await import(pathToFileURL(process.env.OTOTR_PGLITE_MODULE).href);
const owner='10000000-0000-4000-8000-000000000001',producer='10000000-0000-4000-8000-000000000002',reviewer='10000000-0000-4000-8000-000000000003';
async function fixture(){
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.app_users(id uuid,auth_user_id uuid,is_active boolean,branch_id uuid,role text);
 create table app_private.kokpit_roles(user_id uuid,role text);
 create table app_private.task2_workspace(scope text primary key,data jsonb,version bigint,updated_at timestamptz,updated_by uuid);
 create function app_private.franchise_office_manager() returns boolean language sql as $$select auth.uid() is not null$$;
 grant usage on schema app_private,auth to authenticated;
 insert into public.app_users values('${owner}','${owner}',true,null,'OPERATIONS'),('${producer}','${producer}',true,null,'GENERAL_MANAGER'),('${reviewer}','${reviewer}',true,null,'GENERAL_MANAGER');
 insert into app_private.task2_workspace values('hq','{"tasks":[{"id":"one","assignee":"${producer}","title":"Synthetic source","status":"review"}]}',1,now(),null);`);
 for(const f of ['20261124002206_task2_assignment_acceptance.sql','20261124003416_task2_semantic_assignment_revision.sql','20261124003803_task2_delivery_review.sql','20261124011906_office_decision_queue.sql','20261124012942_office_decision_owner_unique.sql','20261124013110_office_decision_desk_owner_access.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
 const revision=(await db.query("select app_private.task2_assignment_revision(data->'tasks'->0) r from app_private.task2_workspace")).rows[0].r;
 await db.query("insert into app_private.task2_deliveries(scope,task_id,source_revision,version,state,producer_id,evidence_reference,submitted_at,reviewer_id,review_note,reviewed_at) values('hq','one',$1,2,'reviewed',$2,'fixture:proof',now(),$3,'Synthetic review',now())",[revision,producer,reviewer]);
 const day=(await db.query("select to_char(clock_timestamp() at time zone 'Europe/Istanbul','YYYY-MM-DD') d")).rows[0].d;
 const plan={finding:'Source needs owner decision',evidence:'fixture:proof',recommendation:'Compare documented options',risk:'para',effort:'One hour estimated',decision:'Select policy reference; do not execute payment'};
 const payload=(key,minutes=1)=>({task_id:'one',source_revision:revision,delivery_version:2,decision_key:key,plan,priority:2,minutes,day});
 const call=(actor,action='read',payload={},id=null)=>db.transaction(async tx=>{await tx.query("select set_config('test.uid',$1,true)",[actor]);await tx.exec('set local role authenticated');return (await tx.query('select public.office_decision_queue($1,$2,$3) v',[action,JSON.stringify(payload),id])).rows[0].v;});
 return {db,call,payload,day};
}
test('shared queue requires owner initialization, source evidence and separate plan reviewer; no business action',async()=>{
 const {db,call,payload}=await fixture();try{
 assert.equal((await call(owner)).configured,false);await assert.rejects(call(producer,'enqueue',payload('key-1'),randomUUID()),/sahibi/);
 await call(owner,'initialize');await assert.rejects(call(owner,'enqueue',payload('owner-no-task-role'),randomUUID()),/yöneticisi/);await assert.rejects(call(producer,'initialize'),/başka/);
 await assert.rejects(call(producer,'enqueue',{...payload('key-1'),plan:{}},randomUUID()),/eksik/);
 await assert.rejects(call(producer,'enqueue',{...payload('key-1'),plan:{...payload('key-1').plan,evidence:'other'}},randomUUID()),/kanıtı/);
 const id=randomUUID(),request=payload('key-1');let s=await call(producer,'enqueue',request,id);
 assert.equal((await call(owner)).review_items[0].can_review,false);assert.equal(s.items.length,0);assert.equal(s.review_items.length,1);assert.equal(s.budget.pending,1);assert.equal(s.business_actions_executed,false);
 assert.equal((await call(producer,'enqueue',request,id)).review_items.length,1);
 await assert.rejects(call(producer,'enqueue',{...request,priority:1},id),/farklı/);
 await assert.rejects(call(producer,'enqueue',request,randomUUID()),/zaten/);
 let item=s.review_items[0];const review={id:item.id,version:item.version,note:'Checked all plan fields against source evidence'};
 await assert.rejects(call(producer,'review',review,randomUUID()),/üreten/);
 await assert.rejects(call(owner,'answer',{id:item.id,version:item.version,answer:'Too soon',minutes:1},randomUUID()),/değişti/);
 s=await call(reviewer,'review',review,randomUUID());assert.equal(s.items.length,1);assert.equal(s.review_items.length,0);item=s.items[0];
 await assert.rejects(call(reviewer,'answer',{id:item.id,version:item.version,answer:'Not owner',minutes:1},randomUUID()),/sahibi/);
 await db.exec(`update public.app_users set is_active=false where id='${reviewer}'`);await assert.rejects(call(owner,'answer',{id:item.id,version:item.version,answer:'Decision',minutes:1},randomUUID()),/bağımsız/);await db.exec(`update public.app_users set is_active=true where id='${reviewer}'`);
 s=await call(owner,'answer',{id:item.id,version:item.version,answer:'Use the existing approved policy; no execution authorized',minutes:7},randomUUID());assert.equal(s.budget.pending,0);assert.equal(s.budget.today_actual,7);assert.equal(s.budget.today_reserved,0);
 assert.equal((await db.query("select data->'tasks'->0->>'status' s from app_private.task2_workspace")).rows[0].s,'review');
 assert.equal((await db.query('select count(*)::int n from app_private.office_decision_events')).rows[0].n,3);
 await db.exec(`insert into app_private.task2_workspace select '30000000-0000-4000-8000-000000000001',data,version,updated_at,updated_by from app_private.task2_workspace where scope='hq';update public.app_users set branch_id='30000000-0000-4000-8000-000000000001' where id='${owner}'`);
 await assert.rejects(call(owner,'initialize'),/owner_unique/);
 assert.equal((await db.query('select count(*)::int n from app_private.office_decision_desks')).rows[0].n,1);
 await db.exec('set role anon');await assert.rejects(db.query('select public.office_decision_queue()'),/permission denied/);await db.exec('reset role');
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from app_private.office_decisions'),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
test('ten-item queue includes review backlog and rejects the eleventh; stale work remains visible until owner cancellation',async()=>{
 const {db,call,payload}=await fixture();try{
 await call(owner,'initialize');let s;for(let i=0;i<10;i++)s=await call(producer,'enqueue',payload('key-'+i),randomUUID());
 assert.equal(s.budget.pending,10);await assert.rejects(call(producer,'enqueue',payload('key-10'),randomUUID()),/10 madde/);
 const item=s.review_items[0];await db.exec(`update app_private.task2_workspace set data=jsonb_set(data,'{tasks,0,title}','"Changed source"')`);
 assert.equal((await call(owner)).review_items[0].source_current,false);
 await assert.rejects(call(reviewer,'review',{id:item.id,version:item.version,note:'Old source'},randomUUID()),/Kaynak/);
 s=await call(owner,'cancel',{id:item.id,version:item.version,answer:'Source changed; request must be rebuilt'},randomUUID());assert.equal(s.budget.pending,9);
 }finally{await db.close();}
});
test('shared time reservations enforce daily capacity and retain actual overrun truthfully',async()=>{
 const {db,call,payload}=await fixture();try{
 await call(owner,'initialize');let s=await call(producer,'enqueue',payload('key-large',45),randomUUID());
 await assert.rejects(call(producer,'enqueue',payload('key-extra'),randomUUID()),/süresi dolu/);
 let item=s.review_items[0];s=await call(reviewer,'review',{id:item.id,version:item.version,note:'Reviewed source and estimate'},randomUUID());item=s.items[0];
 s=await call(owner,'answer',{id:item.id,version:item.version,answer:'Record only; no external action',minutes:841},randomUUID());assert.equal(s.budget.week_actual,841);assert.equal(s.budget.today_actual,841);
 const nextDay=(await db.query("select to_char((clock_timestamp() at time zone 'Europe/Istanbul')::date+1,'YYYY-MM-DD') d")).rows[0].d;
 // A second day in the same week must also be blocked by the weekly budget.
 const sameWeek=(await db.query("select date_trunc('week',(clock_timestamp() at time zone 'Europe/Istanbul'))=date_trunc('week',(clock_timestamp() at time zone 'Europe/Istanbul')+interval '1 day') v")).rows[0].v;
 if(sameWeek)await assert.rejects(call(producer,'enqueue',{...payload('key-tomorrow'),day:nextDay},randomUUID()),/süresi dolu/);
 }finally{await db.close();}
});
