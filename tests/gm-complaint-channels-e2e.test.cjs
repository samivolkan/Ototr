const test=require('node:test');
const assert=require('node:assert/strict');
const {loadComplaintVm}=require('./gm-complaint-vm.cjs');

const scenarios=[
  ['Telefon','Randevuya çok geç geldiler','Kocaeli Gebze',3,'N',48],
  ['WhatsApp','Ölçüm cihazı değerleri tutarsız çıktı','Bursa İnegöl',1,'N',48],
  ['Web','Raporda boya hatası var','Bursa Nilüfer',0,'N',48],
  ['E-posta','Rapor teslimi geç geldi','Kocaeli Gebze',3,'N',48],
  ['Google','Satıcıyla usta tarafsız değildi','Kocaeli Gebze',2,'K',4],
  ['Sosyal medya','Hizmet çok geç tamamlandı','Bursa Nilüfer',3,'N',48],
  ['QR anket','Ücret iadesi istiyorum','Bursa İnegöl',4,'N',48],
  ['Şube','Raporda kilometre yanlış','Bursa Nilüfer',0,'N',48]
];

function message(ch,text,branch,index){return{ch,m:text,pl:`41 QA ${100+index}`,mus:`Müşteri QA-${index}`,tel:'05•• ••• 00 00',b:branch,id:9000+index}}

test('sekiz şikâyet kanalı gelen kutusundan vaka, SLA, audit ve ERP köprüsüne ulaşır',()=>{
  const h=loadComplaintVm();
  h.run('ROLE="Genel Müdür";D=mk();S={cihaz:"geçerli",cari:{},inb:[]};fixS();AUD=[];TS=0');
  const initial=h.run('D.length');
  scenarios.forEach(([ch,text,branch,category,priority,sla],index)=>{
    h.context.fixture=message(ch,text,branch,index);
    h.run('S.inb=[fixture];mkCase(0)');
    const row=h.json('D[0]');
    assert.equal(row.ch,ch);
    assert.deepEqual(row.channels,[ch]);
    assert.equal(row.b,branch);
    assert.equal(row.k,category);
    assert.equal(row.o,priority);
    assert.equal(row.left,sla);
    assert.equal(row.s,1);
    assert.ok(row.u);
    assert.match(row.tl.at(-1).t,/Vaka açıldı, otomatik atama/);
    assert.equal(h.run(`AUD.some(x=>x.id==="${row.id}"&&x.t.includes("Vaka açıldı"))`),true);
    const bridge=JSON.parse(h.store.get('ototr_complaint_bridge_v1'));
    const bridged=bridge.complaintTickets.find(x=>x.id===row.id);
    assert.equal(bridged.source,ch);
    assert.deepEqual(bridged.sources,[ch]);
    assert.equal(bridged.branch,branch);
    assert.equal(bridged.sla,'İçinde');
    if(ch==='Google')assert.equal(bridged.legalRisk,'Yüksek');
  });
  assert.equal(h.run('D.length'),initial+scenarios.length);
});

test('mükerrer mesaj vaka sayısını artırmaz ve iki kanalın kaynağını korur',()=>{
  const h=loadComplaintVm();
  h.run('ROLE="Genel Müdür"');
  const target=h.json('D.find(x=>x.b==="Kocaeli Gebze"&&x.s<7)');
  const before=h.run('D.length');
  h.context.fixture=message('WhatsApp',target.t,target.b,77);
  h.context.fixture.pl=target.pl;h.context.fixture.mus=target.mus;
  h.run(`S.inb=[fixture];mkCase(0,"${target.id}")`);
  assert.equal(h.run('D.length'),before);
  const channels=h.json(`caseChannels(D.find(x=>x.id==="${target.id}"))`);
  assert.ok(channels.includes('WhatsApp'));
  assert.ok(channels.length>=2);
  const bridge=JSON.parse(h.store.get('ototr_complaint_bridge_v1'));
  assert.deepEqual(bridge.complaintTickets.find(x=>x.id===target.id).sources,channels);
});

