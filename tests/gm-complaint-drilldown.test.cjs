const test=require("node:test"),assert=require("node:assert/strict"),fs=require("fs"),path=require("path");
const html=fs.readFileSync(path.join(__dirname,"../gm-sikayet/index.html"),"utf8");
test("liste filtresi SLA durumu, hafta ve kök nedeni destekler",()=>{
  assert.match(html,/const flt=\(\)=>DV\(\)\.filter\(/);
  for(const p of [/\(!SF\|\|slaSt\(x\)==SF\)/,/\(WK<0\|\|Math\.min\(7,Math\.floor\(x\.gun\/7\)\)==WK\)/,/\(!KN\|\|x\.kok==KN\)/]) assert.match(html,p);
});
test("grafikler listeye geçiş (drill) ile bağlı",()=>{
  const n=(html.match(/onclick="drill\(/g)||[]).length+(html.match(/onclick="drill\(\{/g)||[]).length;
  assert.ok((html.match(/drill\(\{/g)||[]).length>=14,"en az 14 drill bağlantısı beklenir");
  for(const k of ["sf:","s:","wk:","k:","b:","kn:"]) assert.ok(html.includes("drill({"+k),k);
});
test("grafik öğeleri klavyeyle de kullanılabilir",()=>{
  assert.ok((html.match(/onkeydown="if\(event\.key==/g)||[]).length>=8);
});
test("kanıt matrisi sekmesi ve şube karnesi grafikleri bağlı",()=>{
  assert.match(html,/<script src="evidence-model\.js"><\/script>/);
  assert.match(html,/"Kanıt matrisi"\]/);assert.match(html,/if\(TAB==12\)return evTab\(x\)/);
  assert.match(html,/\$\{karneGraf\(\)\}/);assert.match(html,/\$\{karneTrend\(\)\}/);
});
