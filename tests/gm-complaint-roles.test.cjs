const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const R=require("../gm-sikayet/roles.js");
const html=fs.readFileSync(path.join(__dirname,"../gm-sikayet/index.html"),"utf8");
const integration=fs.readFileSync(path.join(__dirname,"../gm-sikayet/integration.js"),"utf8");
const rows=R.BRANCHES.flatMap(b=>Array.from({length:10},(_,i)=>({id:b+i,b})));
test("handoff'taki sekiz rol tanımlı",()=>{
  assert.deepEqual(R.names(),["Genel Müdür","Bölge Müdürü","Şube Müdürü","Şikâyet Sorumlusu","Hukuk","Kalite","Academy","Gözlemci"]);
});
test("şube müdürü ve şikâyet sorumlusu yalnız kendi şubesini görür",()=>{
  for(const role of ["Şube Müdürü","Şikâyet Sorumlusu"]) for(const b of R.BRANCHES){
    const v=R.filterRows(role,b,rows);
    assert.equal(v.length,10);assert.ok(v.every(x=>x.b===b));
  }
});
test("bölge müdürü Marmara'daki üç şubeyi görür",()=>{
  assert.equal(R.filterRows("Bölge Müdürü","Kocaeli Gebze",rows).length,30);
});
test("genel müdür, hukuk, kalite, academy ve gözlemci tüm şubeleri okur",()=>{
  for(const role of ["Genel Müdür","Hukuk","Kalite","Academy","Gözlemci"]) assert.equal(R.filterRows(role,"Bursa Nilüfer",rows).length,30);
});
test("gözlemci hiçbir kayda yazamaz",()=>{
  assert.ok(rows.every(x=>!R.canWriteCase("Gözlemci",x.b,x)));
});
test("şube müdürü başka şubeye yazamaz, kendi şubesine yazar",()=>{
  assert.equal(R.canWriteCase("Şube Müdürü","Kocaeli Gebze",{b:"Bursa İnegöl"}),false);
  assert.equal(R.canWriteCase("Şube Müdürü","Kocaeli Gebze",{b:"Kocaeli Gebze"}),true);
});
test("bilinmeyen rol hiçbir kaydı göremez ve yazamaz",()=>{
  assert.equal(R.filterRows("Yok","Kocaeli Gebze",rows).length,0);
  assert.equal(R.canWriteCase("Yok","Kocaeli Gebze",rows[0]),false);
});
test("sayfa roles.js'i yükler, eski rol adlarını kullanmaz ve yazma işlemlerini korur",()=>{
  assert.match(html,/<script src="roles\.js"><\/script>/);
  for(const w of ["Franchise Yönetim","İzleyici","Şube müdürü"]) assert.ok(!html.includes(w),w);
  for(const fn of ["addM","appr","hkSevk","hkG","aiA","dofV","dofD"]) assert.match(html,new RegExp("function "+fn+"\\([^)]*\\)\\{if\\(!canW\\(SEL\\)\\)return;"));
  assert.match(integration,/DV\(\)\.map\(/);
});
