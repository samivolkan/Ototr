const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"../gm-sikayet/index.html"),"utf8");
test("kenar çubuğu gruplu, ikonlu ve rol/şube seçicisini içerir",()=>{
  assert.match(html,/const NG=\[\["Operasyon"/);
  for(const g of ["Kalite ve risk","İnsan ve süreç","Yönetim"]) assert.ok(html.includes('"'+g+'"'),g);
  assert.match(html,/aria-label="Rol"/);assert.match(html,/data-performance-route="1"/);
});
test("komut paleti ve klavye kısayolları tanımlı",()=>{
  assert.match(html,/function pal\(\)/);assert.match(html,/Ctrl K/);assert.match(html,/role="dialog" aria-label="Komut paleti"/);
});
test("tema değiştirme, mobil menü ve azaltılmış hareket desteği var",()=>{
  assert.match(html,/function theme\(\)/);assert.match(html,/body\.nav-open nav/);assert.match(html,/prefers-reduced-motion:reduce/);
});
test("demo rozeti her ekranda görünür başlıkta",()=>{
  assert.match(html,/SANAL DEMO – GERÇEK VERİ YOKTUR/);
});
