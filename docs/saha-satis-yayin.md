# Saha Satış · ortak web uygulaması

19 Ekim 2026

- Canlı adres: https://samivolkan.github.io/Ototr/saha-satis/
- Menü: Müşteri & Satış → Saha Satış. ERP’ye dön ana menüyü açar.
- Kaynak: samivolkan/ototr-saha-satis, web/ klasörü. Kaynak commit'i saha-satis/release.json içindedir.
- Masaüstünde sol menü/tablo; telefonda kartlar, alt menü ve uyarlanan formlar.
- 468 gerçek galeri, 488 iletişim kaydı, 478 kaynak satırı ortak veritabanındadır. Son araştırmada 255 kaydın 4'ü doğrulandı: 217 mahalleli / 251 teyit bekleyen. Örnek kayıt yoktur.
- Üç günlük takvim, erteleme/iptal geçmişi, ziyaret sonucu ve takip planı, referans durumu ve galeriye dönüşüm.
- Ziyaret planlama sırası: **İlçe → Mahalle → Galeri → Görüşülecek kişi**. Mahalle seçenekleri ilçeye bağlıdır; tüm mahalleler ve mahallesi bilinmeyenler seçilebilir. Bölge değişiminde eski galeri ve kişi seçimi temizlenir. Galeri detayından açılan planda bölge hazır gelir.
- Galeri listesinde ve detayda **Düzelt** bulunur; elle düzeltilen adresler otomatik araştırmada korunur.
- **Yeni galeri kontrolü** 3/5/7/30 gün seçimini, duraklatmayı ve sıraya almayı destekler. Başlangıç 3 gündür; ilk kısmi kontrolde 4 mağaza incelendi ve 3 aday ayrıldı. Adaylar doğrulanmadan rehbere eklenmez. Sonraki vade 22 Ekim 2026 09.00'dır.
- Kontrol Codex'in bu sohbetindeki yerel otomasyonla yürür; bilgisayar ve Codex açık olmalıdır. Günlük 09.00 yoklaması yalnızca canlı ayardaki vade geldiğinde araştırma yapar. Tam tarama gerçekleşmediğinde kısmi/engelli olarak kaydedilir.

## Erişim ve veriler

Kullanıcı herkese açık canlı bağlantı ve yalnızca ad seçimini onayladı. Şifre/e-posta girişi veya SMTP yoktur. Volkan, Nezire Erten, İlyada Alıcı aynı kayıtları görür. Personel seçimi kimlik doğrulamaz: bağlantıyı bilen herkes kayıtları okuyabilir ve profil seçerek değiştirebilir. E-postalar özel şemadadır ve API'den dönmez.

İş kayıtları tarayıcıya bağlı değildir. Eşzamanlı düzenlemeler sürüm koşuluyla korunur. Sonuç/referans/takip işlemleri atomiktir. Silme ve işlem geçmişini düzenleme istemciye kapalıdır. Aktörler doğrulanmamış, seçilmiş profil olarak işaretlenir.

Statik pakette gerçek katalog, kaynak Excel, özel e-postalar, ortam dosyası veya yönetici anahtarı bulunmaz. Kayıtlar herkese açık API'den alınır. Önceki yerel denemeler ortak kayıtlara otomatik alınmaz.

## Kontroller ve paketleme

- web/: üç test, TypeScript ve Vite üretim derlemesi geçti.
- Veritabanı kabul testi: erişim sözleşmesi, özel e-posta, sürüm çakışması, atomik kayıtlar, tekrar dönüşüm, iptal/erteleme geçmişi geçti. Geçici işlemler rollback yapıldı.
- İki personelle arayüzde galeri/ziyaret/referans ve ortak görünürlük doğrulandı. Test kayıtları temizlenerek 468 gerçek galeri bırakıldı.
- Masaüstü ve 390 px telefon yerleşimi kontrol edildi. İlk sürüm iframe ile; bu güncellemenin Düzelt ve kaynak kontrolü ekranları gerçek 390×844 tarayıcı viewport'unda kontrol edildi.
- Kaynak kontrolü SQL kabul testi: dört aralık, duraklatma/sıraya alma, sürüm çakışması, istemciden sahte sonuç yazma reddi ve manuel adres koruması geçti; test işlemleri rollback yaptı.
- Önceki mobil prototipin 28 korunan dosyası ve 20 testi geçti.
- web/dist saha-satis/ dizinine kopyalandı. Önbellekteki eski sayfalar için eski statik varlıklar korunur; index yeni web paketini yükler. 468 katalog kimliği ve test verileriyle yeni paket tarandı; eşleşme yok.
- Mevcut GitHub Pages akışı main push sonrası yayınlar. Diğer ERP modüllerinin kodu ve iş verileri değiştirilmedi.

## Geri alma

Statik yayın commit'ini git revert ile geri almak arayüzü eski sürüme döndürür; veritabanı kayıtlarını silmez veya geri almaz. Açık API erişimini kapatmak ayrı bir Supabase politika değişikliği gerektirir. Yalnızca arayüzü geri almak erişim modelini değiştirmez.
