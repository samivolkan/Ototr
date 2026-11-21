import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,sample,actors} from './fixture.mjs';
import {createHandler} from '../../supabase/functions/isler-api/handler.mjs';
const body=t=>Object.fromEntries(Object.entries(t).filter(([k])=>!['id','creator','created','comments','log'].includes(k)));
test('Isler PostgreSQL authorization and workflows',async t=>{
 const {db,call}=await fixture();t.after(()=>db.close());
 await t.test('authentication, scope, viewer and private tables',async()=>{
  await assert.rejects(call('none','GET'),{code:'28000'});await assert.rejects(call('inactive','GET'),{code:'42501'});
  await assert.rejects(call('viewer','POST','isler',null,sample()),{code:'42501'});
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query('select * from app_private.isler24_tasks')}),{code:'42501'});
 });
 let a,b;
 await t.test('server identity; worker assignment and helper access; cross branch isolation',async()=>{
  a=await call('admin','POST','isler',null,{...sample(),creator:'forged',created:1});assert.equal(a.creator,actors.admin);assert.equal(a.log[0].m,'Oluşturuldu · Yönetici');
  a=await call('worker','PUT','isler',a.id,{...body(a),title:'Çalışan düzenledi'});
  b=await call('admin','POST','isler',null,{...sample(),who:actors.admin,helpers:[]});
  await assert.rejects(call('worker','PUT','isler',b.id,body(b)),{code:'42501'});
  await assert.rejects(call('worker','DELETE','isler',b.id,{version:b.version}),{code:'42501'});
  assert.deepEqual(await call('other','GET'),[]);
  await assert.rejects(call('other','POST','yorum',a.id,{m:'x',version:a.version}),{code:'P0002'});
  a=await call('admin','PUT','isler',a.id,{...body(a),who:actors.admin,helpers:[actors.worker]});
  a=await call('worker','POST','yorum',a.id,{m:'<img src=x onerror=alert(1)>',version:a.version});assert.equal(a.comments[0].a,'Çalışan');
  await assert.rejects(call('worker','POST','yorum',a.id,{m:'x',a:'Sahte',version:a.version}),{code:'22023'});
  assert.ok((await call('worker','GET','gecmis',a.id)).some(l=>l.m==='Yorum eklendi · Çalışan'));
 });
 await t.test('validation, SQL strings, stale writes and timers cannot be spoofed',async()=>{
  for(const bad of [{who:actors.other},{helpers:['Sahte']},{due:'2026-02-30'},{pri:'kritik'},{subs:[{t:'x',d:'false'}]},{ord:'x'}])await assert.rejects(call('admin','POST','isler',null,{...sample(),...bad}),{code:'22023'});
  const sql=await call('admin','POST','isler',null,{...sample(),title:"');drop table app_users;--"});assert.match(sql.title,/drop table/);
  await assert.rejects(call('worker','PUT','isler',a.id,{...body(a),version:0}),{code:'40001'});
  a=await call('worker','POST','sayac',a.id,{version:a.version,action:'start'});const timestamp=a.ts;assert.ok(timestamp>0);assert.equal(a.status,'devam');
  a=await call('worker','PUT','isler',a.id,{...body(a),time:999999,ts:1});assert.equal(a.ts,timestamp);assert.equal(a.time,0);
  await new Promise(r=>setTimeout(r,1050));a=await call('worker','POST','sayac',a.id,{version:a.version,action:'stop'});assert.ok(a.time>=1&&a.time<10);assert.equal(a.ts,0);
 });
 await t.test('recurrence exactly once, monthly clamp, fresh history/subtasks',async()=>{
  let r=await call('admin','POST','isler',null,{...sample(),rec:'ay',subs:[{t:'x',d:true}]});
  r=await call('admin','PUT','isler',r.id,{...body(r),status:'bitti'});let next=(await call('admin','GET')).filter(x=>x.due==='2026-02-28');assert.equal(next.length,1);assert.equal(next[0].subs[0].d,false);
  r=await call('admin','PUT','isler',r.id,{...body(r),status:'devam'});r=await call('admin','PUT','isler',r.id,{...body(r),status:'bitti'});assert.equal((await call('admin','GET')).filter(x=>x.due==='2026-02-28').length,1);
 });
 await t.test('atomic bulk authorization; soft delete undo and expired undo',async()=>{
  const before=a.pri;await assert.rejects(call('worker','POST','toplu',null,{items:[{id:a.id,version:a.version},{id:b.id,version:b.version}],action:'pri',value:'yuksek'}),{code:'42501'});
  assert.equal((await call('admin','GET','isler',a.id))[0].pri,before);
  const deleted=await call('worker','DELETE','isler',a.id,{version:a.version});assert.equal((await call('admin','GET','isler',a.id)).length,0);
  a=await call('worker','POST','geri-al',a.id,{version:deleted.version});assert.ok(a.log[0].m.includes('geri alındı'));
  const again=await call('worker','DELETE','isler',a.id,{version:a.version});await db.query("update app_private.isler24_tasks set undo_until=now()-interval '1 second' where id=$1",[a.id]);
  await assert.rejects(call('worker','POST','geri-al',a.id,{version:again.version}),{code:'22023'});
  assert.equal((await db.query('select count(*)::int n from app_private.isler24_tasks where id=$1',[a.id])).rows[0].n,1);
 });
 await t.test('private saved filters, viewer allowed; team automation admin only; daily audit',async()=>{
  const data=[{n:'Benim',q:'x',role:'me',proj:'',pri:'',sort:'man',sf:''}];await call('viewer','PUT','filtreler',null,{version:1,data});assert.equal((await call('viewer','GET','filtreler')).data.length,1);assert.equal((await call('worker','GET','filtreler')).data.length,0);
  await assert.rejects(call('worker','PUT','settings',null,{version:1,late:true,done:false}),{code:'42501'});
  await call('admin','PUT','settings',null,{version:1,late:true,done:false});await db.query('select app_private.isler24_daily()');
  b=(await call('admin','GET','isler',b.id))[0];assert.equal(b.pri,'yuksek');assert.ok(b.log.some(l=>l.m.includes('Geciken iş')));
 });
 await t.test('legacy import maps users, preserves duration/provenance, rejects unknown atomically',async()=>{
  const imported={...sample(),who:'Çalışan',helpers:['Yönetici'],status:'bitti',rec:'hafta',time:44,comments:[{a:'old',m:'Eski yorum',d:1}],log:[{m:'Eski geçmiş',d:1}]};
  await call('admin','POST','import',null,[imported]);let list=await call('admin','GET');assert.equal(list.at(-1).time,44);assert.match(list.at(-1).comments[0].m,/doğrulanmamış/);
  await assert.rejects(call('admin','POST','import',null,[imported,{...imported,who:'Bilinmeyen'}]),{code:'22023'});assert.equal((await call('admin','GET')).length,list.length);
  assert.equal((await db.query('select count(*)::int n from app_private.isler24_outbox')).rows[0].n,0);
 });
 await t.test('manual ordering validates move ownership',async()=>{
  let c=await call('worker','POST','isler',null,sample());b=(await call('admin','GET','isler',b.id))[0];
  c=await call('worker','POST','sirala',c.id,{version:c.version,before:b.id,status:b.status});b=(await call('admin','GET','isler',b.id))[0];assert.ok(c.ord<b.ord);
 });
});
test('HTTP routes, CORS, CSRF, invalid input, safe server failures',async()=>{
 const origin='https://samivolkan.github.io';const seen=[];
 const handler=createHandler({origins:[origin],authenticate:async token=>token==='Bearer ok',rpc:async(_,args)=>{seen.push(args);return {data:{ok:true}}}});
 const req=(path='/isler',method='GET',payload,extra={})=>new Request('https://api.example/api'+path,{method,headers:{origin,Authorization:'Bearer ok','Content-Type':'application/json','X-Kokpit-Request':'1',...extra},body:payload===undefined?undefined:JSON.stringify(payload)});
 assert.equal((await handler(req('/isler','POST',sample(),{origin:'https://evil.invalid'}))).status,403);
 assert.equal((await handler(req('/isler','POST',sample(),{'X-Kokpit-Request':''}))).status,403);
 assert.equal((await handler(req('/isler','GET',undefined,{Authorization:''}))).status,401);
 for(const [path,resource]of [['/isler/1/yorum','yorum'],['/isler/1/sayac','sayac'],['/isler/1/geri-al','geri-al'],['/isler/toplu','toplu']]){assert.equal((await handler(req(path,'POST',{}))).status,201);assert.equal(seen.at(-1).resource,resource)}
 assert.equal((await handler(req('/isler/1/gecmis'))).status,200);
 assert.equal((await handler(req('/isler/1/gecmis','POST',{}))).status,405);
 assert.equal((await handler(req('/isler','POST',{x:'a'.repeat(66000)}))).status,413);
 assert.equal((await handler(req('/workspace'))).status,200);assert.equal(seen.at(-1).resource,'workspace');
 assert.equal((await handler(req('/workspace','POST',{}))).status,405);
 assert.equal((await handler(req('/workspace','PUT',{data:{tasks:[]},version:0}))).status,200);
 assert.equal((await handler(req('/workspace','PUT',{data:{tasks:[]},version:0},{'X-Kokpit-Request':''}))).status,403);
 assert.equal((await handler(req())).headers.get('cache-control'),'no-store');
});
test('TASK2 workspace storage is scoped, versioned, persistent and role guarded',async()=>{
 const {db,workspace}=await fixture();
 const initial=await workspace('admin','GET');
 const data={ws:{name:'OTOTR'},projects:[{id:'p1',name:'OTOTR',members:[actors.admin,actors.worker]}],members:[{id:actors.admin,name:'Yönetici'},{id:actors.worker,name:'Çalışan'}],tasks:[
   {id:'admin-task',creator:actors.admin,assignee:actors.admin,helpers:[],project:'p1',title:'Yönetici işi',desc:'',status:'todo',priority:'none',labels:[],subtasks:[]},
   {id:'worker-task',creator:actors.admin,assignee:actors.worker,helpers:[],project:'p1',title:'Çalışan işi',desc:'',status:'todo',priority:'none',labels:[],subtasks:[]},
 ],comments:[],activity:[],files:[],events:[]};
 const saved=await workspace('admin','PUT',{data,version:initial.version});assert.equal(saved.version,1);assert.deepEqual((await workspace('worker','GET')).data.tasks,data.tasks);
 const forged=structuredClone(saved.data);forged.tasks[0].title='Yetkisiz değişiklik';
 await assert.rejects(workspace('worker','PUT',{data:forged,version:saved.version}),{code:'42501'});
 const owned=structuredClone(saved.data);owned.tasks[1].title='Düzenlendi';owned.tasks[1].creator=actors.worker;
 owned.comments=[{id:'new-comment',task:'worker-task',by:actors.admin,text:'Yorum',at:1,re:{}}];
 owned.activity=[{id:'new-history',by:actors.admin,verb:'updated',task:'worker-task',project:'p1',at:1,extra:''}];
 const ownSave=await workspace('worker','PUT',{data:owned,version:saved.version});assert.equal(ownSave.data.tasks.find(x=>x.id==='worker-task').creator,actors.admin);
 assert.equal(ownSave.data.comments[0].by,actors.worker,'Yorum yazarı sunucuda oturum sahibinden atanmalı');assert.ok(ownSave.data.comments[0].at>1,'Yorum zamanı sunucudan atanmalı');
 assert.equal(ownSave.data.activity[0].by,actors.worker,'Geçmiş yazarı sunucuda oturum sahibinden atanmalı');assert.ok(ownSave.data.activity[0].at>1,'Geçmiş zamanı sunucudan atanmalı');
 await assert.rejects(workspace('viewer','PUT',{data:ownSave.data,version:ownSave.version}),{code:'42501'});
 const forgedProject=structuredClone(ownSave.data);forgedProject.projects[0].name='yetkisiz';
 await assert.rejects(workspace('worker','PUT',{data:forgedProject,version:ownSave.version}),{code:'42501'});
 assert.deepEqual((await workspace('other','GET')).data,{});
 await assert.rejects(workspace('worker','PUT',{data:ownSave.data,version:0}),{code:'40001'});
 await assert.rejects(workspace('admin','PUT',{data:{...data,tasks:Array(10001).fill({})},version:ownSave.version}),{code:'22023'});
 assert.equal((await db.query('select count(*)::int n from app_private.task2_workspace')).rows[0].n,1);
});
