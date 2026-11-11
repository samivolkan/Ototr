const test=require("node:test"),assert=require("node:assert/strict");
const E=require("../gm-sikayet/evidence-model.js");
const full={k:0,kn:[1,1,1],msgs:[{m:"Müşteri belgesi eklendi"}],gerek:"Yeterince uzun gerekçe metni",karar:"Haklı",gun:3,paket:"Premium"};
const empty={k:0,kn:[0,0,0],msgs:[],gerek:"",karar:"",gun:3,paket:"Standart"};
test("tam dosyada kanıt yeterliliği %100, eksik yok",()=>{
  const s=E.sufficiency(full);assert.equal(s.pc,100);assert.deepEqual(s.missing,[]);
});
test("boş dosyada yeterlilik düşük ve eksikler listelenir",()=>{
  const s=E.sufficiency(empty);assert.ok(s.pc<40);assert.ok(s.missing.includes("Rapor fotoğrafları incelendi"));
});
test("cihaz kalibrasyonu yalnız boya/ölçüm kategorilerinde kanıt gerektirir",()=>{
  assert.ok(E.sufficiency({...full,k:1}).items.some(i=>i[0].includes("kalibrasyon")));
  assert.ok(!E.sufficiency({...full,k:3}).items.some(i=>i[0].includes("kalibrasyon")));
});
test("karara göre iddia durumu değişir",()=>{
  const st=k=>E.analyze({...full,karar:k},{}).rows[0].st;
  assert.equal(st("Haklı"),"İddia doğrulandı");assert.equal(st("Kısmen haklı"),"Kısmen doğrulandı");assert.equal(st("Haksız"),"İddia doğrulanmadı");
  assert.equal(E.analyze(empty,{}).rows[0].st,"Kanıt eksik");
});
test("tutarsızlık işaretleri: boya çelişkisi, geçersiz cihaz, kanıtsız karar",()=>{
  const f=E.analyze({...empty,karar:"Haklı"},{deviceBad:true}).flags.join(" ");
  assert.match(f,/çelişiyor/);assert.match(f,/kalibrasyon/);assert.match(f,/kanıt eksikken/);
});
test("her kategori için iddia satırı tanımlı",()=>{
  for(let k=0;k<6;k++) assert.ok(E.analyze({...full,k},{}).rows.length>0);
});
