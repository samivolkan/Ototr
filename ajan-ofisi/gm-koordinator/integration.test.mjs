import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDemo,dispatch,DEPARTMENTS,FIXTURES} from './model.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('Existing office roster owns all seven demo departments and eighteen experts',()=>{
 const roster=JSON.parse(read('../office-data.json'));
 assert.equal(roster.departments.flatMap(d=>d.agents).length,18);
 for(const d of DEPARTMENTS){const existing=roster.departments.find(x=>x.id===d.id);assert.ok(existing);assert.ok(existing.agents.some(a=>a.id===d.owner));assert.equal(existing.manager,'MGR-'+d.id);}
});
test('Office entry and all linked module paths resolve',()=>{
 assert.match(read('../index.html'),/href="gm-koordinator\/"/);
 for(const d of DEPARTMENTS){const target=new URL(d.href.endsWith('/')?d.href+'index.html':d.href,import.meta.url);assert.ok(fs.existsSync(target),d.href);}
 for(const path of ['app.mjs','model.mjs','dossiers.mjs','scenarios.mjs','style.css','PROJECT.md'])assert.ok(fs.existsSync(new URL(path,import.meta.url)),path);
});
test('Deployment verifies coordinator before publication',()=>{assert.match(read('../../.github/workflows/deploy-pages.yml'),/node --test ajan-ofisi\/gm-koordinator\/\*\.test\.mjs/);});
test('Demo modules contain no external write or model execution clients',()=>{
 const code=['model.mjs','app.mjs','dossiers.mjs','scenarios.mjs'].map(read).join('\n');
 assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|sk-proj-|service_role/);
 assert.match(read('index.html'),/Gerçek müşteri verisi, ödeme, mesaj veya yayın işlemi yok/);
});
test('Circular dependency rejected atomically',()=>{
 let s=createDemo();s=dispatch(s,{id:'a',actor:'COO-01',type:'ingest',payload:{event:{...FIXTURES[0],id:'a',dependsOn:['b']}},expectedRevision:0});
 assert.throws(()=>dispatch(s,{id:'b',actor:'COO-01',type:'ingest',payload:{event:{...FIXTURES[0],id:'b',dependsOn:['a']}},expectedRevision:1}),/Döngüsel/);assert.equal(s.tasks.length,1);
});
test('Approval binds the exact reviewable dossier, not only the version number',()=>{
 let s=createDemo();let seq=0;const send=(type,payload={},actor='COO-01')=>{s=dispatch(s,{id:String(++seq),actor,type,payload,expectedRevision:s.revision});};send('seed');const t=s.tasks.find(t=>t.eventId==='blog');send('approve',{taskId:t.id,version:1,decision:'approved',note:'İncelenen demo içerik'},'SAMI-DEMO');
 s.tasks.find(x=>x.id===t.id).dossier.deliverable='Değiştirilmiş içerik';send('cycle');assert.equal(s.tasks.find(x=>x.id===t.id).status,'approval');assert.ok(!s.outbox.some(x=>x.taskId===t.id));
});
test('Wrong delivery content cannot pass independent control',()=>{
 let s=createDemo();s=dispatch(s,{id:'1',actor:'COO-01',type:'seed',expectedRevision:0});s=dispatch(s,{id:'2',actor:'COO-01',type:'cycle',expectedRevision:1});const t=s.tasks.find(t=>t.eventId==='complaint');s.outbox.find(r=>r.taskId===t.id).snapshot='changed';assert.throws(()=>dispatch(s,{id:'3',actor:'BEK-01',type:'review',payload:{taskId:t.id,version:1,result:'passed',note:'İçerik kontrolü'},expectedRevision:2}),/eşleşmiyor/);
});
test('Source updates reject inherited object property names',()=>{const s=createDemo();assert.throws(()=>dispatch(s,{id:'p',actor:'COO-01',type:'source',payload:{dept:'__proto__',online:false},expectedRevision:0}));assert.equal(Object.prototype.online,undefined);});
test('Independent demos do not share mutable dossier objects',()=>{const c={id:'1',actor:'COO-01',type:'seed',expectedRevision:0};const a=dispatch(createDemo(),c);a.tasks[0].dossier.deliverable='changed';const b=dispatch(createDemo(),c);assert.notEqual(b.tasks[0].dossier.deliverable,'changed');});
test('Weekly budget blocks work without changing daily budget',()=>{let s=dispatch(createDemo(),{id:'1',actor:'COO-01',type:'seed',expectedRevision:0});s.usage.weekly=840;s=dispatch(s,{id:'2',actor:'COO-01',type:'cycle',expectedRevision:1});assert.equal(s.outbox.length,0);assert.equal(s.usage.daily,0);});
test('Unknown dependency remains blocked, never assumed complete',()=>{const s=dispatch(createDemo(),{id:'1',actor:'COO-01',type:'ingest',payload:{event:{...FIXTURES[0],dependsOn:['missing']}},expectedRevision:0});assert.equal(s.tasks[0].status,'blocked');});
