# 0.2 geliştirme doğrulaması — 18 Ekim 2026

- Python: 64 test geçti. API doğrulama, erişim anahtarları, geri bildirimde kişisel alanların reddi, SQLite bağlantılarının kapanması, yinelenen geri bildirimin güncellenmesi, gerçek/kurgusal ayrımı, eşiklerin hata uyarılarını koruması, kontrast geometrisi ve frontend üretimi kontrol edildi.
- JavaScript: 16 test geçti. Mevcut ERP aktarım sınırı ve veri politikası dahil; yeni geri bildirim gövdesinde metin/görüntü bulunmadığı ve tercihlerin yalnız izin verilen ayarları sakladığı doğrulandı.
- Yerel tarayıcı testi `127.0.0.1:8767`: ayrıntılı / kontrast, genel eşik 0.92, şasi 0.95. Kurgusal örnekte seçili 17 araç alanı beklenen değerlerle eşleşti; ekranda 14.79 saniye gösterildi. Tek örnek sonucu gerçek belgelerde doğruluk veya hız garantisi değildir.
- 17 araç alanı kontrol edilerek geri bildirim kaydedildi: 1 kurgusal inceleme, 17 sonuç, 0 düzeltme. Fotoğraf, araç değerleri ve sahip bilgileri feedback veritabanına yazılmadı.
- Mevcut canlı OTOTR formu salt okunur incelendi; araç kataloğu yıl listesinde 401 hatası görüldü. Canlı iş emri oluşturulmadı.
- Docker/Compose ve reverse proxy örneği hazırlandı; bu makinede Docker bulunmadığından Linux container build ve gerçek sunucu kabulü yapılmadı. Kalıcı dağıtım yapılmış değildir.
- Mevcut GitHub Pages sürümü ve bilgisayardaki eski test servisi değişmedi. Yeni panel ayrı yerel geliştirme servisindedir. Gerçek model eğitimi yapılmadı; fotoğraflı eğitim veri toplama henüz etkin değil.

Test ortamında Starlette'in httpx test istemcisi için bir kullanımdan kaldırma uyarısı var; başarısız test yok.