test('geçersiz veya çapraz şube birleştirme mesajı silmez',()=>{
  const h=loadComplaintVm();
  h.run('ROLE="Genel Müdür"');
  const target=h.json('D.find(x=>x.b==="Bursa İnegöl"&&x.s<7)');
  h.context.fixture=message('Telefon','Yeni şikâyet','Kocaeli Gebze',81);
  h.run(`S.inb=[fixture];mkCase(0,"${target.id}")`);
  assert.equal(h.run('S.inb.length'),1);
  h.run('mkCase(0,"YOK-404")');
  assert.equal(h.run('S.inb.length'),1);
});

test('Gözlemci kuyruğu değiştiremez, Şube Müdürü yalnız kendi şubesine mesaj üretir',()=>{
  const h=loadComplaintVm();
  h.run('S.inb=[];ROLE="Gözlemci";genMsg("Telefon",0)');
  assert.equal(h.run('S.inb.length'),0);
  h.run('ROLE="Şube Müdürü";UB="Bursa Nilüfer";genMsg("Web",0)');
  assert.equal(h.run('S.inb.length'),1);
  assert.equal(h.run('S.inb[0].b'),'Bursa Nilüfer');
});

test('şube rolü köprüyü 10 kayda düşürmez ve legacy kanal adları kalmaz',()=>{
  const h=loadComplaintVm();
  h.run('ROLE="Şube Müdürü";UB="Kocaeli Gebze";OTOTRComplaintIntegration.syncBridge()');
  const bridge=JSON.parse(h.store.get('ototr_complaint_bridge_v1'));
  assert.equal(bridge.complaintTickets.length,30);
  assert.equal(h.run('DV().length'),10);
  assert.equal(h.run('D.every(x=>caseChannels(x).every(ch=>CHANNELS.includes(ch)))'),true);
  assert.equal(h.run('normChannel("Bilinmeyen kanal")'),'Diğer');
});

test('işlem bazlı rol matrisi inline vaka ve performans yazmalarını engeller',()=>{
  const h=loadComplaintVm();
  h.run('ROLE="Gözlemci";SEL=D[0]');
  const before=h.json('({karar:SEL.karar,tut:SEL.tut,dof:SEL.dof,cihaz:S.cihaz})');
  h.run('caseSet("karar","Haklı");compensationOpen();dofOpen();devDown()');
  const after=h.json('({karar:SEL.karar,tut:SEL.tut,dof:SEL.dof,cihaz:S.cihaz})');
  assert.deepEqual(after,before);
  assert.equal(h.run('OTOTRRoles.canManagePerformance("Şube Müdürü")'),false);
  assert.equal(h.run('OTOTRRoles.canManagePerformance("Bölge Müdürü")'),true);
});

test('Telefon şikâyeti alımdan inceleme, karar ve kapanışa kadar ilerler',()=>{
  const h=loadComplaintVm();
  h.context.fixture=message('Telefon','Randevuya çok geç geldiler','Kocaeli Gebze',120);
  h.run('ROLE="Genel Müdür";S.inb=[fixture];mkCase(0);SEL=D[0];$("#mr").value="Aşama kontrolü tamamlandı";$("#ms").value=SEL.u');
  assert.equal(h.run('SEL.s'),1);
  h.run('ok("adv")');
  assert.equal(h.run('SEL.s'),2);
  h.run('$("#mr").value="İnceleme başlatıldı";ok("adv")');
  assert.equal(h.run('SEL.s'),2,'inceleyen atanmadan ilerlememeli');
  h.run('caseSet("rv",US.find(x=>x!==SEL.u),"İnceleyen atandı");$("#mr").value="İnceleme başlatıldı";$("#ms").value=SEL.u;ok("adv")');
  assert.equal(h.run('SEL.s'),3);
  h.run('$("#mr").value="Kanıtlar incelendi";ok("adv")');
  assert.equal(h.run('SEL.s'),4);
  h.run('caseSet("karar","Haklı");caseSet("kok","Süreç boşluğu");caseSet("gerek","Randevu kayıtları ve müşteri mesajları birlikte incelendi.");caseEvidence(0,true);caseEvidence(1,true);caseEvidence(2,true);$("#mr").value="Karar tamamlandı";ok("adv")');
  assert.equal(h.run('SEL.s'),5);
  h.run('$("#mr").value="Telafi gerekmiyor";ok("adv");$("#mr").value="Müşteri bilgilendirildi";ok("adv")');
  assert.equal(h.run('SEL.s'),7);
  const bridge=JSON.parse(h.store.get('ototr_complaint_bridge_v1'));
  assert.equal(bridge.complaintTickets.find(x=>x.id===h.run('SEL.id')).status,'Kapandı');
  assert.equal(h.run('AUD.some(x=>x.id===SEL.id&&x.t.includes("Kapandı aşamasına geçti"))'),true);
});

