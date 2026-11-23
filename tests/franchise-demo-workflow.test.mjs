import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowView,packages} from '../ajan-ofisi/franchise-demo-workflow.mjs';
import roster from '../ajan-ofisi/management-data.mjs';
test('all packages use existing expert and manager ownership; no other departments activated',()=>{
 for(const p of packages){const d=roster.modules.find(d=>d.id===p.team);assert.ok(d.agents.some(a=>a.id===p.id));assert.equal(p.manager,d.manager);for(const k of ['finding','recommendation','risk','effort','decision','evidence'])assert.ok(p[k]);}
 assert.equal(new Set(packages.map(p=>p.id)).size,4);
});
test('handoffs are assigned then acknowledged, with risk review never falsely completed',()=>{
 assert.equal(workflowView({workflow_step:0}).packages.length,0);
 assert.match(workflowView({workflow_step:1}).packages[0].status,/Devredildi/);
 assert.match(workflowView({workflow_step:2}).packages[0].status,/Alındı/);
 assert.ok(workflowView({workflow_step:3}).packages.every(p=>p.status.includes('denetim bekliyor')));
});
test('decision gate stops advancement and only shows two bounded review requests',()=>{
 const w=workflowView({workflow_step:4,task_id:'demo'});assert.equal(w.next,null);assert.equal(w.decisions.length,2);assert.equal(w.decisions.reduce((n,d)=>n+d.minutes,0),10);
 assert.equal(workflowView({workflow_step:3}).decisions.length,0);
 assert.equal(new Set(w.packages.map(p=>p.key)).size,4);
});
