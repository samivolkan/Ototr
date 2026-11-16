const test=require('node:test');
const assert=require('node:assert/strict');
const {loadComplaintVm}=require('./gm-complaint-vm.cjs');

test('Demo laboratuvarı izole fixture ile 30/30 geçer ve kullanıcı durumunu geri yükler',()=>{
  const h=loadComplaintVm();
  h.run('ROLE="Şube Müdürü";UB="Bursa Nilüfer";SF="Aşıldı";WK=3;KN="İletişim";FD=7;SEL=D[2]');
  const before=h.json('({ROLE,UB,SF,WK,KN,FD,sel:SEL.id,count:D.length})');
  const rows=h.json('tests()');
  const after=h.json('({ROLE,UB,SF,WK,KN,FD,sel:SEL.id,count:D.length})');
  assert.equal(rows.length,30);
  assert.equal(rows.filter(x=>x.ok).length,30,JSON.stringify(rows.filter(x=>!x.ok)));
  assert.deepEqual(after,before);
});

test('laboratuvar kullanıcı verisi bozulmuş olsa da taze fixture ile 30/30 geçer',()=>{
  const h=loadComplaintVm();
  h.run('D.forEach(x=>{x.s=7;x.bekle=1;x.esc=1;x.kok=""});S.inb=[]');
  const rows=h.json('tests()');
  assert.equal(rows.length,30);
  assert.ok(rows.every(x=>x.ok),JSON.stringify(rows.filter(x=>!x.ok)));
  assert.equal(h.run('D.every(x=>x.s===7&&x.bekle===1&&x.esc===1&&x.kok==="")'),true);
});

test('geçerli cihaz yanlış alarm üretmez, düşürülen cihaz boya ve ölçüm vakalarını işaretler',()=>{
  const h=loadComplaintVm();
  assert.equal(h.run('S.cihaz="geçerli";evx(D.find(x=>x.k===1)).flags.some(x=>x.includes("kalibrasyonu geçersiz"))'),false);
  h.run('ROLE="Genel Müdür";devDown()');
  assert.equal(h.run('evx(D.find(x=>x.k===0)).flags.some(x=>x.includes("kalibrasyonu geçersiz"))'),true);
  assert.equal(h.run('evx(D.find(x=>x.k===1)).flags.some(x=>x.includes("kalibrasyonu geçersiz"))'),true);
});

test('localStorage engelliyken sayfa ve entegrasyon köprüsü çalışmaya devam eder',()=>{
  const h=loadComplaintVm({storageThrows:true});
  assert.equal(h.run('D.length'),30);
  assert.doesNotThrow(()=>h.run('OTOTRComplaintIntegration.syncBridge()'));
});
