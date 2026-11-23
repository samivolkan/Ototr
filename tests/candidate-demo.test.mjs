import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenes,questions} from '../ajan-ofisi/candidate-demo-data.mjs';
import {initialState,transition,canAdvance,demoReport} from '../ajan-ofisi/candidate-demo-model.mjs';
import workflow from '../ajan-ofisi/franchise-workflow-data.mjs';
import catalog from '../ajan-ofisi/management-data.mjs';
test('14 lifecycle stages preserve the source order, followed by 30/60/90 and conclusion',()=>{
 assert.deepEqual(scenes.slice(0,14).map(s=>s.title),workflow.stages.map(s=>s.title));
 assert.deepEqual(scenes.slice(14).map(s=>s.id),['FU30','FU60','FU90','DONE']);
 assert.equal(new Set(scenes.map(s=>s.id)).size,scenes.length);
});
test('all existing experts and explicitly proposed roles appear with no invented agents',()=>{
 const expected=catalog.modules.flatMap(m=>m.agents.map(a=>a.id));const actual=[...new Set(scenes.flatMap(s=>s.agents))];
 assert.deepEqual(actual.sort(),expected.sort());assert.equal(questions.length,8);
});
test('autoplay advancement cannot cross any human decision without explicit approval',()=>{
 let state=initialState(),gates=0;
 while(!state.finished){if(scenes[state.index].decision){gates++;assert.equal(canAdvance(state),false);assert.equal(transition(state,'next').index,state.index);state=transition(state,'approve');}assert.equal(canAdvance(state),true);state=transition(state,'next');}
 assert.equal(gates,3);assert.equal(state.approved.length,3);assert.equal(state.index,17);assert.match(demoReport(state),/Gerçek kayıt, ödeme, mesaj veya ajan çalışması değildir/);
});
test('revision blocks approval until resolved and invalidates downstream approvals',()=>{
 let state={...initialState(),index:7,approved:[7,8,12]};state=transition(state,'revise');assert.deepEqual(state.approved,[]);assert.equal(canAdvance(state),false);assert.deepEqual(transition(state,'approve').approved,[]);state=transition(state,'resolve');assert.equal(canAdvance(state),false);state=transition(state,'approve');assert.deepEqual(state.approved,[7]);assert.equal(canAdvance(state),true);
});
test('reset and backward navigation preserve bounds and do not complete an unapproved journey',()=>{
 assert.equal(transition(initialState(),'back').index,0);assert.deepEqual(transition({index:17,approved:[7,8,12],revisions:[8],resolved:[8],finished:true},'reset'),initialState());assert.equal(transition(initialState(),'approve').approved.length,0);
});
test('recording surface makes fiction explicit and has no remote write client or data persistence',()=>{
 const ui=fs.readFileSync(new URL('../ajan-ofisi/candidate-demo-ui.mjs',import.meta.url),'utf8');const html=fs.readFileSync(new URL('../ajan-ofisi/candidate-demo.html',import.meta.url),'utf8');assert.doesNotMatch(ui,/fetch\s*\(|XMLHttpRequest|localStorage|supabase|WebSocket/);assert.match(html,/SİMÜLASYON · GERÇEK İŞLEM YOK/);assert.match(html,/Önceden yazılmış hikâye/);assert.match(ui,/document.hidden/);
});
