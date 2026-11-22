# Design QA / Kabul kaydı

final result: passed — bağımsız demo kapsamı

22 Kasım 2026. Kaynak: evidence/ototr-seo-sablon.png (1513×1039). Uygulama: http://127.0.0.1:4173. Karşılaştırma: evidence/design-comparison.png; masaüstü: evidence/seo-desktop-verified.jpg; analiz: evidence/seo-analysis-verified.jpg; mobil: evidence/seo-mobile-verified.jpg.

Masaüstü CSS viewport 1513×1039, Chrome DPR 1; yakalanan JPEG 1498×1029 (tarayıcı görüntü alanı kırpması). Mobil CSS 390×844, belge genişliği 375; yatay belge taşması yok. Tablolar kendi alanında yatay kayar. In-app tarayıcı ekran görüntüsünde sağ kenar kırpıldığı için görsel karşılaştırmada Chrome kanıtı kullanıldı.

Kaynak ve uygulama aynı birleşik görüntüde incelendi. Koyu menü, beyaz kartlar, kırmızı aksiyon/aktif sekme, mavi eğri ve metrik hiyerarşisi korunuyor. Yazı ağırlıkları, kart iç aralıkları, renkler, SVG logo netliği ve Türkçe kopya incelendi. Grafik/kart ve gezinme bölümleri ayrı yakın incelemeyle kontrol edildi. Kaynak tek ekran örneğiydi; çalışan sürümde dokuz bölüm, ortak kapsam filtresi ve açık demo etiketleri bilinçli genişletmeler. Kaynaktaki rakamlar yerine tutarlı sentetik veri kullanıldı; alt tablo ek kontroller nedeniyle aşağı kayıyor. Kalan engelleyici P0/P1/P2 görsel bulgu yok. Piksel eşitliği iddia edilmez.

## Doğrulanan etkileşimler

- Dokuz sekmenin her biri seçildi ve doğru tabpanel görüldü; son tur 9/9.
- Şube ayrıntısı → sorgu kapsamı; dönem ve cihaz seçimi; metrik değişimi.
- Sorgu/sayfa geçişi, boş arama, filtre temizleme, fırsat eşiği ve CTR kaydırıcısı.
- GA4 kaynak/cihaz kırılımı, GBP kaynağı, rapor kaydetme, yenilemeden sonra açma, gerçek CSV indirme.
- Yerel SEO marka boş durumu, Nilüfer verisi ve şube görev formu.
- Görev oluşturma, sorumlu değiştirme, tamamlandı durumu ve yenileme sonrası kayıt.
- İçerik oluşturma, önizleme ve Hazır sütununa taşıma.
- Demo taraması, geçmiş kaydı, LCP bulgusunu göreve dönüştürme.
- GBP bağlantı simülasyonu, gösterim eşiği değiştirme ve yenileme.
- Yönetim raporunun gerçek HTML dosyası olarak indirilmesi.
- Klavye ok tuşuyla sekme değiştirme; mobil menü, Escape kapatma ve gezinme.
- Demo sıfırlama ve temiz başlangıç.
- Son Chrome turunda console error yok. Geliştirme sırasındaki eski HMR durum hatası yenileme/şema doğrulaması sonrası tekrarlanmadı.

## Otomatik kontroller

`npm test`: 2 test geçti; 105 dönem/hesap/şema/CSV/boş veri kontrolü ve çoklu sayfa-birim ağırlık testi.
`npm run build`: geçti.
`npm run test:sites`: 4/4 geçti.

Bilinen sınır: JS paketi yaklaşık 755 kB (gzip 220 kB), Vite boyut uyarısı veriyor. Demo için engelleyici değil; üretim entegrasyonunda route bazlı ayırma önerilir. Gerçek sağlayıcı, gerçek kullanıcı yetkilendirmesi, ekran okuyucu ve cihaz çiftliği kabulü yapılmadı. Canlı SEO doğruluğu veya dağıtımı bu testlerle doğrulanmış değildir.

## Alternatif B kabulü — 22 Kasım 2026

final result: passed — referanstan esinlenen bağımsız alternatif kapsamı.

Referans efferd.com/view/dashboard-7. Kaynak: evidence/efferd-dashboard-reference.jpg (1280×900). Uygulama: evidence/seo-alternative-desktop.jpg (1265×1365 tam sayfa, 1280×900 CSS viewport); dikey kaydırma çubuğu kaynaklı 15px görüntü farkı karşılaştırmada normalize edildi. Birleşik kanıt: evidence/seo-alternative-comparison.png. Mobil kanıt: evidence/seo-alternative-mobile.jpg, 390×844 CSS viewport.

Açık menü, ince gri sınırlar, dört seçilebilir metrik, monokrom alan grafiği ve üç alt analiz bölümü referansla birlikte incelendi. Yazı hiyerarşisi, boşluklar, gri/yeşil/kırmızı renkler, mevcut SVG marka ve Türkçe etiketler gözden geçirildi. Başlık, grafik kartları ve menü ayrı yakın incelemeyle kontrol edildi. Finans metriklerinin SEO verileriyle değiştirilmesi, kapsam filtresi, klasik görünüm seçimi, dokuz bölüm ve erişilebilir grafik tablosu bilinçli uyarlamadır. Görsel kaynakla piksel eşitliği amaçlanmadı.

İlk mobil kontrolde gizli başlığın belge genişliğini 539px'e taşırdığı görüldü (P2). Mutlak konumlu başlık ana panel içine bağlandı. Yeniden kontrolde 390px viewport / 375px belge genişliği: taşma yok. Geniş tablolar ve mobil sekmeler kendi alanında kayıyor. Kalan P0/P1/P2 bulgu yok.

Etkileşim: klasik/alternatif geçişinde bölüm ve metrik korunuyor; hızlı 7/28 günlük seçim global dönemle eşleşiyor; CTR kartı grafiği değiştiriyor; birim araması ve gerçek CSV indirme çalışıyor; fırsat kartı sorgu filtresini %5 hedefle açıyor; dokuz bölüm 9/9 görünür; günlük grafik tablosu ve yönetim raporu penceresi açılıyor; mobil menü çalışıyor. Chrome son tur console error 0. Otomatik 2 veri testi (105+4 kontrol), build ve 4 paketleme testi geçti. Paket büyüklüğü uyarısı sürüyor (gzip yaklaşık 233 kB); canlı entegrasyon yapılmadı.

## Studio güncellemesi
Son görünüm, Ads ve veri hazırlığı kapsamı `STUDIO-QA.md` içinde ayrıca kaydedildi. Önceki Klasik/Alternatif kanıtları korunuyor. Studio'nun varsayılan olması kullanıcı tarafından istenen Google Reviews düzenine uyarlama kararına dayanır.
