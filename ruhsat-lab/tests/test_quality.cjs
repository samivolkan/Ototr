const test=require('node:test');
const assert=require('node:assert/strict');
const policy=require('../web/quality-policy.js');
test('feedback contains only anonymous confirmed selected vehicle outcomes',()=>{
  const result={request_id:'uuid',engine_version:'0.2.0',mode:'fast',image:'PRIVATE',lines:['PRIVATE']};
  const fields=[{key:'plate',value:'PRIVATE',confidence:.8},{key:'vin',value:'PRIVATE',confidence:.9},{key:'owner_name',value:'PRIVATE'},{key:'address',value:'PRIVATE'}];
  const value=policy.feedback(result,fields,{plate:'CORRECTED',owner_name:'PRIVATE'},new Set(['plate','owner_name','address']),true);
  assert.deepEqual(value.fields,[{key:'plate',corrected:true,originally_missing:false,confidence:.8}]);
  assert(!JSON.stringify(value).includes('PRIVATE'));assert(!JSON.stringify(value).includes('CORRECTED'));
});
test('preferences reject unexpected data and invalid values',()=>{
  assert.deepEqual(policy.preferences({general:NaN,vin:2,preprocessing:'evil',token:'PRIVATE'}),{general:.9,vin:.95,preprocessing:'standard'});
  assert.deepEqual(policy.preferences(null),{general:.9,vin:.95,preprocessing:'standard'});
});
test('no feedback without reviewed fields or current server result',()=>{
  assert.throws(()=>policy.feedback({},[],{},new Set(),false));
  assert.throws(()=>policy.feedback({request_id:'uuid',engine_version:'0.2.0'},[{key:'plate',value:'A'}],{},new Set(),false));
});

test('new version records controlled photo condition without saving values',()=>{
  const result={request_id:'uuid',engine_version:'0.3.0',mode:'detailed'};
  const payload=policy.feedback(result,[{key:'vin',value:'PRIVATE',confidence:.9}],{vin:'PRIVATE'},new Set(['vin']),false,'glare');
  assert.equal(payload.condition,'glare');assert.equal(payload.engine_version,'0.3.0');assert(!JSON.stringify(payload).includes('PRIVATE'));
  assert.equal(policy.feedback(result,[{key:'vin',value:'PRIVATE',confidence:.9}],{},new Set(['vin']),false,'PRIVATE').condition,'unknown');
});

test('old server keeps its original strict feedback schema',()=>{
  const p=policy.feedback({request_id:'uuid',engine_version:'0.2.0',mode:'fast'},[{key:'plate',value:'TEST',confidence:.9}],{},new Set(['plate']),true,'glare');
  assert.equal('condition' in p,false);
});

test('0.3.1 accepts anonymous photo-condition feedback',()=>{
  const p=policy.feedback({request_id:'uuid',engine_version:'0.3.1',mode:'detailed'},[{key:'plate',value:'PRIVATE',confidence:.9}],{},new Set(['plate']),true,'skew');
  assert.equal(p.engine_version,'0.3.1');assert.equal(p.condition,'skew');
  assert(!JSON.stringify(p).includes('PRIVATE'));
});
