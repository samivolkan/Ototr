import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandoffService} from '../isler/gr8r/src/features/handoff-service.js';
// The shared UI utility initializes font links on import; panel rendering itself is pure.
globalThis.document={querySelectorAll:()=>[]};
const {handoffPanel}=await import('../isler/gr8r/src/features/handoff-panel.js');
const base={source:'task2',task_id:'one',meaning:'ownership_changes_only_on_recipient_acceptance',source_revision:'a'.repeat(32),workspace_version:2,version:1,state:'pending',current:true,is_owner:false,is_manager:false,is_recipient:true,acceptance:'Inspect source',resolution:null,sender_id:'sender',recipient_id:'recipient'};
test('handoff requires displayed current recipient view, stable retry and verified server reload',async()=>{
 let version=2,snapshot='saved',ready=true,failed=true;const calls=[];
 const svc=createHandoffService({getVersion:()=>version,getSnapshot:()=>snapshot,isReady:()=>ready,newId:()=> 'stable',sync:async()=>{version=3;snapshot='new-owner';},rpc:async args=>{
  if(args.p_action==='read')return {...base};calls.push(args);if(failed){failed=false;throw Error('network');}
  return {...base,workspace_version:3,version:2,state:'accepted',source_revision:'b'.repeat(32),is_owner:true};
 }});
 await assert.rejects(svc.act('one','accept',{}),/güncel/);
 const view=await svc.read('one');view.is_manager=true;
 await assert.rejects(svc.act('one','cancel',{reason:'Fake authority'}),/uygun/);assert.equal(calls.length,0);
 snapshot='dirty';await assert.rejects(svc.act('one','accept',{}),/güncel/);snapshot='saved';
 await assert.rejects(svc.act('one','accept',{}),/network/);
 const result=await svc.act('one','accept',{});assert.equal(result.is_owner,true);assert.equal(svc.current('one'),true);assert.deepEqual(calls[0],calls[1]);
 ready=false;await assert.rejects(svc.read('one'),/demo/);
});
test('handoff failed refresh cannot claim updated ownership; stale source cannot be accepted',async()=>{
 let source={...base};
 const svc=createHandoffService({getVersion:()=>2,getSnapshot:()=> 'saved',isReady:()=>true,newId:()=> 'request',sync:async()=>{},rpc:async args=>args.p_action==='read'?source:{...base,workspace_version:3,state:'accepted'}});
 await svc.read('one');await assert.rejects(svc.act('one','accept',{}),/doğrulanamadı/);assert.equal(svc.current('one'),false);
 source={...base,current:false};await svc.read('one');await assert.rejects(svc.act('one','accept',{}),/uygun/);
});
test('handoff panel escapes evidence and exposes only applicable actions',()=>{
 const html=handoffPanel('one',{...base,acceptance:'<script>bad</script>'},true,false,{},[{id:'recipient',name:'<img src=x>'}]);
 assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/acceptTaskHandoff/);assert.match(html,/declineTaskHandoff/);assert.doesNotMatch(html,/offerTaskHandoff|cancelTaskHandoff/);
 const stale=handoffPanel('one',base,false);assert.doesNotMatch(stale,/acceptTaskHandoff|declineTaskHandoff/);
});
