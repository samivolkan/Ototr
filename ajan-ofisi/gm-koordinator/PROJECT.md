# OTOTR GM Koordinatör — proje ve teslim çerçevesi

Tarih: 26 Kasım 2026. Ürün sahibi: Sami. Koordinatör: COO-01. Bağımsız kontrol: BEK-01.

## Teslim edilen kapsam

Mevcut Ajan Ofisi içine eklenen, derleme veya ücretli model çağrısı gerektirmeyen interaktif demo. Yedi mevcut ekip ve mevcut uzman kimlikleriyle çalışır. Blog ve sosyal içerik SEO-03 kapsamındadır; yeni ve çelişen bir içerik departmanı kurulmaz.

Bu sürüm gerçek otonom işletme sistemi veya canlı ajan yürütücüsü değildir. Deterministik kurallar ve açıkça sentetik senaryolar üzerinden yönetim döngüsünü çalıştırır. Canlı entegrasyonların yapılmış olduğu iddia edilmez. Demo yetkileri mevcut Ajan Ofisi pilot yetkilerini değiştirmez.

### Ekranlar

1. Genel bakış: yönetim özeti, karar, engel, SLA, bütçe, ekip ve son hareketler.
2. İş ve aksiyonlar: arama, durum filtresi, sorumlu, süre, detay ve kabul dosyası.
3. Karar masası: somut çıktı, gerekçe, sürüm, kapsam ve süreye bağlı insan kararı.
4. Ekip ve kapasite: yedi ekip; mevcut çalışma alanlarına bağlantı; demo kaynak durumu.
5. KPI ve öngörüler: başlangıç/hedef/ölçüm ayrımı ve açık varsayımlı kapasite hesabı.
6. Senaryo laboratuvarı: bağımsız kabul testleri, kontrollü zaman ilerletme ve hata enjeksiyonu.
7. Yönetim ve yol haritası: karar kitabı, limitler ve canlıya geçiş kapıları.
8. İşlem günlüğü: aktör, zaman, iş ve gerekçe; indirilebilir yönetim özeti.

## Mevcut sistemle uyum

Kaynak incelemesinin başlangıç commit'i: `0d62ec4`.

| Alan | Mevcut kaynak | Bu sürümün ilişkisi |
|---|---|---|
| Ekip yapısı | `ajan-ofisi/office-data.json` | 7 ekip / 18 uzman için entegrasyon testi |
| Koordinatör kuralları | `ajan-ofisi/team/COORDINATOR.md`, `CONSTITUTION.md` | 10 karar, günlük 45 / haftalık 840 dakika; demo eşlemesi |
| Bağımsız kontrol | `ajan-ofisi/team/GUARD.md` | BEK-01 rol ayrımı; insanın simüle ettiği kontrol, bağımsız LLM denetimi değil |
| İş sözleşmesi | `ajan-ofisi/work-contract.mjs` | Kanıt, sürüm, sahiplik ilkeleri korunur; demo ayrı durum modeli kullanır |
| Yönetim planı | `ajan-ofisi/management.html` | Mevcut planlama ekranı korunur |
| Finans | `ajan-ofisi/finance-health.html` | Yalnız gezinme bağlantısı, veri senkronu yok |
| İK | `ik-ototr/` | Yalnız gezinme bağlantısı |
| Şikâyet | `gm-sikayet/` | Yalnız gezinme bağlantısı |
| Yorum | `ajan-ofisi/review-team.html` | Gerçek yorum/yayın servisinden tamamen ayrı |
| Saha satış | `saha-satis/` | Gerçek ziyaret verisi okunmaz |
| Franchise | `ajan-ofisi/franchise-specialist.html` | Eğitim/finans bağımlılığı demo edilir; canlı açılış izni yok |
| SEO / içerik | `ajan-ofisi/seo-workspace.html` | Sentetik teknik inceleme, benchmark ve blog taslağı |

## Yönetim modeli

Olay → doğrulama → kaynak ve kanıt değerlendirmesi → tekil iş → insan kararı gerekiyorsa karar kuyruğu → kapasite/bütçe kontrolü → demo teslim → BEK-01 kontrolü → tamamlanma → 7 günlük etki ölçümü.

İç operasyon işleri otomatik simüle edilebilir. Para, yayın, mesaj, sözleşme ve personel türleri insan kararına gider. Sessizlik onay değildir. Red terminaldir. İçerik, kaynak veya sürüm değişikliği eski onayı geçersiz kılar. Politika güncelleme veya canlı moda geçiş komutu yoktur.

