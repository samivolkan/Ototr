import test from 'node:test';
import assert from 'node:assert/strict';
import {createJourney,tickJourney} from '../ajan-ofisi/office-demo-journey.mjs';
import {reportProgress,taskProgress} from '../ajan-ofisi/branch-operations-model.mjs';
test('demo runs intake, both technicians, report controls, print, presentation, delivery in order',()=>{
 const s=createJourney(),stages=[0];assert.equal(reportProgress(s.car).pct,0);
 for(let i=0;i<18;i++){const before=s.stage;tickJourney(s);if(s.stage!==before)stages.push(s.stage);if(s.stage<4)assert.notEqual(s.car.tasks[3].status,'active');if(s.stage>=3)assert.equal(reportProgress(s.car).pct,100);}
 assert.deepEqual(stages,[0,1,2,3,4,5]);assert.equal(s.done,true);assert.equal(s.car.tasks[3].status,'completed');assert.equal(s.history.length,6);
 const final=JSON.stringify(s);tickJourney(s);assert.equal(JSON.stringify(s),final);
});
test('report includes all required checks; new run is clean and independent',()=>{
 const a=createJourney();for(let i=0;i<10;i++)tickJourney(a);
 assert.equal(taskProgress(a.car.tasks[1]).pct,100);assert.equal(taskProgress(a.car.tasks[2]).pct,100);
 assert.equal(reportProgress(a.car).pct,48);assert.equal(createJourney().car.reportItems.filter(i=>i.done).length,0);
});
