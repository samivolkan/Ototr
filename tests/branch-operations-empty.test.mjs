import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as model from '../ajan-ofisi/branch-operations-model.mjs';

function harness(){
 const nodes=new Map(),handlers={},timers=[];
 const query=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,setAttribute(){},scrollIntoView(){},focus(){}});return nodes.get(id);};
 const source={closed:false,postMessage(packet){this.packet=packet;}};
 const sandbox={...model,URL,Date,Map,JSON,Number,String,crypto:{randomUUID:()=>String(Math.random())},location:{origin:'https://demo.test',href:'https://demo.test/ajan-ofisi/branch-operations.html'},document:{hidden:false,querySelector:query,addEventListener(){}},window:{open:()=>source,addEventListener:(name,fn)=>handlers[name]=fn},setInterval:fn=>timers.push(fn)};
 const code=fs.readFileSync(new URL('../ajan-ofisi/branch-operations.mjs',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
 vm.runInNewContext(code,sandbox);query('#connect').onclick();
 return {query,source,timers,reply(data){handlers.message({origin:sandbox.location.origin,source,data:{type:'ototr-operation-snapshot',requestId:source.packet.requestId,...data}});}};
}
test('verified empty ERP snapshot shows vehicle waiting without demo cars or active station controls',()=>{
 const h=harness();h.reply({ok:true,cases:[],observedAt:new Date().toISOString()});
 assert.match(h.query('#panelContent').innerHTML,/Araç bekleniyor/);assert.doesNotMatch(h.query('#panelContent').innerHTML,/16 OTR/);assert.match(h.query('#pipeline').innerHTML,/Araç bekleniyor/);assert.equal((h.query('#stations').innerHTML.match(/disabled/g)||[]).length,4);
});
test('unavailable source is not reported as an empty vehicle queue',()=>{
 const h=harness();h.reply({ok:false,cases:[],observedAt:new Date().toISOString()});assert.match(h.query('#panelContent').innerHTML,/Güncel veri bekleniyor/);assert.doesNotMatch(h.query('#panelContent').innerHTML,/Araç bekleniyor/);
});
test('closing a previously verified empty source clears the vehicle waiting message',()=>{
 const h=harness();h.reply({ok:true,cases:[],observedAt:new Date().toISOString()});h.source.closed=true;h.timers[1]();assert.match(h.query('#panelContent').innerHTML,/Güncel veri bekleniyor/);
});
