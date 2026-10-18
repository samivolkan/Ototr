# Saha Satış · ortak web uygulaması

19 Ekim 2026

- Canlı adres: https://samivolkan.github.io/Ototr/saha-satis/
- Menü: Müşteri & Satış → Saha Satış. ERP’ye dön ana menüyü açar.
- Kaynak: samivolkan/ototr-saha-satis, web/ klasörü. Kaynak commit'i saha-satis/release.json içindedir.
- Masaüstünde sol menü/tablo; telefonda kartlar, alt menü ve uyarlanan formlar.
- İlk aktarımda 468 gerçek galeri, 488 iletişim kaydı ve 478 kaynak satırı ortak veritabanına alındı. Güncel adetler kullanıcının eklediği kayıtlarla değişebilir. Son araştırmada 255 kaydın 4'ü doğrulandı: 217 mahalleli / 251 teyit bekleyen. Örnek kayıt yoktur.
- Üç günlük takvim, erteleme/iptal geçmişi, ziyaret sonucu ve takip planı, referans durumu ve galeriye dönüşüm.
- Ziyaret planlama sırası: **İlçe → Mahalle → Galeri → Görüşülecek kişi**. Mahalle seçenekleri ilçeye bağlıdır; tüm mahalleler ve mahallesi bilinmeyenler seçilebilir. Bölge değişiminde eski galeri ve kişi seçimi temizlenir. Galeri detayından açılan planda bölge hazır gelir.
- Referans ekleme ve ziyaret sonucunda referans alma formlarında mahalle ilçeye bağlı açılır listedir. Canlı kayıtlardaki mahalleler kullanılır; bilinmeyen adres boş bırakılabilir, listede olmayan mahalle açık elle giriş seçeneğinden girilir.
- Kaynak galeri aramasında yazdıkça eşleşmeler görünür; sonuca tıklamak galeriyi seçer. Yeni arama eski seçimi temizler. Türkçe/ASCII adlar, kişi ve biçimlendirilmiş telefon araması desteklenir. Dört domain testi ve masaüstü/390 px telefon kontrolleri geçti.
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

## Günlük ve haftalık rapor güncellemesi

- Sol menüde günlük/haftalık ziyaret raporları; telefonda alt menüde Raporlar. Tarih ve Müşteri Danışmanı filtresi; Pazartesi-Pazar haftası ve Türkiye saati.
- Ziyaret durumu, amaç, sonuç, not, plan geçmişi ve dönemin referansları gerçek canlı kayıtlardan hazırlanır. Filtre/içerik değişince eski PDF geçersiz kılınır. PDF oluşturma kayıtları değiştirmez.
- Türkçe fontlu, sayfalı PDF tarayıcıda oluşturulur. Rapor dosyaları dış servise ya da bu herkese açık GitHub deposuna yüklenmez.
- PDF indir/önizle ve WhatsApp'ta paylaş. Desteklenen cihazda kullanıcı paylaşım ekranından uygulama ve alıcı seçer. WhatsApp Web veya desteklenmeyen tarayıcıda PDF indirip Ataç → Belge ile ekleme adımları gösterilir. Link dosyayı otomatik eklemez; teslim edildi iddiası yoktur.
- Referans ekle: kaynak galerinin kayıtlı kişilerinden seçim önerileri, galeri sahibi rolüne öncelik, elle ad girme korunur. Kaynak değişince önceki kişi temizlenir. Sorumlu etiketi Müşteri Danışmanı oldu.
- Kontroller: 9 otomatik test; üretim TypeScript/Vite derlemesi; yerel tarayıcıda kişi önerisi, PDF indirme, danışman/tarih filtreleri, PDF geçersizleştirme ve 390×844 telefon görünümü. Üç sayfalık uzun not ve boş rapor PDF'leri render edilip tüm sayfaları incelendi; 30 not bloğu ve Türkçe karakterler metin çıkarımıyla doğrulandı. Gerçek WhatsApp mesajı gönderilmedi, canlı iş kaydı oluşturulmadı.
