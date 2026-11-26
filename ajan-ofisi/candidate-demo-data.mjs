// Scripted fiction. No live data, approvals, messages or model execution.
export const questions=[
  [
    "Hangi il / ilçede yatırım düşünüyorsunuz?",
    "Bursa / Osmangazi; iki yer alternatifi var.",
    "FRA-01 · bölge ve lokasyon kaydı"
  ],
  [
    "OTOTR ve ekspertiz sektörünü neden seçtiniz?",
    "Standart süreçlerle yönetilen bir işletme kurmak istiyorum.",
    "FRA-01 · motivasyon ve marka uyumu"
  ],
  [
    "İşletmede aktif rolünüz ne olacak?",
    "İlk dönemde kendim yöneteceğim.",
    "HR-01 · yönetim rolü ve kadro ihtiyacı"
  ],
  [
    "Yönetim veya otomotiv tecrübeniz var mı?",
    "Kurgusal adayın perakende işletme deneyimi var; teknik ekip gerekiyor.",
    "HR-02 · eğitim ihtiyaç analizi"
  ],
  [
    "Yatırım ve işletme sermayesi için hazırlığınız nedir?",
    "Öz kaynak ve finansman planı var; belge incelemesi henüz yapılmadı.",
    "FIN-02 · beyan, doğrulanmış kanıt değildir"
  ],
  [
    "Yer hazır mı; kullanım ve ruhsat durumu araştırıldı mı?",
    "İki seçenek var, uygunluk değerlendirmesi bekleniyor.",
    "FRA-03 · saha ve hukuk incelemesi"
  ],
  [
    "Ne zaman açılmayı hedefliyorsunuz?",
    "Yaklaşık altı hafta; bu süre bir açılış taahhüdü değil.",
    "FRA-03 · bağımlılıklarla takvim"
  ],
  [
    "Tarafsız rapor ve kalite kurallarına yaklaşımınız nedir?",
    "Ticari baskı nedeniyle rapor değiştirilmemesini kabul ediyorum.",
    "FRA-04 · etik uyum ve insan değerlendirmesi"
  ]
];
export const scenes=[
  {
    "id": "S01",
    "title": "Başvuru",
    "day": "Gün 1 · 09:00",
    "team": "FRA",
    "agents": [
      "FRA-01",
      "SEO-01",
      "SEO-02",
      "SALE-02"
    ],
    "headline": "Webden yeni bir aday geldi.",
    "story": "Tamamen kurgusal Deniz Kaya, Bursa / Osmangazi için franchise formunu doldurdu. Bu ekranda form gönderimi canlandırılır; sisteme gerçek kayıt açılmaz.",
    "actions": [
      "Kaynak: örnek şube / franchise sayfası",
      "Aydınlatma, veri işleme ve pazarlama tercihleri ayrı; pazarlama tercihi hayır",
      "Tek demo dosyası oluşturuldu: DEMO-FRA-001"
    ],
    "output": "Web kaynağı ve izin tercihleriyle tekil aday dosyası hazır.",
    "advice": "Şimdilik sana iş düşmüyor. Uzman başvuruyu kontrol edip ilk görüşme hazırlığını yapıyor.",
    "route": [
      "SEO",
      "FRA"
    ],
    "decision": null
  },
  {
    "id": "S02",
    "title": "İlk temas",
    "day": "Gün 1 · 11:00",
    "team": "FRA",
    "agents": [
      "FRA-01",
      "SALE-01"
    ],
    "headline": "İlk görüşme bir soru listesiyle başlıyor.",
    "story": "Uzman adayı aramaz; görüşmeyi yapacak sorumluya konuşma taslağı ve kayıt alanlarını hazırlar. Ekrandaki cevaplar senaryo için önceden yazılmıştır.",
    "actions": [
      "Neden OTOTR? → Standart süreçlerle işletme kurmak istiyorum.",
      "Hangi bölgede, yer hazır mı? → Osmangazi; iki alternatif yerim var.",
      "İşi kim yönetecek? → İlk dönemde kendim, sonra şube müdürü."
    ],
    "output": "Görüşme özeti hazır; lokasyon ve finans kanıtları henüz eksik.",
    "advice": "Adayla aynı soruları tekrar konuşmana gerek kalmasın diye cevaplar tek dosyada toplanır.",
    "route": [
      "SALE",
      "FRA"
    ],
    "decision": null
  },
  {
    "id": "S03",
    "title": "Ön değerlendirme",
    "day": "Gün 2",
    "team": "FRA",
    "agents": [
      "FRA-01",
      "SALE-02"
    ],
    "headline": "Eksikler görünür; erken onay yok.",
    "story": "Uzman deneyim, yönetim rolü, etik uyum, lokasyon ve yatırım hazırlığı için inceleme başlıklarını ayırıyor. Aday beyanı doğrulanmış belge sayılmıyor.",
    "actions": [
      "İki lokasyon için ölçüm ve fotoğraf istenir",
      "Finansal hazırlık için güvenli kanıta ihtiyaç kaydedilir",
      "Aynı aday için ikinci dosya açılmaması kontrol edilir"
    ],
    "output": "Aday ön incelemeye alındı; uygunluk kararı henüz verilmedi.",
    "advice": "Yalnız engel veya istisna varsa konu sana yükselir. Eksik belge takibi uzman ve yöneticidedir.",
    "route": [
      "FRA",
      "COO"
    ],
    "decision": null
  },
  {
    "id": "S04",
    "title": "Yatırımcı sunumu",
    "day": "Gün 3",
    "team": "FRA",
    "agents": [
      "FRA-01",
      "FIN-04"
    ],
    "headline": "Beklentiler karşılıklı netleşiyor.",
    "story": "Franchise sorumlusu hizmet standardını, yatırımın kapsamını ve açılış aşamalarını anlatır. Finans uzmanı kullanılacak sözleşme sürümünü kontrol eder.",
    "actions": [
      "Tarafsız ekspertiz ilkesi açıklanır",
      "Gelir garantisi veya onaysız fiyat sözü verilmez",
      "Yatırım, işletme sermayesi ve royalty kalemleri ayrı anlatılır"
    ],
    "output": "Adayın soruları ve sunum sonrası ilgi durumu kaydedildi.",
    "advice": "Ticari şart üretmiyoruz. Özel teklif talebi gelirse etki analiziyle sana gelir.",
    "route": [
      "FRA",
      "FIN"
    ],
    "decision": null
  },
  {
    "id": "S05",
    "title": "Finansal yeterlilik",
    "day": "Gün 5",
    "team": "FIN",
    "agents": [
      "FIN-01",
      "FIN-02",
      "FIN-03",
      "FIN-04"
    ],
    "headline": "Finans dosyayı teslim aldı; henüz kabul etmedi.",
    "story": "İlk gönderimde işletme sermayesi kanıtı eksik. Finans dosyayı gerekçesiyle geri ister; ikinci demo paketi tamamlanınca inceleme kabulü oluşur. Gerçek belge veya tutar yoktur.",
    "actions": [
      "FIN-04: uygulanacak sözleşme ve bedel sürümü",
      "FIN-02: doğrulanabilir kaynak ve ödeme kanıtı alanları",
      "FIN-01 / FIN-03: royalty matrahı ve kontrol senaryosu"
    ],
    "output": "Demo eksik paket → iade → tamamlanan paket → inceleme kabulü. Tahsilat yapılmadı.",
    "advice": "Sana evrak takibi değil, gerekirse ticari seçenek ve etkisi sunulur.",
    "route": [
      "FRA",
      "FIN",
      "BEK"
    ],
    "decision": null
  },
  {
    "id": "S06",
    "title": "Lokasyon",
    "day": "Gün 7",
    "team": "FRA",
    "agents": [
      "FRA-03",
      "SALE-01"
    ],
    "headline": "Lokasyon A elendi, B incelemeyi geçti.",
    "story": "Kurgusal A lokasyonunda araç akışı uygun bulunmadı. Operasyon sorumlusu B alternatifini saha ölçümleri ve erişim kanıtıyla değerlendirir. Bu bir gerçek yer uygunluğu kararı değildir.",
    "actions": [
      "Araç giriş/çıkış ve test akışı",
      "Yerleşim, altyapı ve saha ziyareti",
      "Ruhsat ve kullanım uygunluğu için uzman incelemesi"
    ],
    "output": "Demo B lokasyonu değerlendirme paketine eklendi.",
    "advice": "Koordinatör sana iki seçeneği ve neden B önerildiğini tek özette gösterir.",
    "route": [
      "SALE",
      "FRA",
      "COO"
    ],
    "decision": null
  },
  {
    "id": "S07",
    "title": "Due diligence",
    "day": "Gün 9",
    "team": "FRA",
    "agents": [
      "FRA-02",
      "FRA-04"
    ],
    "headline": "Beyan, referans ve yetki kanıtları ayrılıyor.",
    "story": "Hukuk ve operasyon insan sorumluları inceleme yapar. Ajan evrakın varlığını ve sürümünü takip eder; hukuki uygunluk kararı vermez.",
    "actions": [
      "Kimlik ve yetki için yalnız sentetik kanıt referansı",
      "Referans ve sözleşme tarafı kontrolü",
      "Ruhsat konusu ertelenemez açılış şartı olarak işaretli"
    ],
    "output": "Kanıt referansları ve açık konular yöneticide birleştirildi.",
    "advice": "Eksikler kapanmadan uygunluk varsayılmıyor; hassas belgeler ofise taşınmıyor.",
    "route": [
      "FRA",
      "BEK"
    ],
    "decision": null
  },
  {
    "id": "S08",
    "title": "Ön onay",
    "day": "Gün 10",
    "team": "FRA",
    "agents": [
      "FRA-04",
      "FIN-03"
    ],
    "headline": "Sami, şimdi senden bir karar gerekiyor.",
    "story": "Yönetici dosyayı hazırladı, bağımsız bekçi yüksek riskli kalemleri kontrol etti. Koordinatör görüşme, finans ve lokasyon değerlendirmesini tek karar kartına dönüştürdü.",
    "actions": [
      "Öneri: sözleşme hazırlığına geç",
      "Şart: açılış öncesi tüm zorunlu kanıtlar kapanacak",
      "Karar hazırlayan ve onaylayan farklı kişiler"
    ],
    "output": "Ön onay için tek paket; henüz karar verilmedi.",
    "advice": "Dosyayı onayla veya revizyon iste. Bu butonlar yalnız simülasyonu etkiler.",
    "route": [
      "FRA",
      "BEK",
      "COO",
      "SAMI"
    ],
    "decision": {
      "title": "Sözleşme hazırlığına geçilsin mi?",
      "approve": "Demo ön onayı ver",
      "reason": "Görüşme, finans ve lokasyon incelemeleri senaryoda tamamlandı. Açılış izni verilmiyor."
    }
  },
  {
    "id": "S09",
    "title": "Sözleşme",
    "day": "Gün 14",
    "team": "FIN",
    "agents": [
      "FRA-02",
      "FIN-04",
      "FIN-02"
    ],
    "headline": "Ticari şartlar sana ait; ajan yalnız hazırlar.",
    "story": "Hukuk sorumlusu sözleşme taslağını, Finans sözleşme sürümü ile bedel ve tahsilat eşleşmesini hazırlar. Bu sahnede gerçek sözleşme imzalanmaz ve ödeme alınmaz.",
    "actions": [
      "Onaysız royalty, iskonto veya prim değişikliği yok",
      "Demo imza ve ödeme kanıtı referansları ayrı",
      "Teknik teslim ile Finans iş kabulü ayrı durumlar"
    ],
    "output": "Ticari şart ve sözleşme paketi insan kararına hazır.",
    "advice": "Kararın ardından imza ve tahsilatın insan kontrolüyle tamamlandığı demo olaylarını göstereceğiz.",
    "route": [
      "FIN",
      "BEK",
      "COO",
      "SAMI"
    ],
    "decision": {
      "title": "Demo sözleşme paketiyle devam edilsin mi?",
      "approve": "Demo paketi onayla",
      "reason": "Tutar veya oran belirlenmiyor. Gerçek şartlar ve imza yalnız yetkili insan sürecinde."
    }
  },
  {
    "id": "S10",
    "title": "Kurulum",
    "day": "Gün 21",
    "team": "FRA",
    "agents": [
      "FRA-03",
      "HR-01",
      "PLAN-DEV-01",
      "PLAN-DEV-02"
    ],
    "headline": "Bir açılış, birden fazla ekip.",
    "story": "Franchise yöneticisi mimari, tedarik, operasyon, BT ve İK teslimlerini toplar. Yazılım rolleri bu senaryoda önerilen ekip olarak canlandırılır; kod veya hesap oluşturmaz.",
    "actions": [
      "Mimari / tedarik: yerleşim ve cihaz kontrol listesi",
      "İK: şube rol ihtiyacı ve sorumlular",
      "BT / Yazılım: erişim ve entegrasyon test planı"
    ],
    "output": "Kurulum bağımlılıkları tek listede; eksikler ilgili sorumluda.",
    "advice": "Her departmanı sen aramazsın. Koordinatör yalnız açılışı engelleyen konuyu önüne getirir.",
    "route": [
      "FRA",
      "HR",
      "DEV"
    ],
    "decision": null
  },
  {
    "id": "S11",
    "title": "Eğitim",
    "day": "Gün 28",
    "team": "HR",
    "agents": [
      "HR-01",
      "HR-02",
      "FRA-03"
    ],
    "headline": "İsim listesi değil, yeterlilik kontrolü.",
    "story": "İK ve Academy insan sorumluları rol, eğitim ve yeterlilik kanıtlarını kontrol eder. Şube personeli merkez organizasyonuna eklenmez.",
    "actions": [
      "Kurgusal teknik sorumlunun eğitimi eksik bulundu",
      "Academy tekrar eğitim kaydını tamamladı",
      "Yetki açma kararı insan sorumlusunda kaldı"
    ],
    "output": "Demo eğitim eksiği giderildi; görev ve yeterlilik matrisi hazır.",
    "advice": "Sana eğitim takvimi değil, çözülemeyen kapasite veya yetki istisnası gelir.",
    "route": [
      "HR",
      "FRA",
      "BEK"
    ],
    "decision": null
  },
  {
    "id": "S12",
    "title": "Deneme operasyonu",
    "day": "Gün 32",
    "team": "COM",
    "agents": [
      "COM-01",
      "COM-02",
      "REV-01",
      "PLAN-DEV-02"
    ],
    "headline": "Müşteri gelmeden hata senaryosunu deniyoruz.",
    "story": "Tamamen sentetik araç ve müşteriyle kayıt, rapor, şikayet ve yorum akışı canlandırılır. Rapor bulgusu, puanı ve hasar kaydı değiştirilemez.",
    "actions": [
      "COM-01: gecikme şikayetini tek sorumluya atar",
      "COM-02: çözüm kanıtını insan kapanışına hazırlar",
      "REV-01: örnek yorum taslağı ve iki saatlik süre; gerçek gönderim yok"
    ],
    "output": "Deneme şikayeti kapatıldı; yanıt ve hata akışı senaryoda doğrulandı.",
    "advice": "Sorunları açılıştan önce görürsün; uzmanlar müşteri adına otomatik ticari taahhüt vermez.",
    "route": [
      "COM",
      "REV",
      "BEK"
    ],
    "decision": null
  },
  {
    "id": "S13",
    "title": "Açılış kurulu",
    "day": "Gün 35",
    "team": "FRA",
    "agents": [
      "FRA-04",
      "FIN-02",
      "FIN-03",
      "HR-02"
    ],
    "headline": "Dört zorunlu kapı kapanmadan açılış yok.",
    "story": "Kanıtları hazırlayanlar ve kontrol edenler farklı. Koordinatör yalnız son açılış kararını sana getirir. Kanıtların tamamı bu senaryoya ait sentetik kayıtlardır.",
    "actions": [
      "%100 giriş bedeli tahsilatı + imzalı sözleşme: demo kanıtları",
      "Saha ziyareti + geçerli faaliyet / ruhsat kaydı: demo kanıtları",
      "Eğitim, kalite ve kurulum teslimleri: senaryoda tamamlandı"
    ],
    "output": "Kurul paketi hazır; gerçek şube aktivasyonu yapılmadı.",
    "advice": "Bu noktada kararını verirsin. Eksik kanıt varsa geri dönülür; otomatik açılış yapılmaz.",
    "route": [
      "FRA",
      "BEK",
      "COO",
      "SAMI"
    ],
    "decision": {
      "title": "Demo şube açılışı gösterilsin mi?",
      "approve": "Demo açılışını onayla",
      "reason": "Dört zorunlu kanıtın ve departman teslimlerinin senaryoda tamamlandığı gösteriliyor."
    }
  },
  {
    "id": "S14",
    "title": "Aktif şube",
    "day": "Açılış günü",
    "team": "SEO",
    "agents": [
      "FRA-03",
      "SEO-01",
      "SEO-02",
      "SEO-03",
      "PLAN-SOC-01",
      "SALE-02"
    ],
    "headline": "Demo şube açıldı; takip yeni başlıyor.",
    "story": "SEO-03 içerik taslağını, SEO ekibi şube sayfası kontrolünü, Sosyal Medya önerilen rolü açılış taslağını hazırlar. İnsan yayın onayı alınmış bir olay senaryoda gösterilir; içerik yayınlanmaz.",
    "actions": [
      "Şube sayfası ve konum bilgisi kontrol listesi",
      "Sosyal içerik: taslak → insan onayı → demo yayın olayı",
      "Saha Satış: bölgedeki ziyaret ve fırsat planı"
    ],
    "output": "Açılış teslimi tamamlandı; 30/60/90 kontrol görevleri senaryoda oluşturuldu.",
    "advice": "Her açılıştan sonra “şimdi kim takip edecek?” sorusu açıkta kalmaz.",
    "route": [
      "FRA",
      "SEO",
      "SOC",
      "SALE"
    ],
    "decision": null
  },
  {
    "id": "FU30",
    "title": "30. gün kontrolü",
    "day": "Açılış +30 gün",
    "team": "COM",
    "agents": [
      "OPS-01",
      "COM-01",
      "COM-02",
      "REV-01",
      "FRA-03"
    ],
    "headline": "Şikayet ve yorumlar tek kalite özetinde.",
    "story": "Örnek müşteri bekleme şikayeti insan çözüm onayıyla kapanır. Yorum uzmanı şube hedefi durumunu ve yanıt kuyruğunu izler; kişi bazlı hedef kullanılmaz.",
    "actions": [
      "OPS-01: aşama ve bekleme kanıtlarını MGR-OPS üzerinden koordinatöre hazırlar",
      "Tekrarlayan bekleme nedeni yöneticide toplanır",
      "İnsan onaylı çözüm kaydı kontrol edilir",
      "Şube yorum hedefi ve yanıt takibi birlikte görünür"
    ],
    "output": "Operasyon ve kalite kontrolünün demo özeti hazır.",
    "advice": "Her yorumu tek tek değil, tekrar eden sorun ve gerekli aksiyonu görürsün.",
    "route": [
      "OPS",
      "COM",
      "REV",
      "COO"
    ],
    "decision": null
  },
  {
    "id": "FU60",
    "title": "60. gün kontrolü",
    "day": "Açılış +60 gün",
    "team": "FIN",
    "agents": [
      "FIN-01",
      "FIN-02",
      "FIN-03",
      "FIN-04",
      "HR-01",
      "HR-02"
    ],
    "headline": "Royalty, tahsilat ve kadro birlikte izleniyor.",
    "story": "Bir demo tahsilat eşleştirme farkı bulunur. Finans uzmanı yeniden ödeme istemeden kaynağı karşılaştırır; insan doğrulaması sonrası fark kapanır.",
    "actions": [
      "FIN-01 / FIN-04: matrah ve kural sürümü",
      "FIN-02 / FIN-03: ekstre, eşleştirme ve mutabakat",
      "İK: kadro ve eğitim devamlılığı"
    ],
    "output": "Demo finans farkı kapandı; kadro değerlendirmesi tamamlandı.",
    "advice": "Yeni bir para kuralı gerekirse seçenekler sana gelir. Rutin mutabakat sorumlusunda kalır.",
    "route": [
      "FIN",
      "HR",
      "COO"
    ],
    "decision": null
  },
  {
    "id": "FU90",
    "title": "90. gün kontrolü",
    "day": "Açılış +90 gün",
    "team": "FRA",
    "agents": [
      "FRA-01",
      "FRA-03",
      "SALE-01",
      "SALE-02",
      "SEO-02"
    ],
    "headline": "Bölge müdürünün önünde tek şube dosyası.",
    "story": "Franchise, Finans, İK, kalite, satış ve dijital görünürlük özetleri birleştirilir. Bölge müdürü bir insan yönetici rolüdür; ajan karar yetkisini devralmaz.",
    "actions": [
      "Ziyaret ve fırsat planı gerçekleşmeleri",
      "Finans / eğitim / kalite kontrol sonuçları",
      "Yeni dönemin iyileştirme önerileri"
    ],
    "output": "90 günlük demo incelemesi kapandı; yeni dönem planı hazır.",
    "advice": "Sana dağınık mesajlar yerine tek değerlendirme ve öncelik sırası gelir.",
    "route": [
      "SALE",
      "FRA",
      "COO"
    ],
    "decision": null
  },
  {
    "id": "DONE",
    "title": "Sonuç",
    "day": "Simülasyon sonu",
    "team": "COO",
    "agents": [],
    "headline": "Bir başvuru. Ortak çalışan bir ekip.",
    "story": "Webden gelen kurgusal aday; ilk görüşme, inceleme, insan kararları, açılış ve 90 günlük takibe kadar ilerledi. Bu gösterim hiçbir canlı kayıt, mesaj, ödeme veya ajan oturumu oluşturmadı.",
    "actions": [
      "17 mevcut uzman + 3 önerilen rol senaryoda yer aldı",
      "3 insan karar kapısı; revizyon istenirse süreç durdu",
      "Tüm olaylar önceden yazılmış demo akışı; gerçek yapay zekâ çalışması değil"
    ],
    "output": "DEMO-FRA-001 uçtan uca senaryosu tamamlandı.",
    "advice": "Senin rolün: yön vermek, gerekli ticari ve açılış kararlarını almak. Ekibin rolü: takip, kanıt, hazırlık ve devir.",
    "route": [
      "COO",
      "SAMI"
    ],
    "decision": null
  }
];
