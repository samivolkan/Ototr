# GM Franchise Süreç Kokpiti — Design QA

- Seçilen yön: `1 — Süreç kokpiti`
- Kaynak görsel gerçek: `http://127.0.0.1:8772/franchise-surec-kokpiti.html`
- Uygulama: `http://127.0.0.1:8771/gm-franchise/?v=20261110-cockpit#e2e`
- Masaüstü viewport: 1280 × 720 CSS px; sayfa gövdesi 1265 px
- Mobil viewport: 390 × 844 CSS px; sayfa gövdesi 375 px
- Yoğunluk normalizasyonu: aynı Codex IAB oturumu ve aynı ekran yoğunluğu
- Durum: sentetik `FRC-2026-001` dosyası, `Sözleşme` aşaması, `Hukuk Sorumlusu`
- Kanıt: kaynak ve uygulama 10 Kasım 2026 tarihinde IAB ekran görüntüleriyle karşılaştırıldı; uygulama ayrıca masaüstü ve mobil DOM ölçümleriyle doğrulandı.

## Tam görünüm karşılaştırması

- Koyu sol navigasyon, açık içerik zemini, kırmızı OTOTR vurgu rengi ve üstteki görev-sahibi bandı seçilen kokpit yönüyle eşleşiyor.
- 240 px masaüstü menüsü, kaynak prototipteki içerik ağırlıklı hiyerarşiyi koruyor ve 14 aşamaya daha fazla yatay alan bırakıyor.
- `İş şu anda kimde?`, bekleme, SLA ve `Görevi aç` eylemi ilk bakışta görünür.
- 1 Başvuru–14 Aktif şube aşamalarının tamamı aynı görünümde; geçmiş, mevcut ve gelecek aşamalar farklı durumlarla ayrılıyor.

## Odaklı bölge karşılaştırması

- Görev sahibi bandı: kişi/rol, somut bekleme nedeni, SLA ve aksiyon tek satırlık karar alanında.
- Aşama hattı: mevcut `Sözleşme` aşaması kırmızı; tamamlanan aşamalar yeşil; gelecek aşamalar kilitli gri.
- Onay kapıları: sorumlu departman, kanıt durumu ve kilit/bekleme semantiği birlikte gösteriliyor.
- Sonraki hareket: mevcut iş tamamlandığında devralacak rol ve yapacağı işlem açıkça belirtiliyor.

## Zorunlu sadakat yüzeyleri

- Tipografi: DM Sans; rol ve durum hiyerarşisi 9–18 px aralığında okunaklı.
- Düzen ritmi: 8–17 px aralık, 9–12 px köşe yarıçapı ve ince sınırlar kaynak tasarım dilini koruyor.
- Renkler: OTOTR kırmızısı, antrasit görev bandı, yeşil tamamlanma ve sarı bekleme semantiği tutarlı.
- Kopya: genel departman adı yerine `Hukuk Sorumlusu`, `Finans Sorumlusu`, `İK Sorumlusu` gibi tek hesap verebilir rol kullanılıyor.
- Gizlilik: gerçek T.C. kimlik, banka/finans ve sözleşme belgelerinin demo ekranda tutulmadığı görünür uyarıyla belirtiliyor.

## Karşılaştırma geçmişi

### İterasyon 1

- P2: Sol menü 320 px olduğu için aşama etiketleri gereğinden fazla sıkışıyordu.
- Düzeltme: kokpit görünümünde menü 240 px'e indirildi; diğer Franchise ekranlarının yerleşimi değiştirilmedi.
- Sonuç: 1280 px görünümde 14 aşama yedi sütun halinde ve yatay taşma olmadan görüntüleniyor.

### İterasyon 2

- P2: Görev sahibi yalnız `Hukuk` olarak görünüyordu ve bekleme nedeni birden fazla kapıyı aynı genel cümlede topluyordu.
- Düzeltme: hesap verebilir rol `Hukuk Sorumlusu` oldu; neden `Zorunlu sözleşme belgeleri bekleniyor (12/17).` biçiminde somutlaştırıldı.
- Sonuç: kullanıcı hem işin kimde olduğunu hem de işi ilerletmek için eksik olanı tek bakışta görüyor.

### İterasyon 3

- P2: Mobil kırılımın gerçek tarayıcı görünümünde taşma ve kontrol erişilebilirliği doğrulanmamıştı.
- Düzeltme: 390 × 844 ayrı IAB sekmesinde yeniden yüklendi ve ölçüldü.
- Sonuç: menü statik yatay navigasyona, aşamalar iki sütuna dönüyor; `scrollWidth` 375 px ile gövde genişliğine eşit ve `Görevi aç` görünür.

## Açık bulgular

- P0/P1/P2 açık bulgu yok.
- P3: Mobil üst menü kapsam nedeniyle yatay kaydırmalı; işlevsel ve taşmasızdır. İleride bölüm akordeonu ayrı bir tasarım iyileştirmesi olabilir.

## Test edilen ana etkileşimler

- Aday hattında 10 başvuru kanalı görüntülendi; Fuar/QR ve Saha Ekibi kaynaklarından sentetik dosya oluşturuldu.
- Aynı kanal ve kaynak referansı tekrar kullanıldığında yeni dosya oluşturulmadı, mevcut tekil dosya açıldı.
- Toplu Aktarım `BATCH-` kaynağı olmadan reddedildi; geçerli batch referansıyla kanonik dosya oluşturuldu.
- Ticari ileti izni verilmemesi başvuruyu kilitlemedi; KVKK aydınlatma ve veri işleme kararları zorunlu kalmaya devam etti.
- `Kurulum` aşaması seçildi; ayrıntı `Mimari / Proje Sorumlusu` ve ilgili görev metniyle değişti.
- Mevcut `Sözleşme` aşamasına dönüldü; bekleme nedeni ve `Hukuk Sorumlusu` geri geldi.
- `Görevi aç` eylemi `#departman` görünümüne yönlendirdi.
- `Yaşam döngüsü` menüsü kullanıcıyı `#e2e` kokpitine geri getirdi.
- Masaüstünde 14 aşama, 240 px yan menü ve yatay taşmasız 1265 px gövde doğrulandı.
- Mobilde 14 aşama, iki sütun, görünür görev eylemi ve yatay taşmasız 375 px gövde doğrulandı.

## Konsol ve otomatik kabul

- Masaüstü konsol hatası/uyarısı: 0 / 0.
- Mobil konsol hatası/uyarısı: 0 / 0.
- Franchise test paketi: 310 test geçti, 0 hata.
- `git diff --check`: geçti.
- Bu kanıt sentetik demo kabulüdür; canlı Supabase, sağlayıcı, gerçek veri, UAT imzası veya üretim yayını kanıtı değildir.

final result: passed