Sami demo rolü karar verir; COO-01 görevleri yönetir; BEK-01 teslimi kontrol eder. Rol seçimi eğitim/demo içindir, kimlik doğrulama değildir. Kullanıcı tarayıcı kayıtlarını değiştirebilir; bu nedenle gerçek kişisel veya mali veri bu uygulamaya girilmemelidir.

### İş sözleşmesi

Her iş: tekil olay kimliği, departman, uzman, yönetici, kontrol rolü, kaynak, gözlem zamanı, öncelik, süre, bağımlılıklar, kabul kriteri, efor, KPI, karar dosyası, sürüm, onay, teslim kanıtı, kontrol ve etki kaydı taşır.

Karar dosyası: hedef, bulgu, öneri, risk, alternatif ve somut demo çıktı. Onay exact snapshot ve politika sürümüne bağlıdır. Bu bağlama bir kriptografik imza veya sunucu güvenlik kontrolü değildir.

### Limitler

- Bekleyen karar: 10. Daha fazlası sırada kalır; kendiliğinden onaylanmaz.
- Günlük inceleme: 45 dakika. Haftalık: 840 dakika. Günlük sınır tek başına daha dar olabilir; mevcut politika değerleri korunmuştur.
- Çalışma turu: 30 demo birim. Bunlar model tokenları veya gerçek maliyet değildir.
- Ekip kapasitesi: 2 aktif/teslim kontrolü bekleyen iş. Gerçek çalışan kapasitesi değildir.
- Veri güncelliği: en fazla 24 saat; benchmark güven eşiği 0,70 ve karşılaştırılabilirlik şartı.
- Onay: 24 saat. SLA: P1 için 8 saat; diğerleri 48 saat. Bunlar pilot öncesi kalibre edilecek varsayımlardır.
- Tekrar deneme: en erken 1 saat; en fazla 3. Sonrasında gerekçeli koordinatör müdahalesi.
- Etki ölçümü: tamamlanmadan 7 gün sonra; nedensellik iddiası olmadan.
- Bütçe gün sınırı: Europe/Istanbul için UTC+3; hafta başlangıcı pazartesi.

### Hata yönetimi

Olay/komut kimliği tekrarları aynı işi tekrar üretmez. Farklı içerikle aynı kimlik reddedilir. Komutlar optimistic revision kontrolü taşır. Tarayıcı sekmeleri güncelleme bildirimi alır; son kaydı tekrar okur. Bu, veritabanı transaction veya atomik sekmeler arası kilit garantisi değildir.

Teslim sonrası yanıt kaybında önce outbox kaydı aranır; varsa yeniden uygulama yapılmaz. Bu garanti yalnız demo modelinin belleği/yerel günlüğü için geçerlidir. Harici servislerde aynı garanti için sunucu transaction, outbox, benzersiz anahtar ve uzaktaki teslim sorgulaması gerekir.

Kaynak kesilirse ilgili iş durur. Kaynağın tekrar açılması eski veriyi otomatik güncel yapmaz. Bilinmeyen olay, geçersiz sayı, döngüsel bağımlılık ve bilinmeyen komut reddedilir. Teslimi belirsiz iş körlemesine iptal edilemez. Açık iş varken ilgili SLA olayı çözüldü sayılamaz.

## Veri ve gizlilik

Demo; kişisel bilgi, gerçek müşteri, çalışan, banka, sözleşme veya araç kaydı içermez. API anahtarı gerekmez. Dış ağ istemcisi kullanılmaz. Komut günlüğü sadece bu tarayıcının `ototr-gm-coordinator-demo-v1` anahtarına yazılır. Dışa aktarma yalnız metin özetidir. Sıfırlama yalnız bu anahtarı siler.

Üretim için gerekli kayıt sınıfları: `events`, `work_items`, `work_dependencies`, `decision_snapshots`, `approval_decisions`, `execution_outbox`, `delivery_receipts`, `reviews`, `outcome_measurements`, `incidents`, `policy_versions`, `audit_events`, `budget_reservations`.

Canlı durumda kimlik ve şube kapsamı sunucudan gelir. Tarayıcı actor alanına güvenilmez. İK ve finans ayrıntıları yalnız yetkili servis/rollerde kalır; koordinatöre asgari gerekli özet iletilir. Saklama ve silme süreleri veri sahibi tarafından belirlenir. Dış raporlar veri olarak değerlendirilir; içindeki talimatlar yetki vermez.

## Canlı sistem için uygulama planı

