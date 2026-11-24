import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
const{PGlite}=await import(pathToFileURL(process.env.OTOTR_PGLITE_MODULE).href);
const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const request='20000000-0000-4000-8000-000000000001';
test('persistent assignment receipt: owner-only, source-bound, private and idempotent',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.app_users(id uuid,auth_user_id uuid,is_active boolean,branch_id uuid,role text);
 create table app_private.kokpit_roles(user_id uuid,role text);
 create table app_private.task2_workspace(scope text primary key,data jsonb,version bigint);
 grant usage on schema app_private,auth to authenticated;
 insert into public.app_users values('${owner}','${owner}',true,null,'OPERATIONS'),('${other}','${other}',true,null,'CEO');
 insert into app_private.task2_workspace values('hq','{"tasks":[{"id":"one","title":"PRIVATE TITLE","assignee":"${owner}","status":"todo"},{"id":"two","assignee":"${owner}","status":"todo"}]}',1);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261124002206_task2_assignment_acceptance.sql',import.meta.url),'utf8'));
 const read=async()=> (await db.query("select public.get_task2_assignment_receipt('one') as v")).rows[0].v;
 const accept=async(rev,id=request,task='one')=>(await db.query('select public.accept_task2_assignment($1,$2,$3) as v',[task,rev,id])).rows[0].v;
 await db.exec('set role anon');await assert.rejects(read(),/permission denied/);
 await db.exec('reset role;set role authenticated');await assert.rejects(read(),/oturumu/);
 await db.query("select set_config('test.uid',$1,false)",[owner]);const initial=await read();assert.equal(initial.accepted,false);assert.doesNotMatch(JSON.stringify(initial),/PRIVATE TITLE|10000000/);
 await assert.rejects(accept('wrong'),/değişti/);
 await db.query("select set_config('test.uid',$1,false)",[other]);await assert.rejects(accept(initial.source_revision),/atanmış/);
 await db.query("select set_config('test.uid',$1,false)",[owner]);const accepted=await accept(initial.source_revision);assert.equal(accepted.accepted,true);assert.deepEqual(await accept(initial.source_revision),accepted);
 const second=(await db.query("select public.get_task2_assignment_receipt('two') as v")).rows[0].v;
 await assert.rejects(accept(second.source_revision,request,'two'),/farklı işlem/);
 await assert.rejects(db.query('select * from app_private.task2_assignment_receipts'),/permission denied/);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from app_private.task2_assignment_receipts')).rows[0].n,1);
 assert.equal((await db.query("select data->'tasks'->0->>'status' as s from app_private.task2_workspace")).rows[0].s,'todo');
 await db.exec("update app_private.task2_workspace set data=jsonb_set(data,'{tasks,0,title}','\"Changed\"');set role authenticated");
 assert.equal((await read()).accepted,false);await assert.rejects(accept(initial.source_revision),/değişti/);
 await db.exec(`reset role;insert into app_private.kokpit_roles values('${owner}','izleyici');set role authenticated`);await assert.rejects(accept((await read()).source_revision),/yetkili/);
 await db.exec(`reset role;delete from app_private.kokpit_roles;update public.app_users set branch_id='30000000-0000-4000-8000-000000000001' where id='${owner}';set role authenticated`);await assert.rejects(read(),/kaynağı/);
 await db.exec(`reset role;update public.app_users set is_active=false where id='${owner}';set role authenticated`);await assert.rejects(read(),/aktif/);
 }finally{await db.close();}
});
