import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {DEALER_GROWTH_PROFILES,GROWTH_DIMENSIONS,evaluateDealerGrowth,recommendationFor} from '../gm-franchise/dealer-growth-engine.mjs';

test('dealer growth engine contains the requested ten weighted dimensions',()=>{
  assert.equal(GROWTH_DIMENSIONS.length,10);
  assert.equal(GROWTH_DIMENSIONS.reduce((sum,item)=>sum+item.weight,0),100);
  assert.deepEqual(GROWTH_DIMENSIONS.map(item=>item.label),['Nüfus ve araç parkı','İkinci el satış yoğunluğu','Rakip ekspertiz merkezleri','Galeri kümeleri','Ulaşım süresi','Kira ve personel maliyetleri','Bölgesel fiyat seviyesi','Mevcut OTOTR şubelerine etkisi','Adayın finansal kapasitesi','Operasyon ve marka uyumu']);
});

test('risk dimensions are inverted before weighting',()=>{
  const profile=structuredClone(DEALER_GROWTH_PROFILES[0]);
  profile.scores.competitor_density=80;
  const result=evaluateDealerGrowth(profile);
  assert.equal(result.metrics.find(item=>item.code==='competitor_density').adjustedScore,20);
});

test('Nilufer demo produces explanatory micro-zone advice instead of a binary answer',()=>{
  const result=evaluateDealerGrowth(DEALER_GROWTH_PROFILES[0]);
  assert.equal(result.finalDecisionRequired,true);
  assert.equal(result.productionDataUsed,false);
  assert.match(result.narrative,/600 metre güney/);
  assert.match(result.narrative,/%18/);
  assert.match(result.narrative,/kira\/ciro oranı/);
  assert.ok(!['uygun','uygun değil'].includes(result.recommendation.label.toLocaleLowerCase('tr')));
});

test('recommendation bands follow the approved 80 65 50 thresholds',()=>{
  assert.equal(recommendationFor(80).code,'strong');
  assert.equal(recommendationFor(65).code,'conditional');
  assert.equal(recommendationFor(50).code,'manager_review');
  assert.equal(recommendationFor(49.9).code,'not_recommended');
});

test('missing and out-of-range evidence fails closed',()=>{
  const missing=structuredClone(DEALER_GROWTH_PROFILES[0]);delete missing.scores.gallery_clusters;
  assert.throws(()=>evaluateDealerGrowth(missing),/Galeri kümeleri skoru eksik/);
  const invalid=structuredClone(DEALER_GROWTH_PROFILES[0]);invalid.scores.operations_brand_fit=101;
  assert.throws(()=>evaluateDealerGrowth(invalid),/0-100/);
});

test('growth workspace is exposed under Franchise with a synthetic-data warning',async()=>{
  const html=await readFile(new URL('../gm-franchise/index.html',import.meta.url),'utf8');
  assert.match(html,/BAYİ BÜYÜME/);
  assert.match(html,/Aday ve lokasyon karar motoru/);
  assert.match(html,/SENTETİK DEMO VERİSİ/);
  assert.match(html,/Otomatik nihai karar verilmez/);
  assert.match(html,/data-growth-profile/);
});
