// Narrow regression for the production migration; synthetic users/cases only.
// Existing report triggers are not changed by this migration.
import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
if(!process.env.OTOTR_PGLITE_MODULE)throw Error('Set isolated OTOTR_PGLITE_MODULE.');
const{PGlite}=await import(pathToFileURL(process.env.OTOTR_PGLITE_MODULE).href);
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',ba='20000000-0000-4000-8000-000000000001',bb='20000000-0000-4000-8000-000000000002',ca='30000000-0000-4000-8000-000000000001',cb='30000000-0000-4000-8000-000000000002',ta='40000000-0000-4000-8000-000000000001',tb='40000000-0000-4000-8000-000000000002',owned='40000000-0000-4000-8000-000000000003';
test('claim migration preserves valid technician ownership and rejects cross-branch, missing branch, role and inactive access',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.app_users(id uuid primary key,auth_user_id uuid,role text,is_active boolean,branch_id uuid);
 create table public.expertise_cases(id uuid primary key,branch_id uuid);
 create table public.inspection_tasks(id uuid primary key,expertise_case_id uuid,owner_user_id uuid,claimed_at timestamptz,status text,release_reason text,released_by_user_id uuid,released_at timestamptz,ownership_history jsonb,audit_log jsonb);
 alter table public.inspection_tasks enable row level security;
 create function public.current_app_user_id() returns uuid language sql stable security definer as $$select id from public.app_users where auth_user_id=auth.uid() and is_active limit 1$$;
 create function public.current_app_user_role() returns text language sql stable security definer as $$select role from public.app_users where auth_user_id=auth.uid() and is_active limit 1$$;
 create function public.append_task_history(jsonb,text,uuid,uuid,uuid,text) returns jsonb language sql as $$select coalesce($1,'[]'::jsonb)||jsonb_build_array($2)$$;
 create function public.append_task_audit(jsonb,text,uuid,text) returns jsonb language sql as $$select coalesce($1,'[]'::jsonb)||jsonb_build_array($2)$$;
 create function public.log_task_audit(uuid,uuid,text,uuid,text,jsonb,jsonb) returns void language plpgsql as $$begin return;end$$;
 insert into public.app_users values('${a}','${a}','INSPECTION_TECHNICIAN',true,'${ba}'),('${b}','${b}','INSPECTION_TECHNICIAN',true,'${bb}');
 insert into public.expertise_cases values('${ca}','${ba}'),('${cb}','${bb}');
 insert into public.inspection_tasks(id,expertise_case_id,owner_user_id,status) values('${ta}','${ca}',null,'AVAILABLE'),('${tb}','${cb}',null,'AVAILABLE'),('${owned}','${ca}','${b}','OPEN');`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261123234547_inspection_claim_branch_scope_guard.sql',import.meta.url),'utf8'));
 await db.exec('set role anon');await assert.rejects(db.query('select public.claim_inspection_task($1)',[ta]),/permission denied/);
 await db.exec('reset role;set role authenticated');await assert.rejects(db.query('select public.claim_inspection_task($1)',[ta]),/Aktif kullanici/);
 await db.query("select set_config('test.uid',$1,false)",[a]);
 await assert.rejects(db.query('select public.claim_inspection_task($1)',[tb]),/sube kapsaminda/);
 await assert.rejects(db.query('select public.claim_inspection_task($1)',[owned]),/baska bir usta/);
 assert.equal((await db.query('select (public.claim_inspection_task($1)).owner_user_id as owner',[ta])).rows[0].owner,a);
 await db.exec(`reset role;update public.app_users set branch_id=null where id='${a}';set role authenticated`);await assert.rejects(db.query('select public.claim_inspection_task($1)',[ta]),/sube kapsaminda/);
 await db.exec(`reset role;update public.app_users set branch_id='${ba}',role='BRANCH_MANAGER' where id='${a}';set role authenticated`);await assert.rejects(db.query('select public.claim_inspection_task($1)',[ta]),/Sadece usta/);
 await db.exec(`reset role;update public.app_users set role=null where id='${a}';set role authenticated`);await assert.rejects(db.query('select public.claim_inspection_task($1)',[ta]),/Sadece usta/);
 await db.exec(`reset role;update public.app_users set role='INSPECTION_TECHNICIAN',is_active=false where id='${a}';set role authenticated`);await assert.rejects(db.query('select public.claim_inspection_task($1)',[ta]),/Aktif kullanici/);
 await db.exec('reset role');assert.equal((await db.query('select owner_user_id from public.inspection_tasks where id=$1',[tb])).rows[0].owner_user_id,null);
 }finally{await db.close();}
});
