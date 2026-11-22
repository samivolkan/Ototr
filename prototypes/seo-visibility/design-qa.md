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
