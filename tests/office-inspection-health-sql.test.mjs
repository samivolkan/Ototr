import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
const{PGlite}=await import(pathToFileURL(process.env.OTOTR_PGLITE_MODULE).href);
test('inspection counts are branch-scoped, read-only and never assert physical delivery',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table app_users(id uuid,auth_user_id uuid,is_active boolean,branch_id uuid);
 create table expertise_cases(id int,branch_id uuid,revision_no int,status text,secretary_gate_ready boolean,payment_gate_ready boolean,kvkk_gate_ready boolean);
 create table inspection_tasks(id int,expertise_case_id int,owner_user_id uuid,status text);
 create table final_reports(id int,expertise_case_id int,revision_no int,status text,locked_at timestamptz,locked_by uuid);
 create function app_private.franchise_office_manager() returns boolean language sql as $$select auth.uid()='20000000-0000-4000-8000-000000000001'::uuid$$;
 create function public.current_user_can_access_branch(uuid) returns boolean language sql as $$select coalesce(current_setting('test.branch_access',true),'yes')<>'no'$$;
 grant usage on schema auth,app_private to authenticated;
 insert into app_users values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',true,'30000000-0000-4000-8000-000000000001');
 insert into expertise_cases values(1,'30000000-0000-4000-8000-000000000001',2,'COMPLETED',true,true,true),(2,'30000000-0000-4000-8000-000000000001',1,'DELIVERED',false,true,true),(3,'30000000-0000-4000-8000-000000000002',1,'OPEN',false,false,false),(4,'30000000-0000-4000-8000-000000000001',1,'CANCELLED',false,false,false);
 insert into inspection_tasks values(1,1,null,'COMPLETED'),(2,2,null,'AVAILABLE'),(3,3,null,'AVAILABLE'),(4,4,null,'AVAILABLE');
 insert into final_reports values(1,1,1,'LOCKED',now(),'10000000-0000-4000-8000-000000000001'),(2,2,1,'LOCKED',now(),'10000000-0000-4000-8000-000000000001');`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261124015715_office_inspection_health_summary.sql',import.meta.url),'utf8'));
 const read=(uid='20000000-0000-4000-8000-000000000001')=>db.transaction(async tx=>{await tx.query("select set_config('test.uid',$1,true)",[uid]);await tx.exec('set local role authenticated');return(await tx.query('select public.office_inspection_health_summary() v')).rows[0].v;});
 await assert.rejects(read(''),/merkez/);await assert.rejects(read('20000000-0000-4000-8000-000000000002'),/merkez/);
 const s=await read();assert.deepEqual(s.counts,{cases:2,intake_gates_unconfirmed:1,tasks:2,tasks_not_completed:1,tasks_without_owner:1,current_locked_report:1,report_version_unconfirmed:1,delivery_status_unverified:1});assert.equal(s.delivery_verified,false);assert.doesNotMatch(JSON.stringify(s),/30000000|owner_user_id|payload/);
 await db.exec("set test.branch_access='no'");await assert.rejects(read(),/Şube/);await db.exec("set test.branch_access='yes'");
 await db.exec('update app_users set branch_id=null');assert.equal((await read()).status,'branch_required');assert.equal((await read()).counts,null);
 await db.exec('insert into app_users select * from app_users');await assert.rejects(read(),/Tekil/);
 await db.exec('set role anon');await assert.rejects(db.query('select public.office_inspection_health_summary()'),/permission denied/);await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from expertise_cases')).rows[0].n,4);
 }finally{await db.close();}
});
