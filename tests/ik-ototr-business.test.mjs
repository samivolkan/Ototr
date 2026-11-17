import test from 'node:test';import assert from 'node:assert/strict';
import {ORGANIZATION,treeValid,initialRecords,transition,eligible,effectiveAssignments} from '../ik-ototr/business-model.mjs';
import {seed} from '../ik-ototr/demo-seed.mjs';
const s=seed(),records=initialRecords(s.employees),context={headquarters:true,actor:'hq',writeUnits:[],employees:s.employees,assets:s.assets,records,today:'2026-11-18'};
test('the original 13-node organization is preserved; cycles and overfilled capacity are rejected',()=>{
 assert.equal(ORGANIZATION.length,13);assert.equal(ORGANIZATION.find(n=>n.id==='aka').parent,'tek');assert.ok(ORGANIZATION.every(n=>n.capacity===1&&n.occupied===1));treeValid(ORGANIZATION);
 const cycle=structuredClone(ORGANIZATION);cycle[0].parent='aka';assert.throws(()=>treeValid(cycle),/döngülü/);const full=structuredClone(ORGANIZATION);full[0].capacity=0;assert.throws(()=>treeValid(full),/Kadro/);
});
test('each unit has capacity, academy, calibration and onboarding examples',()=>{for(const unit of s.settings.branches)for(const kind of ['position','enrollment','calibration','lifecycle'])assert.ok(records.some(r=>r.unit===unit&&r.kind===kind));});
test('academy requires lessons, scores failures, issues a dated certificate and locks completed exams',()=>{
 let r={id:'exam',kind:'enrollment',unit:'Gebze',employee_id:'e9',state:'enrolled',revision:1,payload:{course:'motor',skill:'Motor',lessons:[],attempts:0}};
 assert.throws(()=>transition(r,'exam',{answers:[0,1,2]},context),/dersleri/);
 for(let index=0;index<3;index++)r=transition(r,'lesson',{index},context);
 r=transition(r,'exam',{answers:[0,0,0]},context);assert.equal(r.state,'failed');assert.equal(r.payload.score,33);
 r=transition(r,'exam',{answers:[0,1,2]},context);assert.equal(r.state,'passed');assert.equal(r.payload.validUntil,'2027-11-18');assert.throws(()=>transition(r,'exam',{answers:[0,1,2]},context),/değiştirilemez/);
});
test('assignment stages require distinct authorized actors and valid certification',()=>{
 let r={id:'assignment',kind:'assignment',unit:'Gebze',to_unit:'Nilüfer',employee_id:'e8',created_by:'requester',state:'requested',revision:1,payload:{skill:'Motor',start:'2026-11-18',end:'2026-11-20'}};
 assert.throws(()=>transition(r,'approve',{}, {...context,actor:'requester'}),/Ayrı/);
 r=transition(r,'approve',{}, {...context,headquarters:false,actor:'source',writeUnits:['Gebze']});
 assert.throws(()=>transition(r,'approve',{}, {...context,actor:'source'}),/Ayrı/);
 r=transition(r,'approve',{}, {...context,headquarters:false,actor:'target',writeUnits:['Nilüfer']});
 assert.throws(()=>transition(r,'approve',{}, {...context,headquarters:false,actor:'target',writeUnits:['Nilüfer']}),/yetki/);
 r=transition(r,'approve',{},context);assert.equal(effectiveAssignments([r],'Nilüfer','2026-11-19').length,1);assert.equal(effectiveAssignments([r],'Nilüfer','2026-11-21').length,0);
 r=transition(r,'complete',{},context);assert.equal(effectiveAssignments([r],'Nilüfer','2026-11-19').length,0);
});
test('offboarding cannot complete with unchecked tasks or active assets',()=>{
 let r={id:'exit',kind:'lifecycle',unit:'Gebze',employee_id:'e8',state:'draft',revision:1,payload:{type:'offboarding',date:'2026-11-18',checks:Array(8).fill(false)}};
 assert.throws(()=>transition(r,'complete',{},context),/kontroller/);for(let index=0;index<8;index++)r=transition(r,'check',{index},context);
 assert.throws(()=>transition(r,'complete',{},context),/zimmet/);r=transition(r,'complete',{}, {...context,assets:[]});assert.equal(r.state,'completed');
});
test('technical publication requires certification/calibration and a different central approver',()=>{
 let r={id:'report',kind:'inspection',unit:'Gebze',employee_id:'e8',created_by:'author',state:'draft',revision:1,payload:{skill:'Motor'}};
 assert.throws(()=>transition(r,'submit',{}, {...context,actor:'author',records:[]}),/kalibrasyon/);
 r=transition(r,'submit',{}, {...context,actor:'author'});assert.throws(()=>transition(r,'approve',{}, {...context,actor:'author'}),/dört göz/);
 r=transition(r,'approve',{},context);assert.equal(r.state,'published');assert.throws(()=>transition(r,'revise',{reason:''},context),/gerekçesi/);r=transition(r,'revise',{reason:'Demo yeniden inceleme'},context);assert.equal(r.state,'revision');
});
test('demo integration validates mode and refuses duplicate delivery',()=>{
 const r={id:'event',kind:'integration',unit:'Gebze',state:'draft',revision:1,payload:{mode:'synthetic-demo',event:'staffing_plan.created'}};
 const ack=transition(r,'dispatch',{},context);assert.equal(ack.state,'acknowledged');assert.throws(()=>transition(ack,'dispatch',{},context),/daha önce/);
 assert.throws(()=>transition({...r,payload:{...r.payload,mode:'live'}},'dispatch',{},context),/geçersiz/);
});
test('certification expires; read-only and unrelated branch cannot mutate',()=>{
 assert.equal(eligible(records,'e8','Motor','2028-01-01'),false);
 const r=records.find(r=>r.kind==='position'&&r.unit==='Gebze');assert.throws(()=>transition(r,'edit',r.payload,{...context,headquarters:false,writeUnits:['Nilüfer']}),/yetkisi/);
});
