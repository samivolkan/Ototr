const assert=require('node:assert/strict');
const test=require('node:test');
const model=require('../gm-sikayet/performance-model.js');

const rows=[
  {region:'Marmara',b:'Kocaeli Gebze',u:'Selin A.',s:3,left:-2,karar:'Haklı',ro:1},
  {region:'Marmara',b:'Kocaeli Gebze',u:'Selin A.',s:7,left:0,karar:'Haksız',ro:0},
  {region:'Marmara',b:'Bursa Nilüfer',u:'Emre K.',s:2,left:10,karar:'',ro:0}
];

test('aggregates complaint performance by branch',()=>{
  const metric=model.aggregate(rows,'Şube','Kocaeli Gebze');
  assert.equal(metric.count,2);
  assert.equal(metric.open,1);
  assert.equal(metric.sla,0);
  assert.equal(metric.recovery,50);
  assert.equal(metric.repeatRate,50);
});

test('normalizes target ranges and produces score/status',()=>{
  const target=model.normalizeTarget('Şube',{sla:150,recovery:0,repeatMax:-3,csat:9});
  assert.deepEqual(target,{sla:100,recovery:75,repeatMax:1,csat:5});
  const value=model.score({sla:90,recovery:80,repeatRate:5,csat:4.5},model.DEFAULT_TARGETS['Şube']);
  assert.ok(value>=80&&value<=100);
  assert.match(model.status(value),/Hedef/);
  const missed=model.score({sla:75,recovery:100,repeatRate:0,csat:5},model.DEFAULT_TARGETS['Şube']);
  assert.ok(missed<80,'SLA hedefini kaçıran kayıt hedefte sayılmamalı');
});

test('routes weak signals to an accountable owner',()=>{
  assert.equal(model.actionFor({sla:70,recovery:90,repeatRate:2}).owner,'Şube Müdürü');
  assert.equal(model.actionFor({sla:90,recovery:90,repeatRate:20}).owner,'Kalite + İK');
  assert.equal(model.actionFor({sla:90,recovery:50,repeatRate:2}).owner,'CRM');
});
