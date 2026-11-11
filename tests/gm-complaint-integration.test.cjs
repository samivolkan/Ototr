const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'gm-sikayet','index.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'gm-sikayet','integration.js'),'utf8');
const app=fs.readFileSync(path.join(root,'assets','app-core.js'),'utf8');
const ai=fs.readFileSync(path.join(root,'assets','google-review-ai.js'),'utf8');
const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('uses only the requested three demo branches',()=>{
  assert.match(html,/const BR=\["Kocaeli Gebze","Bursa İnegöl","Bursa Nilüfer"\]/);
  assert.doesNotMatch(html,/const BR=\["İzmir Bornova"/);
});

test('blocks unauthorized role writes in the performance module',()=>{
  assert.match(integration,/canManagePerformance\(ROLE\)/);
  assert.match(integration,/if\(!canEdit\(\)\)return toast\("Bu rol performans hedefi değiştiremez/);
  assert.match(integration,/disabled aria-disabled="true"/);
});

test('main ERP consumes complaint tickets and action bridge',()=>{
  assert.match(app,/complaintDerivedKpis\(\)/);
  assert.match(app,/ototr_action_center_bridge_v1/);
  assert.match(app,/complaintCenter\(\)\.complaintTickets/);
});

test('live Google work items are merged into the complaint center without automatic publication',()=>{
  assert.match(entry,/google-complaint-bridge\.js\?v=/);
  assert.match(app,/googleComplaintWorkflowItems\(\)\.map\(googleComplaintTicket\)/);
  assert.match(app,/data-testid="google-complaint-action"/);
  assert.match(app,/!branch\.demo&&!review\.demo&&\(complaintTicket\|\|risk\.rating<=3\|\|risk\.critical\|\|risk\.legal\|\|risk\.riskLevel==='negative'\)/);
  assert.match(app,/return Boolean\(branch&&!branch\.demo\)/);
  assert.match(app,/data-testid="live-google-complaint-detail"/);
  assert.match(app,/type:x\.isLiveGoogle\?'googleComplaint':'complaint'/);
  assert.match(app,/renderPages\(\);\s*route\('complaints'\)/);
  assert.match(app,/Canlı Google şikâyet kaynağı kullanılamıyor/);
  assert.match(app,/Bu kayıt Google’a yanıt göndermez/);
  assert.match(app,/critical=base\.filter\(googleReviewIsCritical\)/);
  assert.match(app,/review\.riskLevel=risk\.riskLevel/);
  assert.match(app,/forEach\(googleRefreshLiveBranchRiskMetrics\)/);
  assert.match(app,/branch\.criticalCount=riskCount/);
  assert.match(ai,/onComplaintTaskCreated/);
  assert.match(ai,/Demo yorumlardan kalıcı görev veya şikâyet kaydı oluşturulamaz/);
  assert.match(ai,/getWorkflowItems: workflowItems/);
  assert.match(ai,/finally \{ workflow\.loading = false; rerender\(\); notifyWorkflowChanged\(\); \}/);
});
