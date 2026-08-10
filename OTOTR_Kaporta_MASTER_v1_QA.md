# OTOTR Kaporta MASTER v1 - QA Raporu

Tarih: 2026-08-10

Kapsam: Kaporta MASTER v1, Kaporta Tasarım merkezi ve 22 noktalı Şasi / Yapısal Gövde ekranı

## Sonuç

Kaporta MASTER v1 statik, veri modeli, etkileşim, rapor ve responsive kontrollerinden geçti. Eklenen v16 dosyasındaki poligonlar kaynak kabul edildi; kaynak dosyaya dokunulmadı ve tanımlar MASTER veri modelinde kayıpsız korundu.

| Kontrol | Beklenen | Sonuç |
|---|---:|---:|
| v16 kaynak poligon tanımı | 48 | 48 |
| Dış kaporta parçası | 16 | 16 |
| Aktif dış görünüş poligonu | 44 | 44 |
| Kapı içi kontrolü | 4 | 4 |
| Araç görünüşü | 5 | 5 |
| Şasi kontrol noktası | 22 | 22 |

## Poligon Kaynak Doğrulaması

- Kaynak: Downloads klasöründen eklenen `OTOTR_Kaporta_Giris_NIHAI_v16_Rapor_Orjinal_Nokta_Gizli.html`.
- MASTER içindeki `AUTO` tanımları v16 kaynağıyla anahtar ve koordinat bazında birebir karşılaştırıldı.
- Repodaki aynı adlı kaynak kopyasında yalnızca “Kaporta Tasarım Merkezi” bağlantısı ve dosya sonu satırı eklenmiştir. Tam dosya hash'i bu nedenle farklıdır; `AUTO` poligon nesnesi aynıdır.
- Veri modelindeki `sourcePolygonSha256`, HTML kabuğundan bağımsız olarak 48 poligon tanımının SHA-256 kanıtını taşır: `b4467f841b959dda949948d925fb3c5ed2f041bbe64129b916123a990ff064c3`.
- Üst, sol, sağ, ön ve arka görünüşlerde 44 dış gövde poligonu aktif olarak çiziliyor.
- Dört kapı içi kaynak tanımı veri kaybını önlemek için JSON içinde `archivedDoorInnerSourcePolygons` alanında korunuyor; bunlar MASTER görev kuralına uygun olarak poligonsuz kontrol satırlarıdır.
- Çözümleme önceliği `manual > imported JSON > gerçek legacy düzenleme > source-v16 AUTO` olarak uygulanıyor.
- Eski editörün kaynakla aynı otomatik seed koordinatları manuel düzenleme sayılmıyor; gerçek kullanıcı düzeltmeleri korunuyor.

## Otomatik Kontroller

```powershell
node tools/generate-kaporta-master-data.mjs
node tools/check-kaporta-master.mjs
node tools/check-chassis-static.mjs
git diff --check
```

Kaporta kontrolü; JavaScript sözdizimi, tekrar eden DOM kimliği, 48 kaynak tanımı, 44 aktif poligon, beş gömülü PNG, fiziksel logo bulanıklaştırma, ERP adapter sözleşmesi ve JSON şemasını doğrular. Şasi kontrolü; 22 benzersiz noktayı, görünüm dağılımını, ERP çağrılarını, completion kapılarını ve self-test sözleşmesini doğrular.

## Tarayıcı Senaryoları

- Beş kaporta görseli yüklendi; 44 SVG poligonu çizildi.
- Dış parça poligonuna tıklama doğru kontrolü seçti; poligon editörü 12 köşe ile açıldı.
- Kapı içi kontrolüne durum ve not girildi; completion sayacı `2/20` oldu.
- Tamamlama ekranı 18 eksik kontrolü listeledi ve `Eksiklere Git` ilk eksik parçayı seçti.
- Müşteri raporu yalnızca bulguları işaretledi; 43 nötr poligon ve bir bulgu anotasyonu gösterildi.
- Şasi nokta modalı; durum, işlem, bulgu, mikron, üç kanıt fotoğrafı, not ve ileri/geri akışlarıyla açıldı.
- Şaside 22 nokta eksikken müşteri raporu engellendi, `Girilmemiş` filtresi açıldı ve ilk eksik noktaya yönlendirildi.
- Şasi `completeChassis()` çağrısı eksik nokta varsa `CHASSIS_INCOMPLETE` hatası üretecek şekilde korundu.

## Responsive Matris

| Görünüm | Sonuç |
|---|---|
| 1920 x 1080 | Geçti |
| 1440 x 1000 | Geçti |
| 1366 x 768 | Geçti |
| 1024 x 768 | Geçti |
| 768 x 900 | Geçti |
| 430 x 932 | Geçti |

Tüm boyutlarda yatay sayfa taşması oluşmadı; görseller ve 44 poligon yüklendi, alt işlem dock'u görünür kaldı ve joystick ile çakışmadı.

## Görsel Kanıtlar

- [Usta masaüstü](docs/qa/kaporta-master-v1/01-usta-desktop.png)
- [Tamamlama kapısı](docs/qa/kaporta-master-v1/02-completion-gate.png)
- [Müşteri raporu](docs/qa/kaporta-master-v1/03-customer-report.png)
- [Rapor bulguları](docs/qa/kaporta-master-v1/04-report-findings.png)
- [Mobil 430 px](docs/qa/kaporta-master-v1/05-mobile-430.png)
- [Poligon seçimi](docs/qa/kaporta-master-v1/06-polygon-selection.png)
- [Şasi masaüstü](docs/qa/kaporta-master-v1/07-chassis-desktop.png)
- [Şasi nokta modalı](docs/qa/kaporta-master-v1/08-chassis-point-modal.png)

## Bilinen Sınırlar

- Canlı ERP backend'i henüz yoktur; adapter bağlı değilken localStorage yalnızca demo fallback olarak kullanılır.
- In-app Chromium, Blob indirme olayını otomasyon katmanına aktarmadı. Düğme tıklaması, kullanıcı mesajı, export handler ve üretilen `ototr.kaporta-master.v1` JSON şeması statik olarak doğrulandı.
- Erişilebilirlik için temel klavye akışı çalışıyor; WCAG uyumluluğu ayrıca ekran okuyucu ve kontrast otomasyonuyla sertifikalandırılmalıdır.
