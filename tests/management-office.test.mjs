import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../ajan-ofisi/management-data.mjs';
import {cleanNotes,selectedModules,planningSummary} from '../ajan-ofisi/management-model.mjs';
const roster=JSON.parse(fs.readFileSync(new URL('../ajan-ofisi/office-data.json',import.meta.url),'utf8'));
test('every current expert has exactly one owner and a deliverable; planned roles stay separate',()=>{
 const ids=data.modules.flatMap(m=>m.agents.map(a=>a.id)); assert.equal(new Set(ids).size,ids.length);
 for(const d of roster.departments){const m=data.modules.find(m=>m.id===d.id);assert.equal(m.manager,d.manager);assert.deepEqual(m.agents.map(a=>a.id),d.agents.map(a=>a.id));assert.ok(m.agents.every(a=>a.deliverable&&a.scope));}
 assert.equal(data.modules.filter(m=>m.kind==='existing').flatMap(m=>m.agents).length,18);
 assert.ok(data.modules.filter(m=>m.kind==='proposed').every(m=>m.agents.every(a=>a.id.startsWith('PLAN-'))));
});
test('dependency chain has no missing nodes or cycles',()=>{function visit(id,path=[]){assert.ok(!path.includes(id));const m=data.modules.find(m=>m.id===id);assert.ok(m);m.dependencies.forEach(d=>visit(d,[...path,id]));}data.modules.forEach(m=>visit(m.id));});
test('all operational links resolve to existing files',()=>{for(const m of data.modules.filter(m=>m.href)){const u=new URL('../ajan-ofisi/'+m.href,import.meta.url);assert.ok(fs.existsSync(u.href.endsWith('/')?new URL('index.html',u):u),m.href);}});
test('tampered storage cannot mark plans approved or activate unknown agents',()=>{const notes=cleanNotes({FIN:{state:'approved',note:'x'},DEV:{state:'ready',note:'x'.repeat(2000)},UNKNOWN:{state:'ready'}},data.modules);assert.deepEqual(Object.keys(notes),['DEV']);assert.equal(notes.DEV.note.length,1200);assert.deepEqual(cleanNotes(null,data.modules),{});});
test('Turkish search and proposed filter remain distinct',()=>{assert.ok(selectedModules(data.modules,'İNSAN').some(m=>m.id==='HR'));assert.equal(selectedModules(data.modules,'','proposed').length,3);assert.equal(selectedModules(data.modules,'','current').length,7);assert.equal(selectedModules(data.modules,'nothing').length,0);});
test('summary never claims to be a live approval queue',()=>{const result=planningSummary(data,{FIN:{state:'reviewing',note:'Demo takip'}});assert.match(result,/canlı görev veya onay kuyruğu değildir/);assert.match(result,/Demo takip/);assert.match(result,/14 saat/);assert.equal(data.limits.queue,10);});
