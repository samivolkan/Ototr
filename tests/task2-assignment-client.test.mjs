import test from 'node:test';import assert from 'node:assert/strict';
import {createAssignmentReceiptService} from '../isler/gr8r/src/features/assignment-receipt.js';
const receipt={source:'task2',task_id:'one',source_revision:'a'.repeat(32),workspace_version:2,accepted:false,current_owner:true,archived:false,task_status:'todo',meaning:'assignment_acknowledgement_only'};
test('assignment client uses current saved view, explicit action and stable retry identity',async()=>{
 let snapshot='saved',ready=true,fail=true;const writes=[];
 const service=createAssignmentReceiptService({getVersion:()=>2,getSnapshot:()=>snapshot,isReady:()=>ready,newId:()=> 'request-one',rpc:async(name,args)=>{
  if(name==='get_task2_assignment_receipt')return {...receipt};
  writes.push(args);if(fail){fail=false;throw Error('network');}return {...receipt,accepted:true};
 }});
 await service.read('one');assert.equal(writes.length,0);
 await assert.rejects(service.accept('one'),/network/);await service.accept('one');assert.deepEqual(writes[0],writes[1]);
 ready=false;await assert.rejects(service.accept('one'),/bekleyin/);assert.equal(writes.length,2);
});
test('stale local version and mid-request changes prevent acceptance writes',async()=>{
 for(const mode of ['stale','changed','not-owner','archived','review']){
  let snapshot='old',writes=0;
  const s=createAssignmentReceiptService({getVersion:()=>2,getSnapshot:()=>snapshot,isReady:()=>true,newId:()=> 'id',rpc:async(name)=>{
   if(name!=='get_task2_assignment_receipt'){writes++;return {...receipt,accepted:true};}
   if(mode==='changed')snapshot='new';
   return {...receipt,...(mode==='stale'?{workspace_version:3}:mode==='not-owner'?{current_owner:false}:mode==='archived'?{archived:true}:mode==='review'?{task_status:'review'}:{})};
  }});
  await assert.rejects(s.accept('one'));assert.equal(writes,0,mode);
 }
});
