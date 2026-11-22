# Studio kabul ve tasarım kontrolü

22 Kasım 2026. Yerel uygulama: http://127.0.0.1:4173/?design=studio

## Doğrulanan sonuç

- 11 sekme masaüstünde açıldı ve içerikleri okundu. Mobil 390×844 görünümde aynı 11 sekmenin `aria-selected` durumu ve içerikleri doğrulandı.
- Mobilde Şubeler, Sorgular, Aksiyonlar ve Ads tablolarında saptanan sayfa taşması düzeltildi: gizli tablo etiketleri kaydırma kapsayıcısına bağlandı. Yeniden kontrolde belge genişliği 375 px, viewport 390 px; sayfa taşması yok.
- Günlük/birikimli grafik ve 7 günlük senaryo açıldı. 90 gün, birim, gösterim metriği ve karşılaştırma kapatma/açma çalıştı. Karşılaştırma kapalıyken katkı grafiğinin açıklayıcı boş durumu görüldü.
- Hedef kaydırıcısı klavyeyle %20'den %25'e getirildi; hedef 538'den 560'a değişti ve uygulandı.
- Takvim günü günlük sorgu penceresini; fırsat kuyruğu sorgu ayrıntısını açtı.
- Ads kampanya + Mobil filtresi Nilüfer için 2.741,63 TRY harcama, 226 tıklama, 41 form, 66,87 TRY CPA gösterdi. Kampanya ayrıntısındaki cihaz toplamı aynı değerleri verdi.
- Ads ayrıntısından görev oluşturuldu, kaydedildi ve sayfa yenilemeden sonra Aksiyonlar'da korundu.
- CSV dosya seçicisiyle geçerli Ads dosyası kabul edildi (1 satır / 0 hata). Negatif maliyet içeren dosya satır/kolon açıklamasıyla reddedildi. Örnek veri düğmesi de şablon kontrolünü çalıştırdı.
- Teknik demo taraması tamamlanma mesajı görüldü; dış servis taraması yapılmadı.
- İçerik editöründe yazılan başlık SERP önizlemesine yansıdı; deneme taslağı kaydedilmeden kapatıldı.
- Analiz oluşturucuda GSC → GA4 → GBP geçişinde uyumlu kırılımlar ve metrikler değişti.
- Yönetim raporu HTML indirildi. Klasik ve Alternatif görünüm düğmeleri doğru görünümü açtı, Studio'ya dönüş çalıştı.
- Home/End tuşları sekme seçimini değiştirdi. Mobil menü açıldı; Escape ile kapandı.
- Bu test oturumunda tarayıcı hata konsolu boştu.

## Otomatik kontroller

`npm test`: 8/8 test grubu geçti. Önceki 105 analitik doğrulama ve çoklu sayfa/birim gruplaması yanında yeni kapsamlar:
- 7/28/90 gün × tüm/marka/üç şube kapsamında günlük, birikimli, önceki dönem, konum dağılımı ve katkı toplamları.
- 7 günlük ortalama penceresi, geleceğe uzatma ve girdi değişmezliği.
- Ads CPC/CPA/CTR ağırlıklı hesapları; kampanya/cihaz/gün toplam mutabakatı ve boş veri.
- Beş kaynak şablonu, BOM, tırnak, satır sonu, noktalı virgül, bozuk tarih, negatif sayı, yanlış para birimi, eksik/fazla kolon.

`npm run test:sites`: 4/4 geçti. `npm run build`: başarılı. Üretim JS paketi yaklaşık 902 kB (gzip 259 kB); Vite büyük paket uyarısı veriyor. Bu teslimde ağdan yüklenen ek font veya grafik servisi yok. Gerçek entegrasyonda sayfa bazlı kod bölme ölçülerek uygulanmalı.

## Görsel karşılaştırma

Referans: kullanıcının OTOTR Google Reviews ekranı. Piksel kopyası hedeflenmedi; yatay koyu menü, altı KPI, geniş ana grafik ve sağ özet kartları korundu. Renkler mor/turkuaz/lacivert; kırmızı yalnız olumsuz durumu anlatıyor. Mobilde KPI'lar iki sütuna, grafikler tek sütuna iner; sekmeler yatay kayar ve ayrıca menüyle erişilir.

Teslim ekranları: `evidence/seo-studio-desktop.jpg`, `evidence/seo-studio-mobile.jpg`, `evidence/seo-studio-full.jpg`, `evidence/seo-studio-ads.jpg`. Referanstaki gerçek veriler kamuya açık teslim paketine alınmadı.

## Sınırlar

Sentetik verili bağımsız prototip; canlı Google Ads, GSC, GA4, GBP, Kokpit veya gerçek tarama bağlantısı yok. CSV kontrolü yalnız yerel önizleme; grafiklere veri aktarmaz. Gerçek yetkilendirme, API adaptörleri, çok kullanıcılı kayıt ve üretim entegrasyonu sonraki aşamadır. Claude/DeepSeek incelemesi ilk sürüm içindir; Studio'nun bu son sürümü onlarca onaylanmış gibi sunulmaz. Buradaki kontroller tam bir erişilebilirlik veya güvenlik sertifikasyonu değildir.
