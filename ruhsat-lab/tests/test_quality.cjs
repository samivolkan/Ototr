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

test('supported 0.3 patch versions accept anonymous photo-condition feedback',()=>{
  for(const version of ['0.3.1','0.3.2','0.3.3']){
    const p=policy.feedback({request_id:'uuid',engine_version:version,mode:'detailed'},[{key:'plate',value:'PRIVATE',confidence:.9}],{},new Set(['plate']),true,'skew');
    assert.equal(p.engine_version,version);assert.equal(p.condition,'skew');
    assert(!JSON.stringify(p).includes('PRIVATE'));
  }
});

test('category feedback stores a checked code, never free text or conflicting code',()=>{
  const result={request_id:'uuid',engine_version:'0.3.3',mode:'detailed'};
  const fields=[{key:'vehicle_category',value:'OTOMOBİL-AA EDAN',confidence:.7}];
  const p=policy.feedback(result,fields,{vehicle_category:'OTOMOBİL-AA SEDAN'},new Set(['vehicle_category']),false,'clear',2);
  assert.equal(p.fields[0].category_target,'AA');
  assert(!JSON.stringify(p).includes('EDAN'));assert(!JSON.stringify(p).includes('SEDAN'));
  assert.equal(policy.categoryCode('OTOMOBİL-AB SEDAN'),null);
  assert.equal(policy.categoryCode('OTOMOBİL-AA SEDAN PRIVATE'),null);
  assert.equal(policy.categoryCode('OTOMOBİL (AF ÇOK AMAÇLI)'), 'AF');
  assert.deepEqual(policy.feedback(result,fields,{},new Set(),false,'clear',2).fields,[]);
});

test('automatic feedback serializes, coalesces and retracts without duplicate counts',async()=>{
  const sent=[];let release;
  const queue=policy.feedbackQueue(async p=>{sent.push(p);if(sent.length===1)await new Promise(r=>release=r);});
  const first={request_id:'one',fields:[{corrected:true}]};
  queue.submit(first);queue.submit(first);
  queue.submit({request_id:'one',fields:[{corrected:false}]});
  queue.submit({request_id:'one',fields:[]});
  queue.submit({request_id:'two',fields:[{}]});
  assert.equal(sent.length,1);
  release();await new Promise(r=>setImmediate(r));
  assert.equal(sent.length,3);assert.deepEqual(sent[1].fields,[]);assert.equal(sent[2].request_id,'two');
});

test('failed feedback can be resubmitted',async()=>{
  let attempts=0,errors=0;
  const queue=policy.feedbackQueue(async()=>{if(++attempts===1)throw Error('offline');},()=>{},()=>errors++);
  const p={request_id:'one',fields:[]};
  queue.submit(p);await new Promise(r=>setImmediate(r));queue.submit(p);
  await new Promise(r=>setImmediate(r));
  assert.equal(attempts,2);assert.equal(errors,1);
});
