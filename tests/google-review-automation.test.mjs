import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
const src=stripTypeScriptTypes((await readFile(new URL('../supabase/functions/_shared/review-automation.ts',import.meta.url),'utf8')).replace(/^export /gm,''));
const context=vm.createContext({crypto:webcrypto,TextEncoder,Date,Set});vm.runInContext(src,context);
const token='a'.repeat(64),digest=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
function fixture(options={}) {
 const state={branch_id:'branch-google-nilufer',enabled:true,token_digest:digest,...options.state};
 const writes=[],published=[],prepared=[];let claimed=false;
 const rows=options.reviews||[{reviewId:'safe'},{reviewId:'risk'},{reviewId:'done',reviewReply:{comment:'Existing'}}];
 const queue=options.queue||[{id:'safe',review_id:'safe'},{id:'risk',review_id:'risk'},{id:'done',review_id:'done'}];
 const db={rpc:async()=>{if(claimed||options.locked)return {data:[]};claimed=true;return {data:[state]};},from(table){let values=null;const query={select(){return this},eq(){return this},order(){return this},limit(){return this},maybeSingle(){return this},insert(v){values=v;return this},update(v){values=v;return this},then(resolve){if(values)writes.push({table,values});return Promise.resolve({data:values|| (table==='google_review_automation'?state:queue),error:null}).then(resolve)}};return query;}};
 const deps={connection:async()=>({connection:{},user:{id:'owner'}}),lifecycle:async()=>{if(options.paused)throw new Error('paused')},sync:async()=>options.sync||({branches:[{branch_id:'branch-google-nilufer',pagination_complete:true,reviews:rows}]}),find:async()=>options.existing?{status:'draft_failed'}:null,prepare:async(u,c,r)=>{prepared.push(r.reviewId);return {item:{status:'approval_pending'}}},safe:async(item)=>{if(item.id==='risk')throw Object.assign(new Error('human'),{status:409})},publish:async(u,item)=>{published.push(item.id);return {item:{status:'published'}}}};
 return {state,db,deps,writes,published,prepared};
}
test('worker rejects missing, forged and disabled credentials before doing any work',async()=>{
 for(const t of ['', 'b'.repeat(64)]){const f=fixture();await assert.rejects(context.runAutomation(f.db,t,f.deps));assert.equal(f.writes.length,0)}
 const f=fixture({state:{enabled:false}});await assert.rejects(context.runAutomation(f.db,token,f.deps));
});
test('AI delegation requires a live lease',async()=>{
 const f=fixture();await assert.rejects(context.verifyWorker(f.db,token,true));
 f.state.lease_id='lease';f.state.lease_until=new Date(Date.now()+60000).toISOString();await context.verifyWorker(f.db,token,true);
});
test('closed-browser worker prepares unanswered only and publishes only eligible safe output',async()=>{
 const f=fixture();const r=await context.runAutomation(f.db,token,f.deps);
 assert.deepEqual(f.prepared,['safe','risk']);assert.deepEqual(f.published,['safe']);assert.equal(r.status,'succeeded');assert.equal(r.published,1);
 assert.equal(f.writes.at(-1).values.lease_id,null);
});
test('concurrent or not-due invocation does not generate or send',async()=>{
 const f=fixture({locked:true});const r=await context.runAutomation(f.db,token,f.deps);assert.equal(r.skipped,true);assert.equal(f.writes.length,0);
});
test('paused branch and partial Google reads fail closed',async()=>{
 for(const opts of [{paused:true},{sync:{branches:[{branch_id:'branch-google-nilufer',pagination_complete:false,reviews:[]}]}},{sync:{branches:[],errors:[{error:'Google auth failed'}]}}]){
 const f=fixture(opts);const r=await context.runAutomation(f.db,token,f.deps);assert.equal(r.status,'failed');assert.equal(f.prepared.length,0);assert.equal(f.published.length,0);
 }
});
test('existing failed work does not trigger unbounded paid regeneration',async()=>{
 const f=fixture({existing:true,queue:[]});await context.runAutomation(f.db,token,f.deps);assert.equal(f.prepared.length,0);
});
test('AI batch is bounded to two and does not touch replied reviews',async()=>{
 const f=fixture({reviews:[1,2,3,4].map(n=>({reviewId:String(n)})),queue:[]});await context.runAutomation(f.db,token,f.deps);assert.equal(f.prepared.length,2);
});
