// Isolated PostgreSQL test. Install @electric-sql/pglite in a separate test runtime;
// set OTOTR_PGLITE_MODULE to its dist/index.js. No credentials or live connection.
import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
const modulePath=process.env.OTOTR_PGLITE_MODULE;
if(!modulePath)throw Error('OTOTR_PGLITE_MODULE must point to isolated PGlite runtime.');
const{PGlite}=await import(pathToFileURL(modulePath).href);
const actor='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const sql=await readFile(new URL('../supabase/migrations/20261123231940_office_work_health_summary.sql',import.meta.url),'utf8');
test('Semantic TASK2 acceptance aggregate: deduplicated receipts, stale source, unresolved owner and isolated scope',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function app_private.franchise_office_manager() returns boolean language sql as $$select current_setting('test.hq',true)='yes'$$;
 create table public.app_users(id uuid,auth_user_id uuid,is_active boolean,branch_id uuid);
 create table app_private.isler24_tasks(id int,scope text,data jsonb,deleted_at timestamptz);
 grant usage on schema app_private,auth to authenticated;
 insert into public.app_users values('${actor}','${actor}',true,null),('${other}','${other}',true,'20000000-0000-4000-8000-000000000001');
 insert into app_private.isler24_tasks values
 (1,'hq','{"title":"PRIVATE TITLE","status":"yapilacak","who":"","due":"2000-01-01"}',null),
 (2,'hq','{"status":"devam","who":"${actor}","due":""}',null),
 (3,'hq','{"status":"bitti","who":"${actor}"}',null),
 (4,'hq','{"status":"yapilacak","who":"${other}","due":"2026-02-31"}',null),
 (5,'hq','{"status":"unknown"}',null),
 (6,'hq','{"status":"devam"}',now()),
 (7,'20000000-0000-4000-8000-000000000001','{"status":"devam"}',null);`);
 await db.exec(sql);
 await db.exec(`create table app_private.task2_workspace(scope text primary key,data jsonb,version bigint);
 insert into app_private.task2_workspace values ('hq','{"tasks":[{"title":"PRIVATE TITLE","status":"todo","assignee":"","due":"2000-01-01"},{"status":"progress","assignee":"${actor}","due":""},{"status":"done"},{"status":"review","assignee":"${other}","due":"2026-02-31"},{"status":"unknown"},{"status":"progress","archived":true}]}',1),('other','{"tasks":[{"status":"todo"}]}',1);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261124001351_office_task2_health_summary.sql',import.meta.url),'utf8'));
 await db.exec('alter table public.app_users add column role text;create table app_private.kokpit_roles(user_id uuid,role text)');
 await db.exec(await readFile(new URL('../supabase/migrations/20261124002206_task2_assignment_acceptance.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261124003032_office_task2_acceptance_summary.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261124003416_task2_semantic_assignment_revision.sql',import.meta.url),'utf8'));
 await db.exec(`update app_private.task2_workspace set data=jsonb_set(data,'{tasks,1,id}','"owned"') where scope='hq';
 insert into app_private.task2_assignment_receipts(scope,request_id,task_id,source_revision,actor_id)
 select 'hq','40000000-0000-4000-8000-000000000001','owned',app_private.task2_assignment_revision(data->'tasks'->1),'${actor}' from app_private.task2_workspace where scope='hq';
 insert into app_private.task2_assignment_receipts(scope,request_id,task_id,source_revision,actor_id)
 select scope,'40000000-0000-4000-8000-000000000002',task_id,source_revision,actor_id from app_private.task2_assignment_receipts;
 insert into app_private.task2_assignment_receipts(scope,request_id,task_id,source_revision,actor_id)
 select 'wrong-scope','40000000-0000-4000-8000-000000000003',task_id,source_revision,actor_id from app_private.task2_assignment_receipts limit 1;`);

 await db.exec('set role anon');await assert.rejects(db.query('select public.office_task2_health_summary()'),/permission denied/);
 await db.exec('reset role;set role authenticated');await assert.rejects(db.query('select public.office_task2_health_summary()'),/oturumu/);
 await db.query("select set_config('test.uid',$1,false)",[actor]);await db.exec("select set_config('test.hq','no',false)");await assert.rejects(db.query('select public.office_task2_health_summary()'),/oturumu/);
 await db.exec("select set_config('test.hq','yes',false)");
 const r=(await db.query('select public.office_task2_health_summary() as value')).rows[0].value;
 assert.equal(r.source,'task2');assert.equal(r.review_pending,1);assert.equal(r.archived,1);assert.equal(r.total,5);assert.equal(r.open,3);assert.equal(r.in_progress,1);assert.equal(r.reported_done,1);assert.equal(r.owner_missing,1);assert.equal(r.owner_unresolved,1);assert.equal(r.past_due,1);assert.equal(r.due_missing,1);assert.equal(r.due_invalid,1);assert.equal(r.unknown_status,1);assert.equal(r.acceptance_supported,true);assert.equal(r.accepted_open,1);assert.equal(r.acceptance_pending,0);assert.equal(r.acceptance_unavailable,2);assert.equal(r.evidence_supported,false);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE TITLE|10000000|20000000/);
 await assert.rejects(db.query('select * from app_private.isler24_tasks'),/permission denied/);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int as n from app_private.isler24_tasks')).rows[0].n,7);
 await db.exec(`update app_private.task2_workspace set data=jsonb_set(data,'{tasks,1,title}','"changed"') where scope='hq';set role authenticated`);const stale=(await db.query('select public.office_task2_health_summary() as v')).rows[0].v;assert.equal(stale.accepted_open,0);assert.equal(stale.acceptance_pending,1);await db.exec('reset role');
 await db.exec("update app_private.task2_workspace set version=0 where scope='hq';set role authenticated");await assert.rejects(db.query('select public.office_task2_health_summary()'),/doğrulanamadı/);
 await db.exec("reset role;update app_private.task2_workspace set version=1,data='{}' where scope='hq';set role authenticated");await assert.rejects(db.query('select public.office_task2_health_summary()'),/doğrulanamadı/);
 await db.exec('reset role');
 await db.exec(`update public.app_users set is_active=false where id='${actor}';set role authenticated`);await assert.rejects(db.query('select public.office_task2_health_summary()'),/aktif ERP/);
 }finally{await db.close();}
});
