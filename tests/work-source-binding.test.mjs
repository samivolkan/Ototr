import test from 'node:test';
import assert from 'node:assert/strict';
import {createWork,applyWorkEvent,inspectWorkSource} from '../ajan-ofisi/work-contract.mjs';
const input={id:'task-1',branchId:'branch-demo',owner:'worker',manager:'manager',reviewer:'reviewer',risk:'veri',source:'task2',mode:'live',sourceRevision:'revision-a'};
const context={id:input.id,branchId:input.branchId,owner:input.owner,source:input.source,revision:input.sourceRevision,exists:true,archived:false};
const event=(w,type,extra={})=>({id:`event-${w.version}`,actor:w.owner,type,at:'2026-11-24T03:00:00Z',expectedVersion:w.version,branchId:w.branchId,mode:'live',...extra});
test('live work requires independent source context, not client event assertions',()=>{
 assert.throws(()=>createWork({...input,sourceRevision:null}));
 const w=createWork(input),e=event(w,'accept',{sourceContext:context});
 assert.throws(()=>applyWorkEvent(w,e),/Kaynak/);
 for(const patch of [{id:'other'},{branchId:'other'},{source:'legacy'},{revision:'revision-b'},{exists:false},{archived:true},{owner:'other'}])assert.throws(()=>applyWorkEvent(w,e,{...context,...patch}),/Kaynak/);
 assert.equal(applyWorkEvent(w,e,context).state,'accepted');
});
test('retries cannot resurrect an accepted event after source changes',()=>{
 const w=createWork(input),e=event(w,'accept');const accepted=applyWorkEvent(w,e,context);
 assert.strictEqual(applyWorkEvent(accepted,e,context),accepted);
 assert.throws(()=>applyWorkEvent(accepted,e,{...context,revision:'revision-b'}),/Kaynak/);
});
test('submission and independent review bind to the same current source revision',()=>{
 let w=createWork(input);for(const type of ['accept','start'])w=applyWorkEvent(w,event(w,type),context);
 assert.throws(()=>applyWorkEvent(w,event(w,'submit',{evidence:{reference:'evidence:1',version:'old'}}),context),/Teslim/);
 w=applyWorkEvent(w,event(w,'submit',{evidence:{reference:'evidence:1',version:'revision-a'}}),context);
 assert.throws(()=>applyWorkEvent(w,event(w,'review',{actor:'reviewer',result:'passed',evidence:{reference:'review:1',version:'old'}}),context),/Denetim/);
 assert.throws(()=>applyWorkEvent(w,event(w,'review',{result:'passed',evidence:{reference:'review:1',version:'revision-a'}}),context),/Bağımsız/);
 w=applyWorkEvent(w,event(w,'review',{actor:'reviewer',result:'passed',evidence:{reference:'review:1',version:'revision-a'}}),context);
 assert.throws(()=>applyWorkEvent(w,event(w,'close',{actor:'manager'}),{...context,revision:'revision-b'}),/Kaynak/);
 w=applyWorkEvent(w,event(w,'close',{actor:'manager'}),context);assert.equal(w.state,'done');
 assert.equal(inspectWorkSource(w,{...context,revision:'revision-b'}).current,false);
 assert.equal(inspectWorkSource(w,context).current,true);
});
