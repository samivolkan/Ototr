import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../assets/branch-health-model.js',import.meta.url),'utf8');
const context=vm.createContext({globalThis:{},Date,Math,Number,String});
vm.runInContext(src,context);
const api=context.globalThis.OTOTRBranchHealth;
const branch={id:'BR-1',name:'Test',status:'Aktif',revenue:1200000,royalty:144000,nps:70,google:4.5,quality:88,growth:4};
const detail={sla:90,capacity:80,wait:'20 dk',complaints:4,avgTicket:1800,training:85};
test('produces eight explainable areas and deterministic preview risk',()=>{
  const a=api.calculate(branch,detail), b=api.calculate(branch,detail);
  assert.equal(Object.keys(a.scores).length,8);
  assert.equal(a.prediction.source,'rules_preview');
  assert.equal(a.prediction.probability,b.prediction.probability);
  assert.equal(a.reasons.length,3);
  assert.ok(a.coverage>=90);
});
test('uses ML only with versioned prediction and preserves explanation inputs',()=>{
  const out=api.calculate(branch,detail,{prediction:{probability:.73,modelVersion:'bq-2026-11',generatedAt:'2026-11-11T00:00:00Z'}});
  assert.equal(out.prediction.source,'bigquery_ml');
  assert.equal(out.prediction.probability,73);
  assert.equal(out.level,'Kritik');
});
test('missing signals lower coverage instead of inventing values',()=>{
  const out=api.calculate({...branch,status:'Kurulum',google:0,quality:0,nps:null},{training:0});
  assert.ok(out.coverage<60);
  assert.ok(out.missing.includes('Operasyon'));
  assert.ok(out.missing.includes('İtibar'));
});
