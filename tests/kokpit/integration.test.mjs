import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,sample} from './fixture.mjs';
import {createHandler} from '../../supabase/functions/kokpit-api/handler.mjs';
const {db,call}=await fixture();
test.after(()=>db.close());
test('ERP identity, permissions and tenant isolation',async()=>{
  assert.equal((await call('admin','GET','me')).role,'yonetici');
  assert.equal((await call('worker','GET','me')).role,'calisan');
  assert.equal((await call('viewer','GET','me')).role,'izleyici');
  for(const actor of ['unknown','inactive'])await assert.rejects(call(actor,'GET'));
  const item=await call('worker','POST','isler',null,sample());
  assert.equal(item.creator,'Çalışan');assert.equal((await call('viewer','GET')).length,1);
  assert.equal((await call('other','GET')).length,0);
  for(const method of ['POST','PUT','DELETE'])await assert.rejects(call('viewer',method,'isler',item.id,{...item,title:'Saldırı'}),{code:'42501'});
  for(const method of [null,'PATCH',''])await assert.rejects(call('viewer',method,'isler',item.id,item),{code:'P0002'});
  await assert.rejects(call('other',null,null,item.id,item),{code:'P0002'});
  await assert.rejects(call('other','PUT','isler',item.id,item),{code:'P0002'});
  await assert.rejects(call('worker','PUT','settings',null,{late:true,done:true,version:1}),{code:'42501'});
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');return tx.query('select * from app_private.kokpit_isler')}),{code:'42501'});
});
test('validation rejects malformed, oversized, injected and invalid dates',async()=>{
  for(const patch of [{title:''},{title:'x'.repeat(121)},{due:'2026-02-30'},{due:'2025-01-01'},
    {helpers:'bad'},{subs:[{t:'ok',d:'false'}]},{tags:[{}]},{time:-1},{ts:9e15},{status:'admin'},{branch_id:'fake'},
    {rec:'week'},{desc:null},{title:42},{subs:[{t:'x',d:false,html:'bad'}]}])
    await assert.rejects(call('worker','POST','isler',null,{...sample(),...patch}));
  const title="Robert'); DROP TABLE app_users;-- <img src=x onerror=alert(1)>";
  const row=await call('worker','POST','isler',null,{...sample(),title,creator:'spoofed'});
  assert.equal(row.title,title);assert.equal(row.creator,'Çalışan');
  assert.equal((await db.query('select count(*)::int as n from app_users')).rows[0].n,5);
});
test('optimistic versions prevent lost edits and delete conflicts',async()=>{
  const a=await call('worker','POST','isler',null,sample());
  const b=await call('admin','PUT','isler',a.id,{...a,title:'Güncellendi'});
  assert.equal(b.version,a.version+1);
  await assert.rejects(call('worker','PUT','isler',a.id,a),{code:'40001'});
  await assert.rejects(call('worker','DELETE','isler',a.id,a),{code:'40001'});
  await call('worker','DELETE','isler',b.id,b);
  assert.equal((await call('worker','GET','isler',b.id)).length,0);
});
test('monthly recurrence clamps month, copies subtasks and resets timer exactly once',async()=>{
  const a=await call('worker','POST','isler',null,{...sample(),rec:'ay',time:12,subs:[{t:'Bitti',d:true}]});
  const done=await call('worker','PUT','isler',a.id,{...a,status:'bitti'});
  const next=(await db.query('select data from app_private.kokpit_isler where recurrence_parent=$1',[a.id])).rows[0].data;
  assert.equal(next.due,'2026-02-28');assert.equal(next.time,0);assert.equal(next.subs[0].d,false);
  const open=await call('worker','PUT','isler',done.id,{...done,status:'devam'});
  await call('worker','PUT','isler',open.id,{...open,status:'bitti'});
  assert.equal((await db.query('select count(*)::int n from app_private.kokpit_isler where recurrence_parent=$1',[a.id])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from app_private.kokpit_outbox where task_id=$1',[a.id])).rows[0].n,2);
});
test('daily scheduler is server-side, idempotent and respects completed tasks',async()=>{
  const settings=await call('admin','GET','settings');
  await call('admin','PUT','settings',null,{...settings,late:true});
  await assert.rejects(call('admin','PUT','settings',null,{...settings,late:false}),{code:'40001'});
  const a=await call('worker','POST','isler',null,sample());
  await db.query('select app_private.kokpit_daily()');
  assert.equal((await call('worker','GET','isler',a.id))[0].pri,'yuksek');
  assert.equal((await db.query('select app_private.kokpit_daily() n')).rows[0].n,0);
});
test('outbox leases, acknowledgement and service-only access',async()=>{
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');return tx.query('select * from public.kokpit_mail_claim()')}),{code:'42501'});
  const jobs=(await db.query('select * from public.kokpit_mail_claim()')).rows;
  assert.ok(jobs.length>0);assert.equal((await db.query('select * from public.kokpit_mail_claim()')).rows.length,0);
  await db.query('select public.kokpit_mail_ack($1,true)',[jobs[0].id]);
  assert.ok((await db.query('select sent_at from app_private.kokpit_outbox where id=$1',[jobs[0].id])).rows[0].sent_at);
});
test('import is atomic, scoped, validated and does not send historical notifications',async()=>{
  const before=(await call('worker','GET')).length;
  await assert.rejects(call('worker','POST','import',null,[sample(),{...sample(),title:''}]));
  assert.equal((await call('worker','GET')).length,before);
  await assert.rejects(call('viewer','POST','import',null,[sample()]),{code:'42501'});
  const mails=(await db.query('select count(*)::int n from app_private.kokpit_outbox')).rows[0].n;
  await call('worker','POST','import',null,[{...sample(),status:'bitti'},sample()]);
  assert.equal((await call('worker','GET')).length,before+2);
  assert.equal((await db.query('select count(*)::int n from app_private.kokpit_outbox')).rows[0].n,mails);
});
test('REST CRUD, CORS, invalid sessions, method, body limits and errors',async()=>{
  const handler=createHandler({origins:['https://erp.example'],authenticate:async token=>token==='Bearer worker',
    rpc:async(token,args)=>{try{return {data:await call('worker',args.method,args.resource,args.task_id,args.payload)}}catch(error){return {error}}}});
  const request=(path,method='GET',body,origin='https://erp.example',token='Bearer worker')=>handler(new Request('https://api.example/api/'+path,{method,headers:{Origin:origin,Authorization:token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));
  assert.equal((await request('isler','GET',undefined,'https://evil.example')).status,403);
  assert.equal((await request('isler','GET',undefined,'https://erp.example','Bearer fake')).status,401);
  assert.equal((await request('isler','OPTIONS')).status,204);
  assert.equal((await request('isler','PUT',sample())).status,405);
  assert.equal((await request('isler','POST',{...sample(),desc:'x'.repeat(70000)})).status,413);
  const res=await request('isler','POST',sample());assert.equal(res.status,201);const row=await res.json();
  assert.equal((await request('isler/'+row.id,'PUT',{...row,title:'REST'})).status,200);
  assert.equal((await request('isler/'+row.id,'PUT',row)).status,409);
  const latest=await (await request('isler/'+row.id)).json();
  assert.equal((await request('isler/'+row.id,'DELETE',latest[0])).status,200);
});
