const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const C=require("../gm-sikayet/chart-model.js");
const SLA={K:4,Y:24,N:48,D:120};
const mk=(o,i)=>({id:"S-"+i,t:"x",o:"N",b:"Kocaeli Gebze",gun:0,s:3,left:10,tut:0,ch:"Web",karar:"",ro:0,...o});
const rows=[mk({gun:0}),mk({gun:3,s:7,karar:"Haklı"}),mk({gun:8,o:"K",left:-2,ch:"Telefon"}),mk({gun:15,tut:5000,karar:"Haksız"}),mk({gun:30,s:7}),mk({gun:50,ro:1,ch:"Google"}),mk({gun:60,left:-5})];
test("haftalık seri: toplam vaka sayısına eşit, son 8 hafta",()=>{
  const w=C.weekly(rows);assert.equal(w.length,8);assert.equal(w.reduce((a,b)=>a+b,0),rows.length);
});
test("delta bu hafta ile geçen haftayı karşılaştırır",()=>{
  assert.deepEqual(C.delta([0,0,0,0,0,0,2,5]),{cur:5,prev:2,d:3});
});
test("trend serisi: birikim son noktada açık vaka sayısına eşit",()=>{
  const t=C.trendSeries(rows);assert.equal(t.stok[7],rows.filter(x=>x.s<7).length);assert.equal(t.kap.reduce((a,b)=>a+b,0),2);
  assert.ok(t.ma.every(v=>v>=0));assert.equal(t.asim.reduce((a,b)=>a+b,0),2);
});
test("SLA doluluğu: aşımda 100 üstü, tazede düşük",()=>{
  assert.ok(C.used(mk({left:-2,o:"K"}),SLA)>100);assert.ok(C.used(mk({left:48,o:"N"}),SLA)<=5);assert.equal(C.used(mk({left:24,o:"N"}),SLA),50);
});
test("balonlar yalnız açık vakaları içerir, boyut telafi tutarıyla artar",()=>{
  const b=C.bubbles(rows,{sla:SLA,risk:()=>7});assert.equal(b.length,rows.filter(x=>x.s<7).length);
  assert.ok(b.find(q=>q.tut===5000).r>b.find(q=>q.tut===0).r);
});
test("takvim 56 gün üretir, günleri doğru sayar ve hafta gün sırası 0-6",()=>{
  const c=C.calendar(rows,new Date(2026,10,12));assert.equal(c.length,56);
  assert.equal(c.reduce((a,x)=>a+x.n,0),rows.filter(x=>x.gun<=55).length);
  assert.ok(c.every(x=>x.dow>=0&&x.dow<=6));assert.equal(c[55].gun,0);assert.equal(c[55].dow,3); // 12.11.2026 Perşembe
});
test("radar: 5 eksen, değerler 0–100",()=>{
  const r=C.radar(rows,["Kocaeli Gebze"],()=>60);assert.equal(r.axes.length,5);assert.ok(r.series[0].v.every(v=>v>=0&&v<=100));assert.equal(r.series[0].v[3],60);
});
test("kanal × karar: toplam vaka sayısına eşit, karar yoksa 'Karar bekliyor'",()=>{
  const c=C.channelDecision(rows);assert.equal(c.rows.reduce((a,r)=>a+r.n,0),rows.length);
  const web=c.rows.find(r=>r.ch==="Web");assert.equal(web.v["Haklı"],1);assert.ok(web.v["Karar bekliyor"]>=1);
});
test("sayfa grafik modülünü yükler ve yeni grafikleri bağlar",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../gm-sikayet/index.html"),"utf8");
  assert.match(html,/<script src="chart-model\.js"><\/script>/);
  for(const f of ["function cc(","function trendV2(","function bubbleChart(","function calChart(","function radarChart(","function chanChart(","function enhanceTips(","function csv("]) assert.ok(html.includes(f),f);
  for(const k of ["ch:","kr:","dy:"]) assert.ok(html.includes("drill({"+k)||html.includes(k),k);
  assert.match(html,/\(DY<0\|\|x\.gun==DY\)/);
});
