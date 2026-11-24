import test from 'node:test';import assert from 'node:assert/strict';
import {createDeliveryService} from '../isler/gr8r/src/features/delivery-service.js';
const base={source:'task2',task_id:'one',meaning:'human_review_required',source_revision:'a'.repeat(32),workspace_version:2,version:0,state:'not_submitted',current:false,is_owner:true,is_manager:false,is_producer:false,archived:false,reference:null,review_note:null};
test('delivery client requires a displayed current view and does not trust modified returned objects',async()=>{
 let ready=true,version=2,snapshot='saved';const writes=[];
 const svc=createDeliveryService({getVersion:()=>version,getSnapshot:()=>snapshot,isReady:()=>ready,newId:()=> 'request',sync:async()=>{version=3;snapshot='server';},rpc:async args=>{
  if(args.p_action==='read')return {...base};writes.push(args);return {...base,version:1,workspace_version:3,state:'submitted',current:true,reference:'proof:1'};
 }});
 await assert.rejects(svc.act('one','submit',{reference:'proof:1'}),/güncel/);assert.equal(writes.length,0);
 const view=await svc.read('one');view.is_manager=true;view.state='reviewed';view.current=true;
 await assert.rejects(svc.act('one','close',{}),/uygun/);assert.equal(writes.length,0);
 snapshot='edited';await assert.rejects(svc.act('one','submit',{reference:'proof:1'}),/güncel/);snapshot='saved';
 const result=await svc.act('one','submit',{reference:'proof:1'});assert.equal(result.state,'submitted');assert.equal(svc.current('one'),true);assert.equal(writes.length,1);
 ready=false;assert.equal(svc.current('one'),false);await assert.rejects(svc.read('one'),/demo/);
});
test('delivery retries preserve request identity and failed reload does not claim a verified view',async()=>{
 let failure=true;const writes=[];
 const svc=createDeliveryService({getVersion:()=>2,getSnapshot:()=> 'saved',isReady:()=>true,newId:()=> 'stable-request',sync:async()=>{},rpc:async args=>{
  if(args.p_action==='read')return {...base};writes.push(args);if(failure){failure=false;throw Error('network');}return {...base,workspace_version:3,version:1,state:'submitted',current:true,reference:'proof:1'};
 }});
 await svc.read('one');await assert.rejects(svc.act('one','submit',{reference:'proof:1'}),/network/);
 await assert.rejects(svc.act('one','submit',{reference:'proof:1'}),/doğrulanamadı/);assert.deepEqual(writes[0],writes[1]);assert.equal(svc.current('one'),false);
});
