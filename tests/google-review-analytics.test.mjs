import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../assets/google-review-analytics.js',import.meta.url),'utf8');
const context=vm.createContext({window:{},document:{addEventListener(){}},setTimeout(){},clearTimeout(){},Intl,Date,Blob:function(){},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}}});
vm.runInContext(src,context);
const api=context.window.OTOTRGoogleAnalytics;
const branches=[{id:'a',name:'OTOTR Oto Ekspertiz Bursa Nilüfer'},{id:'b',name:'OTOTR Oto Ekspertiz Gebze'}];
const reviews=[
  {id:'1',branchId:'a',reviewDate:'2026-10-10T10:00:00+03:00',rating:5,comment:'Raporu çok iyi anlattılar',reviewerName:'Ayşe Yılmaz',isReplied:true,sentiment:'Olumlu'},
  {id:'2',branchId:'a',reviewDate:'2026-10-11T10:00:00+03:00',rating:2,comment:'Uzun süre bekledik, dönüş olmadı',reviewerName:'Müşteri',isReplied:false,sentiment:'Negatif'},
  {id:'3',branchId:'b',reviewDate:'2026-10-12T10:00:00+03:00',rating:4,comment:'Ekip ilgiliydi',reviewerName:'Mehmet Kaya',isReplied:false,sentiment:'Olumlu'}
];
test('analytics filters scope KPIs and identify review topics',()=>{
  const rows=api.filtered(reviews,'a'); assert.equal(rows.length,2); assert.equal(api.metrics(rows).unanswered,1); assert.equal(api.topicOf(rows[0]),'Rapor açıklaması');
});
test('advanced dashboard renders trend, distribution, branch table and export controls',()=>{
  const html=api.render(branches,reviews,'all',null); assert.match(html,/google-advanced-chart/);assert.match(html,/Yıldız dağılımı/);assert.match(html,/Şube performansı/);assert.match(html,/CSV indir/);assert.match(html,/otomatik sınıflandırmadır/);
});