| İş paketi | Sorumluluk | Bağımlılık | Kabul kapısı |
|---|---|---|---|
| GM-01: Veri sözleşmeleri | Teknik entegrasyon + veri sahipleri | Mevcut kaynak envanteri | Her alanın kaynağı, güncelliği ve şube kapsamı belli |
| GM-02: Kalıcı operasyon servisi | Backend | GM-01 | Transaction, idempotans, yedekleme/geri yükleme testleri |
| GM-03: Kimlik ve yetki | Backend + kontrol | GM-02 | Çapraz şube ve rol ihlalleri reddedilir; audit üretir |
| GM-04: Salt okunur adaptörler | Departman sorumluları | GM-01/03 | Demo/canlı ayrımı, revision ve freshness testleri |
| GM-05: Uzman yürütücüsü | Ajan altyapısı | GM-03/04 | Yapılandırılmış çıktı, sınırlı araç seti, maliyet tavanı |
| GM-06: Bağımsız kontrol | BEK-01 altyapısı | GM-05 | Üretici kendi kontrolünü yapamaz; yanlış kapanış engellenir |
| GM-07: Zamanlayıcı ve olay kuyruğu | Operasyon altyapısı | GM-02/05 | Yeniden başlama, kaçan iş telafisi, lease ve retry testleri |
| GM-08: İnsan karar masası | Ürün + backend | GM-03/06 | Gerçek oturum, tam içerik onayı, süre ve revizyon doğrulaması |
| GM-09: Gölge pilot | GM + tek şube | GM-04/08 | İnsan karşılaştırması; yetki ihlali/kanıtsız kapanış sıfır |
| GM-10: Sınırlı dış uygulama | Servis sahipleri | GM-09 ve açık işlem yetkisi | Teslim mutabakatı, durdurma, geri alma ve alarm |
| GM-11: KPI kalibrasyonu | GM + departmanlar | Pilot verisi | Hedef/ölçüm tanımı, veri kalitesi ve dönem karşılaştırması |
| GM-12: Yaygınlaştırma | Sami + GM | Pilot kabulü | Şube bazında kademeli açılış; başarısızlıkta kapsam daraltma |

Tahmini takvim veya canlı hazır olma tarihi, entegrasyon keşfi yapılmadan kesinleştirilmez. Mevcut modüllerin geçmişteki prototip/canlı durumları üretim kanıtı sayılmaz.

## Çalıştırma ve kullanım

Depo kökünde `python -m http.server 8896 --bind 127.0.0.1` çalıştırın. `http://127.0.0.1:8896/ajan-ofisi/gm-koordinator/` adresini açın. ES modülleri nedeniyle `file://` ile açmayın.

1. Koordinatör rolünde demo işlerini yükleyin ve çalışma turunu başlatın.
2. Sami demo rolünde karar kartını açın; çıktıyı inceleyip gerekçeyle onay/red verin.
3. Koordinatör rolünde tekrar çalışma turu başlatın.
4. BEK-01 rolünde teslim dosyasını kontrol edin; doğrulayın veya düzeltmeye gönderin.
5. Koordinatör rolünde eski veri/benchmark için demo kanıtını yenileyin.
6. Bağımlı işler için çalışma/kontrol döngüsünü tekrarlayın.
7. Laboratuvarda 7 gün ilerletin; BEK-01 rolünde tamamlanan işin etki ölçümünü girin.
8. Yönetim özetini indirin; laboratuvarda kabul testlerini bağımsız olarak çalıştırın.

GitHub Pages yayımlaması mevcut ERP oturum kapısını otomatik ekler. Demo rol seçimi bu kapının yerine geçmez. Yerel önizleme bu yayımlama adımından önceki statik demodur.

## Doğrulama

`node --test ajan-ofisi/gm-koordinator/*.test.mjs`

`node --test tests/management-office.test.mjs tests/agent-office-nav.test.mjs tests/work-source-binding.test.mjs`

İkinci komutta depoda bulunan test dosyaları esas alınmalıdır. Doğrulanmış nihai sonuçlar `QA.md` dosyasındadır. Testler olası tüm üretim koşullarının kusursuz olduğunu kanıtlamaz.

## Geri alma

Modül bağımsız dizindedir. Canlı veri şeması veya mevcut iş akışı değiştirilmez. Sürüm geri alınacaksa GM modülü ekleyen commit geri alınır; ofis gezinme bağlantısı ve ilgili CI adımı aynı değişiklik içinde geri döner. Kullanıcının demo geçmişi yalnız tarayıcıda kalır.
