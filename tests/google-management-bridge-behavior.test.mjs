import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code = readFileSync(new URL('../assets/google-review-management-bridge.js', import.meta.url), 'utf8');
function fixture(rows = []) {
  const calls = [], listeners = {}, nodes = new Map();
  const node = () => ({style:{}, after(){}, innerHTML:'', textContent:''});
  const document = {documentElement:{dataset:{}}, querySelector:()=>null, querySelectorAll:()=>[], createElement:node, getElementById(id){if(!nodes.has(id)) nodes.set(id,node());return nodes.get(id);}};
  const api = {getBranchById:()=>({}), fetchGoogleReviews:()=>rows, setCenterView:(...a)=>calls.push(['view',...a]), syncGoogleReviewsForBranch:async(...a)=>calls.push(['sync',...a])};
  const ai = {getWorkflowItems:()=>[], generate:id=>calls.push(['generate',id]), createTask:async(...a)=>{calls.push(['task',...a]);return {id:'task'};}};
  const context = {URLSearchParams, location:{search:'?embedded=1',origin:'https://erp.test'}, document, BRANCHES:[{city:'Bursa',name:'Nilüfer'},{city:'Kocaeli',name:'Gebze'},{city:'Bursa',name:'İnegöl'}], REVIEWS:[{id:1,store:'Bursa Nilüfer'}], LEGAL_CASES:[], COMPLAINTS:[], APPROVALS:[], STATE:{view:'overview'}, SELECTED:new Set(), SEL:null, toast:(...a)=>calls.push(['toast',...a]), makePipe:()=>({stages:{},routedTo:null}), renderNav(){}, renderReviews(){}, switchView(){}, CURRENT_DRAWER:null};
  context.window=context;
  context.parent={location:{origin:context.location.origin},OTOTRGoogleReputation:api,OTOTRGoogleReviewAI:ai};
  context.addEventListener=(name,fn)=>{listeners[name]=fn;};
  for(const name of ['openEmail','regenDraft','closeRouting','routeReview','bulkAction','openSimulateReview','submitSimReview','saveDrawer','toggleAuto']) context[name]=(...a)=>calls.push(['demo',name,...a]);
  vm.runInNewContext(code,context);
  return {context,calls,listeners,rows,nodes};
}
const live = {id:'erp-review-1',googleReviewId:'google-1',branchId:'branch-google-nilufer',rating:5,reviewerName:'<img onerror=alert(1)>',comment:'</textarea><script>x</script>',reviewDate:'2026-11-13T10:00:00Z'};
test('empty Google result never retains synthetic Bursa reviews',()=>{
  const {context:c}=fixture();
  assert.equal(c.REVIEWS.filter(r=>r.store==='Bursa Nilüfer').length,0);
  assert.equal(c.BRANCHES[0].actual,0);
});
test('real review gets stable numeric UI identity and escaped content',()=>{
  const f=fixture([live]); const row=f.context.REVIEWS[0];
  assert.equal(typeof row.id,'number'); assert.ok(row.drafts.length);
  assert.doesNotMatch(row.text, /<script/); assert.doesNotMatch(row.author, /<img/);
  f.listeners.message({origin:'https://erp.test',source:f.context.parent,data:{type:'ototr-google-refresh'}});
  assert.equal(f.context.REVIEWS[0].id,row.id);
});
test('live approval and regeneration use ERP AI; demo never calls it',()=>{
  const f=fixture([live]), c=f.context, id=c.REVIEWS[0].id;
  c.openEmail(id); c.regenDraft(id); c.openEmail(1);
  assert.deepEqual(f.calls.filter(x=>x[0]==='generate'),[['generate',live.id],['generate',live.id]]);
  assert.ok(f.calls.some(x=>x[0]==='demo'));
  assert.equal(c.REVIEWS[0].status,'bekliyor');
});
test('routing preserves authoritative ERP identity and maps store task',async()=>{
  const f=fixture([live]); await f.context.routeReview(f.context.REVIEWS[0].id,'store');
  assert.deepEqual(f.calls.find(x=>x[0]==='task'),['task',live.id,'branch']);
});
test('mixed bulk approval cannot mutate live reviews or run demo publisher',()=>{
  const f=fixture([live]); f.context.SELECTED.add(f.context.REVIEWS[0].id); f.context.SELECTED.add(1);
  f.context.bulkAction('approve');
  assert.ok(f.calls.some(x=>x[0]==='view'));
  assert.ok(!f.calls.some(x=>x[0]==='demo'));
});
test('foreign-origin refresh message cannot change data',()=>{
  const f=fixture([live]); f.rows.length=0;
  f.listeners.message({origin:'https://evil.test',source:f.context.parent,data:{type:'ototr-google-refresh'}});
  assert.equal(f.context.REVIEWS.filter(r=>!r.demo).length,1);
  f.listeners.message({origin:'https://erp.test',source:f.context.parent,data:{type:'ototr-google-refresh'}});
  assert.equal(f.context.REVIEWS.filter(r=>!r.demo).length,0);
});
test('role dropdown cannot change live authority and live textarea is read-only',()=>{
  const f=fixture([live]); assert.equal(f.nodes.get('roleSelect').disabled,true);
  f.context.SEL=f.context.REVIEWS[0].id;f.context.renderReviews();
  assert.equal(f.nodes.get('draftBox').readOnly,true);
});
test('persisted approval/legal/complaint items open the original ERP records',()=>{
  const f=fixture([live]), ai=f.context.parent.OTOTRGoogleReviewAI;
  ai.getWorkflowItems=()=>['reply','legal','complaint'].map(kind=>({id:kind+'-id',kind,branch_id:'branch-google-nilufer',review_id:'google-1',status:'open',created_at:'2026-11-13T10:00:00Z',reply_text:'</textarea>',review_snapshot:{reviewer_name:'<img>',comment:'<script>'}}));
  ai.openItem=id=>f.calls.push(['open',id]);
  f.listeners.message({origin:'https://erp.test',source:f.context.parent,data:{type:'ototr-google-refresh'}});
  f.context.approveApp(f.context.APPROVALS[0].id);
  f.context.openCaseDetail(f.context.LEGAL_CASES[0].id);
  f.context.advanceComplaint(f.context.COMPLAINTS[0].id);
  assert.deepEqual(f.calls.filter(x=>x[0]==='open'),[['open','reply-id'],['open','legal-id'],['open','complaint-id']]);
  assert.doesNotMatch(f.context.LEGAL_CASES[0].review,/<script>/);
  assert.equal(f.context.APPROVALS.length,1);
});
test('embedded state is neither restored nor written to browser demo storage',()=>{
  const html=readFileSync(new URL('../google-review-management.html',import.meta.url),'utf8');
  const load=html.match(/function loadState\(\)\{([\s\S]*?)\n\}/)[1];
  const save=html.match(/function saveState\(\)\{([\s\S]*?)\n\}/)[1];
  const c={URLSearchParams,location:{search:'?embedded=1'},seedState:()=>({demo:true}),localStorage:{getItem(){throw Error('read forbidden')},setItem(){throw Error('write forbidden')}},STATE:{private:'customer'}};
  assert.equal(vm.runInNewContext(`(function(){${load}})()`,c).demo,true);
  vm.runInNewContext(`(function(){${save}})()`,c);
});
