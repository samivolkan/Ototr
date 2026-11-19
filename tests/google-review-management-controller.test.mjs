import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../assets/google-review-management-controller.js',import.meta.url),'utf8');
function setup(respond) {
  const calls=[],records=[{id:'task1',kind:'legal',branch_id:'branch-google-nilufer',version:4,status:'open'},{id:'demo',kind:'legal',branch_id:'gebze',version:1},{id:'draft',kind:'reply',branch_id:'branch-google-nilufer',version:7,status:'approval_pending'}];
  const policy={default_sla_hours:24,updated_at:'2026-11-15T00:00:00Z',auto_reply_enabled:false};
  const ai={getWorkflowItems:()=>records,refreshWorkflow:async()=>{},googleBusinessRequest:async(action,body)=>{
    calls.push({action,body});
    if(respond){const value=await respond(action,body);if(value!==undefined)return value;}
    if(action==='management_read')return {branch_id:'branch-google-nilufer',policy,audit:[],users:[],settings:{}};
    if(action==='targets_list')return {items:[]};
    return {item:{id:body.item_id,version:(body.expected_version||0)+1},policy};
  }};
  const window={parent:{location:{origin:'https://erp.test'},OTOTRGoogleReviewAI:ai},dispatchEvent(){},OTOTRReviewBridge:{hydrate(){},isEditing:()=>false}};
  const context=vm.createContext({window,document:{getElementById:()=>null},location:{origin:'https://erp.test'},CustomEvent:class{},BRANCHES:[{id:'b1'}],LEGAL_CASES:[],COMPLAINTS:[],APPROVALS:[],REVIEWS:[],toast(){},closeModal(){},switchView(){},selectReview(){},prompt(){},Date,Number,Set,console});
  vm.runInContext(source,context);
  return {api:window.OTOTRReviewManagement,calls,records,window};
}
async function ready(subject){for(let i=0;i<15&&subject.api.state.loading;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(subject.api.state.loaded,true);subject.calls.length=0;return subject;}

test('management refresh loads actual policy and uses only Bursa branch',async()=>{
  const s=await ready(setup());
  assert.equal(s.api.state.policy.default_sla_hours,24);
  assert.equal(s.api.state.policy.auto_reply_enabled,false);
  await s.api.request('management_read',{branch_id:'gebze'});
  assert.equal(s.calls[0].body.branch_id,'branch-google-nilufer');
});

test('branch setup addresses its own record without permitting cross-branch review writes',async()=>{
  const s=await ready(setup());
  const id='branch-custom-onboarding-example-20261119';
  for(const action of ['branch_onboarding','branch_update','branch_activate']){
    await s.api.request(action,{branch_id:id});
    assert.equal(s.calls.at(-1).body.branch_id,id);
  }
  await s.api.request('save_draft',{branch_id:id});
  assert.equal(s.calls.at(-1).body.branch_id,'branch-google-nilufer');
});
test('SLA save validates range and carries expected policy timestamp',async()=>{
  const s=await ready(setup());
  await assert.rejects(s.api.savePolicy(0),/1–168/);
  await s.api.savePolicy(48);
  const call=s.calls.find(call=>call.action==='management_update');
  assert.equal(call.body.expected_updated_at,'2026-11-15T00:00:00Z');
  assert.equal(call.body.default_sla_hours,48);
  assert.equal('auto_reply_enabled' in call.body,false);
});

test('setup settings explicitly scope the new branch and refuse publication or live branch access',async()=>{
 const s=await ready(setup()),id='branch-custom-example';
 s.window.OTOTRReviewLiveViews={getBranchRegistry:()=>[{id,lifecycle:'demo',onboarding:{test:true}}]};
 await s.api.setupRequest('target_save',id,{target:35,expected_version:1,month:'2026-11-01'});
 assert.equal(s.calls.at(-1).body.branch_id,id);
 await assert.rejects(s.api.setupRequest('publish_reply',id),/kurulum ayarı/);
 await assert.rejects(s.api.setupRequest('management_update',id,{entity:'task'}),/kurulum ayarı/);
 await assert.rejects(s.api.setupRequest('target_save','branch-google-nilufer'),/Kurulum şubesi/);
});
test('foreign tasks and stale task edits never reach the server',async()=>{
  const s=await ready(setup());
  await assert.rejects(s.api.updateTask('demo',{status:'done'},1),/bulunamadı/);
  await assert.rejects(s.api.updateTask('task1',{status:'done'},3),/sürümü değişti/);
  assert.equal(s.calls.length,0);
});
test('legal hold uses canonical live task ID and optimistic version',async()=>{
  const s=await ready(setup());
  await s.api.updateTask('task1',{hold:true,note:'İnceleme devam ediyor'},4);
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls[0])),{action:'management_update',body:{hold:true,note:'İnceleme devam ediyor',entity:'task',item_id:'task1',expected_version:4,branch_id:'branch-google-nilufer'}});
});
test('draft rejection requires a reason and binds exact saved version',async()=>{
  const s=await ready(setup());
  await assert.rejects(s.api.rejectDraft('draft',' ',7),/gerekçesi/);
  await assert.rejects(s.api.rejectDraft('draft','Revize',6),/sürümü değişti/);
  await s.api.rejectDraft('draft','Revize gerekli',7);
  assert.equal(s.calls[0].action,'reject_draft');
  assert.equal(s.calls[0].body.expected_version,7);
});
test('duplicate clicks are locked, and failed mutations retain server state',async()=>{
  let fail; const s=await ready(setup(action=>action==='management_update'?new Promise((_,reject)=>{fail=reject;}):undefined));
  const first=s.api.updateTask('task1',{status:'done'},4);
  await assert.rejects(s.api.updateTask('task1',{status:'done'},4),/işlem sürüyor/);
  fail(new Error('Sürüm uyuşmazlığı'));
  await assert.rejects(first,/Sürüm uyuşmazlığı/);
  assert.equal(s.records[0].status,'open');
  assert.equal(s.records[0].version,4);
});
test('a dirty review draft prevents unrelated mutations that would rerender it',async()=>{
  const s=await ready(setup());s.window.OTOTRReviewBridge.isEditing=()=>true;
  await assert.rejects(s.api.savePolicy(12),/taslağını kaydedin/);
  assert.equal(s.calls.length,0);
});
test('failed management reads never claim a successful live connection',async()=>{
  const s=setup(action=>{if(action==='management_read')throw new Error('Yetkisiz');});
  for(let i=0;i<10&&s.api.state.loading;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.api.state.loaded,false);
  assert.equal(s.api.state.error,'Yetkisiz');
  await assert.rejects(s.api.savePolicy(24),/yenileyin/);
});
test('same-month demo target cannot supply Bursa target or optimistic version',async()=>{
  const now=new Date(),month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const s=await ready(setup(action=>action==='targets_list'?{items:[{branch_id:'branch-google-gebze',month,target:900,version:99},{branch_id:'branch-google-nilufer',month,target:30,version:4}]}:undefined));
  assert.equal(s.api.state.targets.length,1);
  assert.equal(s.api.state.targets[0].target,30);
  await s.api.saveTarget(40);
  assert.equal(s.calls[0].body.expected_version,4);
  assert.equal(s.calls[0].body.branch_id,'branch-google-nilufer');
});
