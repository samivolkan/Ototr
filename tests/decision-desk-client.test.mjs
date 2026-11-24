import test from 'node:test';import assert from 'node:assert/strict';import{createDecisionDesk,validateDesk}from'../ajan-ofisi/decision-desk-service.mjs';
const budget={pending:0,queue_limit:10,daily_limit:45,weekly_limit:840,today_reserved:0,today_actual:0,week_reserved:0,week_actual:0};
const empty={source:'office_decision_queue',scope:'current_user_scope',configured:true,is_owner:true,business_actions_executed:false,budget,items:[],review_items:[]};
const source={source:'task2',task_id:'one',current:true,is_manager:true,archived:false,state:'reviewed',version:2,source_revision:'a'.repeat(32),reference:'reviewed:proof'};
const plan={finding:'Finding',evidence:'proof',recommendation:'Option',risk:'para',effort:'One hour',decision:'Which option'};
const row={id:'id-one',version:1,state:'pending',source_current:true,can_review:false,plan};
test('decision client binds enqueue evidence and revisions to the reviewed source, preserving retry identity',async()=>{
 const calls=[];let fail=true;const svc=createDecisionDesk({newId:()=> 'stable',rpc:async(name,args)=>{
  if(name==='task2_delivery_action')return {...source};if(args.p_action==='read')return structuredClone(empty);
  calls.push(args);if(fail){fail=false;throw Error('network');}return structuredClone(empty);
 }});
 await assert.rejects(svc.act('enqueue',{}),/Önce/);await svc.read();await assert.rejects(svc.act('enqueue',{}),/kaynağını/);
 const d=await svc.loadSource('one');d.reference='forged';d.source_revision='b'.repeat(32);
 const draft={key:'Policy reference',priority:1,minutes:5,day:'2026-11-24',finding:'Finding',recommendation:'Options',risk:'para',effort:'One hour',decision:'Select reference',evidence:'forged',source_revision:'forged'};
 await assert.rejects(svc.act('enqueue',draft),/network/);await svc.act('enqueue',draft);
 assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].p_payload.plan.evidence,'reviewed:proof');assert.equal(calls[1].p_payload.source_revision,source.source_revision);
});
test('returned views cannot grant ownership and blank actual time is not silently zero',async()=>{
 let response={...empty,is_owner:false,budget:{...budget,pending:1},items:[row]};const writes=[];
 const svc=createDecisionDesk({newId:()=> 'id',rpc:async(name,args)=>{if(args.p_action!=='read')writes.push(args);return structuredClone(response);}});
 const v=await svc.read();v.is_owner=true;await assert.rejects(svc.act('answer',{id:row.id,answer:'Yes',minutes:1}),/sahiplik/);assert.equal(writes.length,0);
 response={...response,is_owner:true};await svc.read();await assert.rejects(svc.act('answer',{id:row.id,answer:'Yes',minutes:''}),/süresini/);
 response={...response,items:[{...row,source_current:false}]};await svc.read();await assert.rejects(svc.act('answer',{id:row.id,answer:'Yes',minutes:1}),/kaynak/);
 await svc.act('cancel',{id:row.id,answer:'Source changed'});assert.equal(writes[0].p_action,'cancel');
});
test('review permission, queue partition and source readiness fail closed',async()=>{
 const review={...row,state:'review_required',can_review:false};
 const v={...empty,budget:{...budget,pending:1},review_items:[review]};
 const svc=createDecisionDesk({newId:()=> 'id',rpc:async name=>name==='task2_delivery_action'?{...source,current:false}:structuredClone(v)});
 await svc.read();await assert.rejects(svc.act('review',{id:row.id,note:'Looks good'}),/Bağımsız/);await assert.rejects(svc.loadSource('one'),/incelenmiş/);
 for(const bad of [{...empty,business_actions_executed:true},{...v,items:[row]},{...empty,budget:{...budget,daily_limit:100}}])assert.throws(()=>validateDesk(bad));
});
