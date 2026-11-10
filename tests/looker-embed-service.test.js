const test=require('node:test');
const assert=require('node:assert/strict');
const {resolveEmbedContext,createSignedEmbedUrl}=require('../src/services/lookerEmbedService');

test('branch manager is restricted to own branch attribute',()=>{
  process.env.LOOKER_DASHBOARD_BRANCH='branch-42';
  // Module constants are evaluated at require time, so use a configured key from the exported object.
  const service=require('../src/services/lookerEmbedService');
  service.DASHBOARDS.branch='branch-42';
  const context=resolveEmbedContext({id:'u1',role:'BRANCH_MANAGER',branchId:'bursa-nilufer',branchName:'Bursa Nilüfer'},'branch');
  assert.equal(context.userAttributes.ototr_scope,'branch');
  assert.equal(context.userAttributes.ototr_branch_id,'bursa-nilufer');
  assert.equal(context.userAttributes.ototr_region_id,'%');
});

test('branch manager cannot open finance dashboard',()=>{
  assert.throws(()=>resolveEmbedContext({id:'u1',role:'BRANCH_MANAGER',branchId:'b1'},'finance'),error=>error.status===403);
});

test('client cannot provide scope and signed request uses server user',async()=>{
  const service=require('../src/services/lookerEmbedService');
  service.DASHBOARDS.region='region-7';
  let request;
  const lookerApi={create_sso_embed_url:async body=>(request=body,{url:'https://analytics.example.com/login/embed/signed'})};
  const result=await createSignedEmbedUrl({lookerApi,user:{id:'u2',role:'REGION_MANAGER',regionId:'marmara'},dashboardKey:'region',lookerHost:'https://analytics.example.com',embedDomain:'https://oto-tr.com'});
  assert.equal(result.scopeLabel,'Bölge · marmara');
  assert.equal(request.user_attributes.ototr_region_id,'marmara');
  assert.equal(request.session_length,900);
  assert.match(request.target_url,/sdk=2/);
});
