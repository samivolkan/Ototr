# GM Franchise Design QA

- Source visual truth: `http://127.0.0.1:8767/gm-ik/` (GM İK güvenli pilot dashboard)
- Implementation: `http://127.0.0.1:8767/gm-franchise/` (GM Franchise yaşam döngüsü)
- Viewport: 1265 × 720 CSS px, desktop, device scale 1
- Source pixels: 1265 × 720
- Implementation pixels: 1265 × 720
- Density normalization: aynı IAB oturumu, aynı CSS viewport ve aynı ekran yoğunluğu
- State: kaynakta GM İK Dashboard / Genel Müdür-Merkez İK; uygulamada Yaşam döngüsü / Genel Müdür
- Evidence: her iki görünüm 5 Kasım 2026 tarihinde aynı in-app browser oturumunda yakalanıp birlikte karşılaştırıldı. Yerel dosya çıktısı tarayıcı aracı tarafından sağlanmadığından kanıt URL ve oturum görüntüsü olarak tutuldu.

## Full-view comparison

- Sol navigasyon, aktif siyah menü, kırmızı-beyaz OTOTR kimliği ve MVP rozetleri kaynakla uyumlu.
- Üst güvenli-pilot bandı, açık gri sayfa zemini, beyaz kartlar, ince sınırlar ve 10–12px köşe yarıçapları kaynakla uyumlu.
- İçerik yoğunluğu Franchise iş akışının daha geniş kapsamı nedeniyle artırıldı; ana grid ve kart ritmi GM İK ile aynı kaldı.
- Yatay yaşam döngüsü kontrollü kaydırma kullanıyor; masaüstünde içerik kesilmiyor.

## Focused region comparison

- Header/pilot band: renk, ağırlık ve yerleşim eşleşiyor.
- Sol navigasyon: genişlik, bölüm başlıkları, rozetler ve aktif durum eşleşiyor.
- KPI kartları: sayı hiyerarşisi, alt etiket ve boşluk ritmi eşleşiyor.
- İçerik kartları: sınır, arka plan, tipografi ve durum renkleri kaynak tasarım dilini koruyor.

## Required fidelity surfaces

- Fonts and typography: DM Sans, kaynakla aynı; 23px başlık, 28px KPI değeri ve 12–15px yardımcı metin hiyerarşisi tutarlı.
- Spacing and layout rhythm: 320px Franchise yan menüsü, 22/28px ana içerik boşlukları ve 12–16px kart ritmi tutarlı. Franchise menüsü kapsam nedeniyle kaydırılabilir.
- Colors and tokens: açık yüzey, koyu aktif menü, OTOTR kırmızısı, yeşil başarı ve sarı uyarı semantiği tutarlı.
- Image quality and assets: referans ve uygulamada raster görsel/illüstrasyon yok; marka metin kilidi mevcut kaynak gibi tipografik.
- Copy and content: güvenli pilot sınırı, sentetik veri, departman sorumluları, 14 aşama ve %100 tahsilat kapısı açık yazıldı.

## Comparison history

### Iteration 1

- P1: Aday rolü, izin verilmeyen departman ekranından rol değişiminde genel Dashboard’a düşerek ağ özetini görebiliyordu.
- Fix: izin verilmeyen görünümde `dash` yerine rolün ilk izinli ekranına fail-closed yönlendirme yapıldı; aday ve tedarikçi yalnızca portal görünümüne sınırlandı.
- Post-fix evidence: Aday Yatırımcı rolünde yalnız “Dış kullanıcı portalları” menüsü görünür; genel dashboard, finans, görev ve departman ekranları gizli.

### Iteration 2

- P2: İlk referans taslakta 7 aşama bulunuyor, onaylanan süreç 14 aşamaydı.
- Fix: yatay 14 aşamalı yaşam döngüsü, aşama sahibi, SLA, kapı gerekçesi ve sonraki aşama bilgisi eklendi.
- Post-fix evidence: Yaşam döngüsü ekranı 1 Başvuru–14 Aktif şube adımlarını aynı görünümde gösteriyor.

## Findings

- P0/P1/P2 açık bulgu yok.
- P3: Çok uzun menü küçük ekranlarda yatay gezinme gerektiriyor; işlevsel fakat sonraki tasarım turunda bölüm akordeonu düşünülebilir.

## Primary interactions tested

- Genel Müdür ile Sözleşme → Kurulum geçişi.
- Eksik departman görevi varken 39/39 tamamlanana kadar ilerleme kilidi.
- Genel Müdür ile İK görevi tamamlama ve yüzde güncellemesi.
- Aday Yatırımcı rolünde fail-closed portal görünümü.
- Demo sıfırlama ve başlangıç durumuna dönüş.
- ERP, GM İK, Finans, Hukuk, Academy ve Görev Merkezi bağlantılarının hedefleri.

## Console and runtime

- Sayfa yüklenirken görünür uygulama hatası oluşmadı.
- Inline JavaScript, Node `vm.Script` ile sözdizimi kontrolünden geçti.
- Statik kabul testi geçti: `node --test tests/gm-franchise.test.mjs`.

final result: passed

