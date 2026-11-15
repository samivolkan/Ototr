import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const env=Object.fromEntries(readFileSync(new URL('../.env',import.meta.url),'utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}));
const base='http://127.0.0.1:4000/api';
let checks=0;
async function call(path,token,body,method){const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
function ok(condition,label){assert.ok(condition,label);checks++;console.log('PASS '+label);}
async function login(email){const r=await call('/auth/login',null,{email,password:env.DEMO_PASSWORD});assert.equal(r.status,200);return r.body.token;}
ok((await call('/health')).body.status==='ok','health');
ok((await call('/reviews')).status===401,'anonymous denied');
const admin=await login('admin@ototr.com'),manager=await login('nilufer@ototr.com'),legal=await login('legal@ototr.com'),complaint=await login('complaint@ototr.com'),region=await login('marmara@ototr.com');
ok((await call('/stores',admin)).body.length===3,'three demo stores');
ok((await call('/stores',manager)).body.length===1,'store scope');
ok((await call('/stores',region)).body.length===3,'region scope');
ok((await call('/reviews/demo-review-1',manager)).status===404,'foreign review denied');
ok((await call('/reviews/demo-review-0',legal)).status===404,'legal unrouted denied');
ok((await call('/reviews/demo-review-0',complaint)).status===404,'complaint unrouted denied');
ok((await call('/reviews/drafts/draft-demo-review-1',manager,{text:'Unauthorized',version:1},'PATCH')).status===404,'foreign draft edit denied');
ok((await call('/reviews/demo-review-1/approve',manager,{draft_id:'draft-demo-review-1',version:1})).status===404,'foreign approval denied');
ok((await call('/reviews/bulk',manager,{items:[{id:'demo-review-1',draft_id:'draft-demo-review-1',version:1}]})).status===404,'bulk foreign denied');
const created=await call('/reviews',admin,{store_id:'demo-nilufer',author:'Synthetic QA',stars:5,text:'Test fixture'});assert.equal(created.status,201);const id=created.body.id;const details=(await call('/reviews/'+id,admin)).body;const d=details.drafts[0];
const approved=await call('/reviews/'+id+'/approve',admin,{draft_id:d.id,version:1});ok(approved.body.simulated===true&&approved.body.gbpPosted===false,'demo never published');
ok((await call('/reviews/'+id+'/approve',admin,{draft_id:d.id,version:1})).body.duplicate===true,'duplicate approval idempotent');
ok((await call('/reviews/drafts/'+d.id,admin,{text:'Edited draft',version:1},'PATCH')).status===200,'draft edit');
ok((await call('/reviews/'+id+'/approve',admin,{draft_id:d.id,version:1})).status===409,'stale approval rejected');
const updated=(await call('/reviews/'+id,admin)).body;ok(updated.drafts[0].approved_by===null&&updated.status==='approval_pending','edit clears approval');
await call('/reviews/'+id+'/route',admin,{target:'legal'});
ok((await call('/reviews/'+id+'/approve',admin,{draft_id:d.id,version:2})).status===409,'legal hold blocks');
ok((await call('/reviews/'+id,legal)).status===200,'legal assigned visibility');
ok((await call('/reviews/'+id+'/approve',legal,{draft_id:d.id,version:2})).status===403,'legal cannot publish');
ok((await call('/system/health-details',manager)).status===403,'admin-only health details');
const before=(await call('/audit',admin)).body.length;await call('/system/sla-status',admin);ok((await call('/audit',admin)).body.length===before,'SLA GET is read-only');
console.log(checks+' checks passed; no external messages sent');
