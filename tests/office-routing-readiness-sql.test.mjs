import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.OTOTR_PGLITE_MODULE).href);
test('routing readiness uses auth identity, actual role eligibility and independent task permissions without granting access',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.app_users(id uuid,auth_user_id uuid,is_active boolean,branch_id uuid,role text);
 create table app_private.kokpit_roles(user_id uuid,role text);
 create table public.franchise_department_erp_role_eligibility(department_code text,erp_role text,is_active boolean);
 create table public.franchise_department_responsibilities(id uuid,department_code text,user_id uuid,assignment_level text,reports_to_id uuid,is_active boolean);
 insert into public.app_users values
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',true,null,'GENERAL_MANAGER'),
 ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',true,null,'FRANCHISE_SALES'),
 ('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',true,null,'FINANCE');
 insert into public.franchise_department_erp_role_eligibility values('franchise','FRANCHISE_SALES',true),('finance','FINANCE',true);
 create function app_private.franchise_office_manager() returns boolean language sql as $$select auth.uid()='20000000-0000-4000-8000-000000000001'::uuid$$;
 grant usage on schema app_private,auth to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261124011310_office_routing_readiness.sql',import.meta.url),'utf8'));
 const read=(actor='20000000-0000-4000-8000-000000000001')=>db.transaction(async tx=>{await tx.query("select set_config('test.uid',$1,true)",[actor]);await tx.exec('set local role authenticated');return (await tx.query('select public.office_routing_readiness() v')).rows[0].v;});
 await assert.rejects(read(''),/merkez/);await assert.rejects(read('20000000-0000-4000-8000-000000000003'),/merkez/);
 let result=await read();assert.equal(result.authorization_changed,false);assert.equal(result.departments.length,2);assert.ok(result.departments.every(d=>d.status==='owner_missing'));
 const finance=result.departments.find(d=>d.department==='finance');assert.equal(finance.eligible_accounts,1);assert.equal(finance.writable_accounts,0);
 assert.doesNotMatch(JSON.stringify(result),/10000000|20000000|user_id/);
 // Foreign key is auth.users.id, not app_users.id: reject a superficially plausible wrong mapping.
 await db.exec(`insert into public.franchise_department_responsibilities values('30000000-0000-4000-8000-000000000001','franchise','10000000-0000-4000-8000-000000000002','primary_responsible',null,true)`);
 const franchise=async()=> (await read()).departments.find(d=>d.department==='franchise');
 assert.equal((await franchise()).status,'identity_or_scope_invalid');
 await db.exec(`update public.franchise_department_responsibilities set user_id='20000000-0000-4000-8000-000000000002'`);
 assert.equal((await franchise()).status,'task_manager_access_missing');
 await db.exec(`insert into app_private.kokpit_roles values('10000000-0000-4000-8000-000000000002','yonetici')`);
 assert.equal((await franchise()).status,'verified');
 await db.exec(`update public.app_users set branch_id='40000000-0000-4000-8000-000000000001' where role='FRANCHISE_SALES'`);
 assert.equal((await franchise()).status,'identity_or_scope_invalid');
 await db.exec(`update public.app_users set branch_id=null where role='FRANCHISE_SALES';insert into public.franchise_department_responsibilities values('30000000-0000-4000-8000-000000000002','franchise','20000000-0000-4000-8000-000000000003','subordinate','30000000-0000-4000-8000-000000000001',true)`);
 assert.equal((await franchise()).status,'reporting_link_invalid');
 await db.exec(`update public.franchise_department_responsibilities set assignment_level='primary_responsible',reports_to_id=null where id='30000000-0000-4000-8000-000000000002'`);
 assert.equal((await franchise()).status,'owner_ambiguous');
 await db.exec('set role anon');await assert.rejects(db.query('select public.office_routing_readiness()'),/permission denied/);await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from app_private.kokpit_roles')).rows[0].n,1);
 }finally{await db.close();}
});
