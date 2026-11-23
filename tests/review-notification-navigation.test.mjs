import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/google-review-alternative.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('  async function openNotification('),source.indexOf('  root.OTOTRReviewAlternative ='));
function setup(editing=false){const calls=[];const scope={};const c=vm.createContext({Error,Date,root:{OTOTRReviewBridge:{isEditing:()=>editing},switchView:(...a)=>calls.push(a),selectReview:id=>calls.push(['select',id]),toast:m=>calls.push(['toast',m])},liveRegistry:()=>[{id:'branch-google-nilufer',region:'Marmara',city:'Bursa'}],live:()=>({setScope:s=>calls.push(['scope',s]),getBranchId:()=> 'branch-google-nilufer'}),BRANCH_IDS:['branch-google-nilufer'],analyticsScope:scope,operationalRows:()=>[{id:-8,googleReviewId:'google-123',demo:false}],byId:()=>null,reviewDay:null,reviewPeriod:'today',goalMonth:'2026-11'});vm.runInContext(fn,c);return{c,calls,scope};}
test('review notification selects exact live review',async()=>{const{c,calls}=setup();await c.openNotification({branch_id:'branch-google-nilufer',event:'new_review',review_id:'google-123'});assert.equal(calls.at(-1)[1],-8);assert.equal(c.reviewPeriod,'all');});
test('goal notification selects exact branch and historical month',async()=>{const{c,calls,scope}=setup();await c.openNotification({branch_id:'branch-google-nilufer',event:'goal_above',goal_month:'2026-10'});assert.equal(scope.branch,'branch-google-nilufer');assert.equal(c.goalMonth,'2026-10');assert.equal(calls.at(-1)[0],'performance');});
test('missing review opens branch list with honest notice',async()=>{const{c,calls}=setup();await c.openNotification({branch_id:'branch-google-nilufer',event:'reply_published',review_id:'removed'});assert.equal(calls.at(-1)[0],'toast');assert.ok(!calls.some(x=>x[0]==='select'));});
test('unknown branch cannot fall back to another branch',async()=>{const{c,calls}=setup();await assert.rejects(c.openNotification({branch_id:'unknown',event:'new_review'}));assert.equal(calls.length,0);});
test('unsaved draft blocks navigation',async()=>{const{c,calls}=setup(true);await assert.rejects(c.openNotification({branch_id:'branch-google-nilufer',event:'new_review'}));assert.equal(calls.length,0);});
