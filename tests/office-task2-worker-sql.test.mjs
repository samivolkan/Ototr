import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
if(!process.env.OTOTR_PGLITE_MODULE)throw Error('Set isolated OTOTR_PGLITE_MODULE.');
const{PGlite}=await import(pathToFileURL(process.env.OTOTR_PGLITE_MODULE).href);
const a='10000000-0000-4000-8000-000000000001';
test('TASK2 worker extension preserves bounded lifecycle and records only changed aggregates',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;create schema saha_private;create schema cron;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function app_private.franchise_office_manager() returns boolean language sql as $$select auth.uid() is not null$$;
 create table public.app_users(id uuid,auth_user_id uuid,is_active boolean,branch_id uuid);
 create table auth.users(id uuid,email text,email_confirmed_at timestamptz,is_anonymous boolean,deleted_at timestamptz,banned_until timestamptz);
 create table saha_private.members(email text,active boolean,role text,org_role text);
 create table app_private.isler24_tasks(id int,scope text,data jsonb,deleted_at timestamptz,version int default 1);
 create table cron.job(jobid bigint generated always as identity primary key,jobname text unique,schedule text,command text,active boolean default true);
 create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname,schedule,command) values($1,$2,$3) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command,active=true returning jobid$$;
 create function cron.unschedule(text) returns boolean language plpgsql as $$begin delete from cron.job where jobname=$1;return found;end$$;
 grant usage on schema auth,app_private to authenticated;
 insert into public.app_users values('${a}','${a}',true,null);
 insert into auth.users values('${a}','demo@example.invalid',now(),false,null,null);
 insert into saha_private.members values('demo@example.invalid',true,'admin','headquarters');
 insert into app_private.isler24_tasks(id,scope,data) values(1,'hq','{"status":"yapilacak","who":"${a}","due":"2000-01-01"}');
 insert into cron.job(jobname,schedule,command,active) values('existing-stopped-job','0 * * * *','select 1',false);`);
 await db.exec(`alter table public.app_users add column role text default 'OPERATIONS';
 create table app_private.task2_workspace(scope text primary key,data jsonb,version bigint,updated_at timestamptz,updated_by uuid);
 insert into app_private.task2_workspace values('hq','{"tasks":[{"id":"one","title":"Private synthetic task","assignee":"${a}","status":"progress"}]}',1,now(),null);`);
 for(const name of ['20261123231940_office_work_health_summary.sql','20261123233126_office_observation_journal.sql','20261123235055_office_readonly_worker.sql','20261124002206_task2_assignment_acceptance.sql','20261124003416_task2_semantic_assignment_revision.sql','20261124003803_task2_delivery_review.sql','20261124005937_task2_handoff.sql','20261124011906_office_decision_queue.sql','20261124013545_office_task2_worker_snapshot.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const call=async name=>(await db.query(`select public.${name}() as v`)).rows[0].v;
 const tick=async()=>{await db.exec("reset role;select set_config('test.uid','',false)");return(await db.query('select app_private.tick_office_readonly_worker() as v')).rows[0].v;};
 const session=async()=>{await db.exec(`select set_config('test.uid','${a}',false);set role authenticated`);};
 assert.equal((await db.query("select count(*)::int as n from cron.job where jobname='ototr-office-work-health-v1'")).rows[0].n,0);
 await db.exec('set role anon');await assert.rejects(call('start_office_readonly_worker'),/permission denied/);await db.exec('reset role;set role authenticated');await assert.rejects(call('start_office_readonly_worker'),/oturumu/);
 await session();assert.equal((await call('office_worker_status')).enabled,false);
 let status=await call('start_office_readonly_worker');assert.equal(status.enabled,true);assert.equal(status.scheduled,true);assert.equal(status.run_count,0);assert.ok(Date.parse(status.expires_at)>Date.now());
 await call('start_office_readonly_worker');await assert.rejects(db.query('select app_private.tick_office_readonly_worker()'),/permission denied/);await assert.rejects(db.query("select app_private.office_work_health_for_scope('other')"),/permission denied/);
 const result=await tick();assert.equal(result.ok,1);await session();status=await call('office_worker_status');assert.equal(status.run_count,1);assert.ok(status.last_success_at);
 assert.equal(status.task2.status,'ok');assert.equal(status.task2.snapshot.acceptance_pending,1);assert.equal(status.task2.snapshot.decision_admission,'not_configured');
 assert.doesNotMatch(JSON.stringify(status.task2),/10000000|Private synthetic/);
 await db.exec('reset role');await db.query("select app_private.collect_office_task2_snapshot('hq')");
 assert.equal((await db.query('select count(*)::int n from app_private.office_task2_worker_events')).rows[0].n,1);
 await db.exec(`update app_private.task2_workspace set data=jsonb_set(data,'{tasks,0,status}','"review"');
 insert into app_private.task2_deliveries(scope,task_id,source_revision,version,state,producer_id,evidence_reference,submitted_at) select 'hq','one',app_private.task2_assignment_revision(data->'tasks'->0),1,'submitted','${a}','private evidence',now() from app_private.task2_workspace;`);
 await db.query("select app_private.collect_office_task2_snapshot('hq')");await session();status=await call('office_worker_status');assert.equal(status.task2.snapshot.review_pending,1);
 await assert.rejects(db.query("select app_private.collect_office_task2_snapshot('hq')"),/permission denied/);
 await db.exec(`reset role;insert into app_private.office_decision_desks(scope,owner_id) values('hq','${a}');
 insert into app_private.office_decisions(scope,task_id,source_revision,delivery_version,decision_key,plan,priority,reserved_minutes,scheduled_day,state,created_by)
 select 'hq','one','synthetic',1,'key-'||i,'{}',2,1,(clock_timestamp() at time zone 'Europe/Istanbul')::date,'review_required','${a}' from generate_series(1,10) i;`);
 await db.query("select app_private.collect_office_task2_snapshot('hq')");await session();status=await call('office_worker_status');assert.equal(status.task2.snapshot.decision_admission,'queue_full');
 await db.exec(`reset role;update app_private.office_decisions set state='answered',actual_minutes=100,review_day=(clock_timestamp() at time zone 'Europe/Istanbul')::date`);
 await db.query("select app_private.collect_office_task2_snapshot('hq')");await session();status=await call('office_worker_status');assert.equal(status.task2.snapshot.decision_admission,'week_full');

 await db.exec(`reset role;update app_private.task2_workspace set data='{"tasks":null}'`);
 assert.equal((await db.query("select app_private.collect_office_task2_snapshot('hq') v")).rows[0].v,false);
 await session();status=await call('office_worker_status');assert.equal(status.task2.status,'error');assert.equal(status.task2.snapshot.review_pending,1);
 await db.exec(`reset role;update app_private.task2_workspace set data='{"tasks":[{"id":"one","assignee":"${a}","status":"progress"}]}'`);
 await db.query("select app_private.collect_office_task2_snapshot('hq')");
 assert.equal((await db.query('select kind from app_private.office_task2_worker_events order by id desc limit 1')).rows[0].kind,'recovered');
 await session();

 let journal=await call('list_office_work_observations');assert.equal(journal.events[0].origin,'worker');assert.equal(journal.observations[0].value,1);
 await call('refresh_office_work_observations');journal=await call('list_office_work_observations');assert.equal(journal.events.length,1);
 await db.exec('reset role;update saha_private.members set active=false');await tick();await session();status=await call('office_worker_status');assert.equal(status.enabled,false);assert.equal(status.last_status,'revoked');assert.equal(status.run_count,1);
 await db.exec('reset role;update saha_private.members set active=true');await session();await call('start_office_readonly_worker');await db.exec("reset role;update app_private.office_readonly_workers set expires_at=now()-interval '1 second'");await tick();await session();status=await call('office_worker_status');assert.equal(status.last_status,'expired');assert.equal(status.enabled,false);
 await call('start_office_readonly_worker');await call('stop_office_readonly_worker');assert.equal((await call('office_worker_status')).last_status,'stopped');
 await call('start_office_readonly_worker');await db.exec(`reset role;update app_private.task2_workspace set data='{"tasks":null}'`);
 for(let i=0;i<3;i++)assert.equal((await tick()).errors,1);await session();status=await call('office_worker_status');assert.equal(status.enabled,false);assert.equal(status.consecutive_failures,3);assert.equal(status.scheduled,false);
 await db.exec('reset role');assert.equal((await db.query("select active from cron.job where jobname='existing-stopped-job'")).rows[0].active,false);assert.equal((await db.query('select data->>\'status\' as s from app_private.isler24_tasks where id=1')).rows[0].s,'yapilacak');
 }finally{await db.close();}
});
