# Saha Satış · ortak web uygulaması

19 Ekim 2026

- Canlı adres: https://samivolkan.github.io/Ototr/saha-satis/
- Menü: Müşteri & Satış → Saha Satış. ERP’ye dön ana menüyü açar.
- Kaynak: samivolkan/ototr-saha-satis, web/ klasörü. Kaynak commit'i saha-satis/release.json içindedir.
- Masaüstünde sol menü/tablo; telefonda kartlar, alt menü ve uyarlanan formlar.
- 468 gerçek galeri, 488 iletişim kaydı, 478 kaynak satırı ortak veritabanına aktarıldı. 213 mahalleli / 255 teyit bekleyen. Örnek kayıt yoktur.
- Üç günlük takvim, erteleme/iptal geçmişi, ziyaret sonucu ve takip planı, referans durumu ve galeriye dönüşüm.

## Erişim ve veriler

Kullanıcı herkese açık canlı bağlantı ve yalnızca ad seçimini onayladı. Şifre/e-posta girişi veya SMTP yoktur. Volkan, Nezire Erten, İlyada Alıcı aynı kayıtları görür. Personel seçimi kimlik doğrulamaz: bağlantıyı bilen herkes kayıtları okuyabilir ve profil seçerek değiştirebilir. E-postalar özel şemadadır ve API'den dönmez.

İş kayıtları tarayıcıya bağlı değildir. Eşzamanlı düzenlemeler sürüm koşuluyla korunur. Sonuç/referans/takip işlemleri atomiktir. Silme ve işlem geçmişini düzenleme istemciye kapalıdır. Aktörler doğrulanmamış, seçilmiş profil olarak işaretlenir.

Statik pakette gerçek katalog, kaynak Excel, özel e-postalar, ortam dosyası veya yönetici anahtarı bulunmaz. Kayıtlar herkese açık API'den alınır. Önceki yerel denemeler ortak kayıtlara otomatik alınmaz.

## Kontroller ve paketleme

- web/: üç test, TypeScript ve Vite üretim derlemesi geçti.
- Veritabanı kabul testi: erişim sözleşmesi, özel e-posta, sürüm çakışması, atomik kayıtlar, tekrar dönüşüm, iptal/erteleme geçmişi geçti. Geçici işlemler rollback yapıldı.
- İki personelle arayüzde galeri/ziyaret/referans ve ortak görünürlük doğrulandı. Test kayıtları temizlenerek 468 gerçek galeri bırakıldı.
- Masaüstü ve 390 px telefon yerleşimi kontrol edildi. Telefon testi geçici iframe ile yapıldı; kontrol dosyası pakete alınmadı.
- Önceki mobil prototipin 28 korunan dosyası ve 20 testi geçti.
- web/dist saha-satis/ dizinine kopyalandı. Önbellekteki eski sayfalar için eski statik varlıklar korunur; index yeni web paketini yükler. 468 katalog kimliği ve test verileriyle yeni paket tarandı; eşleşme yok.
- Mevcut GitHub Pages akışı main push sonrası yayınlar. Diğer ERP modüllerinin kodu ve iş verileri değiştirilmedi.

## Geri alma

Statik yayın commit'ini git revert ile geri almak arayüzü eski sürüme döndürür; veritabanı kayıtlarını silmez veya geri almaz. Açık API erişimini kapatmak ayrı bir Supabase politika değişikliği gerektirir. Yalnızca arayüzü geri almak erişim modelini değiştirmez.