test('işlem durum matrisi erken telafi ve açık vakayı yeniden açmayı engeller',()=>{
  const h=loadComplaintVm();
  h.run('ROLE="Genel Müdür";SEL=D.find(x=>x.s===1);const before=SEL.tut;compensationOpen();window.early={s:SEL.s,tut:SEL.tut,ro:SEL.ro};$("#mr").value="Yeniden açma testi";$("#ms").value=SEL.u;ok("reopen")');
  const result=h.json('({s:SEL.s,tut:SEL.tut,ro:SEL.ro,early})');
  assert.equal(result.early.tut,0);
  assert.equal(result.s,result.early.s);
  assert.equal(result.ro,result.early.ro);
});

test('Kalite onay, Hukuk hukuki onay verebilir; Gözlemci taslağı değiştiremez',()=>{
  const h=loadComplaintVm();
  h.run('const ri=S.rev.findIndex(r=>/tarafsız/i.test(r.t));S.rev[ri].taslak="İncelenen uygun yanıt taslağı özel iletişim kanalıyla çözülecektir.";ROLE="Kalite";rvAppr(ri);window.reviewIndex=ri');
  assert.equal(h.run('S.rev[reviewIndex].onay'),1);
  h.run('ROLE="Hukuk";rvHk(reviewIndex)');
  assert.equal(h.run('S.rev[reviewIndex].hk'),1);
  const before=h.run('S.rev[reviewIndex].taslak');
  h.run('ROLE="Gözlemci";rvEdit(reviewIndex,"Yetkisiz değişiklik")');
  assert.equal(h.run('S.rev[reviewIndex].taslak'),before);
});

test('müşteri portalı işlemleri oturum ister ve aktörü Müşteri Portalı olarak kaydeder',()=>{
  const h=loadComplaintVm();
  h.run('const px=D.find(x=>x.s>=5&&x.s<7);window.portalId=px.id;PC=px.id;PA=0;pRej(px)');
  const before=h.json('D.find(x=>x.id===portalId)');
  h.run('PA=1;pRej(D.find(x=>x.id===portalId))');
  const after=h.json('D.find(x=>x.id===portalId)');
  assert.equal(after.ro,before.ro+1);
  assert.equal(after.s,3);
  assert.equal(h.run('AUD.some(x=>x.id===portalId&&x.r==="Müşteri Portalı")'),true);
});

test('performans hedef ve aksiyon listeleri şube okuma kapsamını aşmaz',()=>{
  const h=loadComplaintVm();
  h.run(`localStorage.setItem("ototr_complaint_performance_v1",JSON.stringify({goals:[
    {id:"g1",level:"Şube",key:"Kocaeli Gebze",sla:90,recovery:80,repeatMax:8,csat:4.4,owner:"Gebze sahibi"},
    {id:"g2",level:"Şube",key:"Bursa Nilüfer",sla:90,recovery:80,repeatMax:8,csat:4.4,owner:"Nilüfer sahibi"}
  ],actions:[
    {id:"a1",scope:"Şube",scopeName:"Kocaeli Gebze",branch:"Kocaeli Gebze",region:"Marmara",owner:"Gebze aksiyon",title:"Gebze planı",status:"Açık"},
    {id:"a2",scope:"Şube",scopeName:"Bursa Nilüfer",branch:"Bursa Nilüfer",region:"Marmara",owner:"Nilüfer aksiyon",title:"Nilüfer planı",status:"Açık"}
  ]}));ROLE="Şube Müdürü";UB="Kocaeli Gebze";document.getElementById("pfLevel").value="Şube";document.getElementById("pfKey").value="Kocaeli Gebze";OTOTRComplaintIntegration.performancePage()`);
  const view=h.elements.get('m').innerHTML;
  assert.match(view,/Gebze sahibi/);
  assert.match(view,/Gebze aksiyon/);
  assert.doesNotMatch(view,/Nilüfer sahibi/);
  assert.doesNotMatch(view,/Nilüfer aksiyon/);
});
