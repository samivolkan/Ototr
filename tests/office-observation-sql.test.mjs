import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
if(!process.env.OTOTR_PGLITE_MODULE)throw Error('Set OTOTR_PGLITE_MODULE to the isolated runtime; this test never connects to production.');
const{PGlite}=await import(pathToFileURL(process.env.OTOTR_PGLITE_MODULE).href);
const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',branch='20000000-0000-4000-8000-000000000001',request='30000000-0000-4000-8000-000000000001';
test('persistent observations: scope, repeat suppression, receipts, stale-source rejection, resolution and reopening',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function app_private.franchise_office_manager() returns boolean language sql as $$select current_setting('test.hq',true)='yes'$$;
 create table public.app_users(id uuid,auth_user_id uuid,is_active boolean,branch_id uuid);
 create table app_private.isler24_tasks(id int,scope text,data jsonb,deleted_at timestamptz,version int default 1);
 grant usage on schema app_private,auth to authenticated;
 insert into public.app_users values('${a}','${a}',true,null),('${b}','${b}',true,'${branch}');
 insert into app_private.isler24_tasks(id,scope,data) values(1,'hq','{"status":"yapilacak","who":"${a}","due":"2000-01-01","title":"PRIVATE"}'),(2,'${branch}','{"status":"devam","who":"${b}","due":"2000-01-01"}');`);
 for(const name of ['20261123231940_office_work_health_summary.sql','20261123233126_office_observation_journal.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const call=async(name,args=[])=>{const placeholders=args.map((_,i)=>'$'+(i+1)).join(',');return(await db.query(`select public.${name}(${placeholders}) as value`,args)).rows[0].value;};
 await db.exec('set role anon');await assert.rejects(call('list_office_work_observations'),/permission denied/);
 await db.exec('reset role;set role authenticated');await assert.rejects(call('refresh_office_work_observations'),/oturumu/);
 await db.query("select set_config('test.uid',$1,false)",[a]);await db.exec("select set_config('test.hq','yes',false)");
 let r=await call('refresh_office_work_observations');assert.equal(r.observations.length,1);assert.equal(r.observations[0].code,'past_due');assert.equal(r.observations[0].value,1);assert.equal(r.events.length,1);
 r=await call('refresh_office_work_observations');assert.equal(r.events.length,1);assert.equal(r.observations[0].version,1);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE|10000000|20000000|source_revision|actor_id/);
 const health=await call('office_work_health_summary');assert.equal(health.open,1);assert.equal(health.revision_token,undefined);
 r=await call('ack_office_work_observation',['past_due',1,request]);assert.ok(r.observations[0].acknowledged_at);assert.equal(r.observations[0].state,'open');assert.equal(r.events.length,2);
 r=await call('ack_office_work_observation',['past_due',1,request]);assert.equal(r.events.length,2);
 r=await call('ack_office_work_observation',['past_due',1,'30000000-0000-4000-8000-000000000002']);assert.equal(r.events.length,2);
 await assert.rejects(call('ack_office_work_observation',['owner_missing',1,request]),/farklı içerikle/);
 await assert.rejects(db.query('select * from app_private.office_work_observations'),/permission denied/);
 await db.query("select set_config('test.uid',$1,false)",[b]);assert.equal((await call('list_office_work_observations')).observations.length,0);
 await db.query("select set_config('test.uid',$1,false)",[a]);
 await db.exec('reset role;update app_private.isler24_tasks set version=version+1 where id=1;set role authenticated');
 r=await call('ack_office_work_observation',['past_due',1,request]);assert.equal(r.observations[0].acknowledged_at,null);
 await assert.rejects(call('ack_office_work_observation',['past_due',1,'30000000-0000-4000-8000-000000000003']),/Kaynak değişti/);
 r=await call('refresh_office_work_observations');assert.equal(r.observations[0].version,2);assert.equal(r.observations[0].acknowledged_at,null);assert.equal(r.events[0].kind,'changed');
 // Even a changed owner field without task version increment invalidates a receipt.
 await call('ack_office_work_observation',['past_due',2,'30000000-0000-4000-8000-000000000004']);
 await db.exec(`reset role;update app_private.isler24_tasks set data=jsonb_set(data,'{who}','"${b}"') where id=1;set role authenticated`);
 r=await call('refresh_office_work_observations');assert.equal(r.observations.find(x=>x.code==='past_due').acknowledged_at,null);assert.equal(r.observations.find(x=>x.code==='owner_unresolved').value,1);
 await db.exec(`reset role;update app_private.isler24_tasks set data=jsonb_set(data,'{status}','"bitti"'),version=version+1 where id=1;set role authenticated`);
 r=await call('refresh_office_work_observations');assert.ok(r.observations.every(x=>x.state==='resolved'));await assert.rejects(call('ack_office_work_observation',['past_due',r.observations[0].version,'30000000-0000-4000-8000-000000000005']),/Açık kontrol/);
 await db.exec(`reset role;update app_private.isler24_tasks set data=jsonb_set(data,'{status}','"devam"'),version=version+1 where id=1;set role authenticated`);
 r=await call('refresh_office_work_observations');assert.equal(r.observations.find(x=>x.code==='past_due').state,'open');assert.ok(r.events.some(x=>x.kind==='reopened'));
 await db.exec("select set_config('test.hq','no',false)");await assert.rejects(call('list_office_work_observations'),/oturumu/);await assert.rejects(call('refresh_office_work_observations'),/oturumu/);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int as n from app_private.isler24_tasks')).rows[0].n,2);
 }finally{await db.close();}
});
