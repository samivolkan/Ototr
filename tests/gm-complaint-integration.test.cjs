const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'gm-sikayet','index.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'gm-sikayet','integration.js'),'utf8');
const app=fs.readFileSync(path.join(root,'assets','app-core.js'),'utf8');

test('uses only the requested three demo branches',()=>{
  assert.match(html,/const BR=\["Kocaeli Gebze","Bursa İnegöl","Bursa Nilüfer"\]/);
  assert.doesNotMatch(html,/const BR=\["İzmir Bornova"/);
});

test('blocks observer writes in the performance module',()=>{
  assert.match(integration,/if\(!canEdit\(\)\)return toast\("İzleyici rolü hedef değiştiremez/);
  assert.match(integration,/disabled aria-disabled="true"/);
});

test('main ERP consumes complaint tickets and action bridge',()=>{
  assert.match(app,/complaintDerivedKpis\(\)/);
  assert.match(app,/ototr_action_center_bridge_v1/);
  assert.match(app,/complaintCenter\(\)\.complaintTickets/);
});
