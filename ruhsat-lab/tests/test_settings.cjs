const test = require('node:test');
const assert = require('node:assert/strict');
const settings = require('../web/field-settings.js');
const policy = require('../web/data-policy.js');

test('Kokpit preset has 17 vehicle and 3 transient fields; extras remain selectable',()=>{
  assert.equal(settings.catalog.length,24);
  assert.equal(new Set(settings.catalog.map(f=>f.key)).size,24);
  assert.equal(settings.defaults.length,20);
  assert.equal(settings.catalog.filter(f=>settings.defaults.includes(f.key)&&!f.transient).length,17);
  assert.equal(settings.preset('all').length,24);
  assert.deepEqual(settings.preset('minimal'),['plate','vin']);
});

test('normalization keeps required identifiers, discards unknowns and duplicates',()=>{
  assert.deepEqual(settings.normalize(['color','color','address','KURGUSAL-AD',null,{owner_name:'KURGUSAL'}]),['plate','vin','color']);
  assert.deepEqual(settings.normalize({owner_name:'KURGUSAL'}),settings.defaults);
});

test('persistent preference contains only known keys, never OCR values',()=>{
  let written;
  const storage={setItem:(key,value)=>{written={key,value};},getItem:()=>written?.value??null};
  assert.equal(settings.save(storage,['brand','owner_name','KURGUSAL-AD',{value:'PRIVATE'}]),true);
  assert.equal(written.key,settings.storageKey);
  assert.deepEqual(JSON.parse(written.value),{version:1,fields:['plate','vin','brand','owner_name']});
  assert.equal(written.value.includes('PRIVATE'),false);
  assert.equal(written.value.includes('KURGUSAL-AD'),false);
  assert.deepEqual(settings.read(storage),['plate','vin','brand','owner_name']);
});

test('malformed, obsolete and blocked preference storage safely falls back',()=>{
  for (const value of ['{broken',JSON.stringify({version:2,fields:[]}),JSON.stringify({version:1,fields:'private'})]) {
    assert.deepEqual(settings.read({getItem:()=>value}),settings.defaults);
  }
  const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
  assert.deepEqual(settings.read(blocked),settings.defaults);
  assert.equal(settings.save(blocked,['plate','vin']),false);
});

test('export excludes disabled fields and never exports enabled seller suggestions',()=>{
  const result={fields:[{key:'plate',value:'16TST123'},{key:'vin',value:'TEST1234567890123'},
    {key:'brand',value:'RENAULT'},{key:'owner_name',value:'PRIVATE'}],warnings:[]};
  const exported=policy.buildExport(result,{brand:'EDITED',owner_name:'PRIVATE-EDIT'},new Set(['plate','vin']),false,true,['plate','vin','owner_name']);
  assert.deepEqual(Object.keys(exported.analysed.Data),['plate','vin']);
  assert.deepEqual(exported.fields.map(f=>f.key),['plate','vin']);
  assert.equal(JSON.stringify(exported).includes('PRIVATE'),false);
  assert.equal(JSON.stringify(exported).includes('EDITED'),false);
});
