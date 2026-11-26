# OPS-01 · Operasyon Ajanı

26 Kasım 2026 — Kullanıcının “planla ve ekibe dahil et” talebiyle organizasyona eklendi.

## Konum ve sahiplik

OPS-01 → MGR-OPS (şube operasyon sorumlularını koordine eden rol) → COO-01 → yalnız gerekli yönetim kararlarında Sami.

MGR-OPS bir rol tanımıdır; henüz gerçek bir çalışana atanmış kabul edilmez. Şube bazlı insan sorumlusu mevcut yetkili personel kaynağından eşleştirilmelidir. BEK-01 bağımsız kabul kontrolüdür. Önceki PLAN-OPS-01 önerisi bu role taşındı; ikinci bir operasyon ajanı kurulmadı.

Mevcut 7 departmanın uzmanları korunur. OPS-01 operasyon takip rolü olarak eklenir. Bu kayıt mevcut pilot yürütücüsünün, ERP yetkilerinin veya diğer ekiplerin otomatik çalışma kapsamını genişletmez.

## Ajanın sorumluluğu

- Şube → iş emri → aşama → görev → sorumlu ilişkisini izlemek.
- Kabul, personel atama, ekspertiz kontrolleri, kalite/rapor kontrolü, sunum ve teslim aşamalarını kaynak kayıtlarına bağlamak.
- Bekleme ve aktif işlem süresini ayrı hesaplamak; atama zamanını işe başlama zamanı saymamak.
- Zorunlu kontrollerin tamamlanma oranını gerçek maddelerden almak; bilinmeyen veriyi sıfır veya tamamlandı göstermemek.
- Geciken, sahipsiz, durmuş veya kontrolü eksik işleri şube sorumlusunun gündemine hazırlamak.
- Aynı sorunun tekrarını, şubeler arası kapasite sorununu ve yönetim kararı gerektiren durumu GM Koordinatörüne taşımak.
- Kaynak kesilince eski detayları güncelmiş gibi göstermemek.

Rapor bulgusu/puanı/hasar kaydı değiştirme, müşteriye mesaj, ödeme, prim, personel yaptırımı ve teslim onayı yetkisi yoktur. Ajanın uyarısı iş emrinin gerçek durumunu kendiliğinden değiştirmez.

## Kullanıcı akışı

**Ajan Ofisi → Operasyon Ajanı → Şubeler → Şube → Araç/iş emri → Aşamalar ve kanıtlar.**

| Katman | Gösterilecek alanlar | Kabul şartı |
|---|---|---|
| Şubeler | Bekleyen/işlemde/tamamlanan iş, gecikme, kaynak zamanı | Yalnız yetkili şubeler; veri yoksa açıkça bilinmiyor |
| Şube | Araçlar, aşamalar, görev sahipleri, istasyon yükü | Şube değişiminde önceki şubenin kayıtları temizlenir |
| İş emri | Paket, zorunlu kontrol sayısı, tamamlanma, başlangıç/bitiş olayları | Yüzde ve süre kaynak kanıtıyla hesaplanır |
| İstisna | Engel, iş sahibi, önerilen aksiyon, hedef tarih | Tekil olay anahtarı; tekrar uyarı çoğaltmaz |
| GM özeti | Şube, sorun, etki, kanıt zamanı, öneri, karar ihtiyacı | Kişisel ayrıntıların yerine gerekli asgari özet |

## Mevcut durum

`branch-operations.html` mevcut çalışma alanıdır. Örnek senaryosu vardır; oturumlu ERP kaynak sekmesine salt okunur bağlanabilir. Kaynak sekmesinin açık olması gerekir; bağımsız, kesintisiz bir arka plan ajanı değildir. Gerçek oturumla canlı kabul testi henüz yapılmamıştır.

Çok şubeli birleşik seçici henüz mevcut değildir. Örnek Nilüfer ekranı diğer şubelerin verisi gibi sunulmaz. Yeni ekran kurmak yerine mevcut şube görünümü genişletilecektir. `inspection-coordinator.html` ayrıntılı süreç rehberi olarak korunur.

## İş paketleri ve sıralama

| Sıra | İş | Sahiplik | Bitiş kriteri |
|---|---|---|---|
| OPS-01A | Rol ve çalışma alanını ekibe kaydet | COO-01 | Yönetim Masası, ofis kısayolu ve GM ekip kartında görünür — bu teslim |
| OPS-01B | Yetkili şube ve insan sorumlusu eşlemesi | Teknik entegrasyon + MGR-OPS | Gerçek oturumdan şube kapsamı; rol adayına atanmış kişi denmez |
| OPS-01C | Aşama/veri sözleşmesi | OPS-01 + teknik entegrasyon | İş emri kimliği, şube, kaynak sürümü, olay zamanı, paket maddeleri tanımlı |
| OPS-01D | Şubeler panosu ve seçici | Uygulama geliştirme | Filtre, şube değişimi, erişim reddi, boş/eski/kesik veri akışları testli |
| OPS-01E | İstisna ve aksiyon hazırlığı | OPS-01 → MGR-OPS | Tekrar etmeyen uyarı; sorumlu ve kabul kriteri; otomatik ERP yazması yok |
| OPS-01F | GM devir sözleşmesi | MGR-OPS → COO-01 | Kaynaklı özet, güncellik, devir ve kabul ayrımı; müşteri ayrıntısı taşınmaz |
| OPS-01G | Tek şubeli gölge pilot | Şube sorumlusu + BEK-01 | İnsan kontrolüyle karşılaştırma; yanlış tamamlanma ve yetki ihlali sıfır |
| OPS-01H | Çok şubeli yaygınlaştırma | COO-01 + veri sahipleri | Şube izolasyonu ve kaynak arızası testleri, izleme ve geri dönüş planı |

## KPI ve eskalasyon

Bekleme süresi, işlem süresi, aşama gecikmesi, eksik zorunlu kontrol, yeniden açılan iş ve veri güncelliği ölçülür. Başlangıç ölçümü olmadan keyfi personel hedefi konmaz; tek skordan performans yaptırımı üretilmez.

Rutin gecikme şube sorumlusuna; tekrarlayan veya şubeler arası sorun MGR-OPS üzerinden COO-01'e; bütçe/personel/politika kararı COO-01 üzerinden Sami'ye hazırlanır. Bu belge mesaj gönderme veya gerçek görev oluşturma otomasyonu kurmaz.

## Kabul senaryoları

1. Yetkisiz şube istekleri sunucuda reddedilir.
2. Şube değişince önceki araç ve personel bilgileri görünmez.
3. Eksik olay zamanı süreyi “bilinmiyor” yapar.
4. Paket dışı madde tamamlanma hesabına girmez; görev yüzdelerinin basit ortalaması rapor yüzdesi olmaz.
5. Eksik zorunlu kontrol işin tamamlandı görünmesini engeller.
6. Kaynak kesintisi/eski veri son görünümü güncelmiş gibi tutmaz.
7. Aynı gecikme birden fazla görev veya GM kararı üretmez.
8. Şube müdahalesi ve GM kabulü ayrı kanıtlanır.
9. Canlı müşteri/araç ayrıntıları demo, genel özet ve test verisine taşınmaz.
10. Çok şubeli canlı akış, gerçek oturumla kabul edilmeden tamamlandı sayılmaz.
