# Hedef: ruhsattan mevcut OTOTR ekspertiz iş emri oluşturma

## Güncel hedef: GitHub Pages ERP

Kullanıcının son seçimi `https://samivolkan.github.io/Ototr/index.html#ruhsat` üzerindeki ERP'dir. `ruhsat-erp.js` kontrol edilen araç alanlarını buradaki hızlı iş emrine taşır. Paket seçimi ve mevcut kayıt düğmesi kullanıcıda kalır. Sahip önerileri ERP mesajına veya kalıcı kayda dahil edilmez. Renk, sınıf, tarihler, hacim, güç ve belge seri no gibi ek araç alanları `ruhsatVehicle` içinde saklanır; mevcut Supabase akışında araç metadata snapshot'ı kullanılır, şema değişikliği yapılmaz.

Bulut oturumu kullanılamıyorsa mevcut yerel kayıt yolu kullanılır. Yeni kayıtlar `storageScope: browser-local` ile işaretlenir; liste yenilemesi ve sonraki bulut senkronu bu kayıtları silmez. Ekran bunların yalnız bu tarayıcıda olduğunu, buluta/mobile gönderilmediğini belirtir. Bu kayıtlar otomatik olarak buluta yüklenmez. Tarayıcı verileri silinirse yerel kayıtlar kaybolur.

OCR motoru halen kullanıcının bilgisayarındaki 0.2.0 servisine geçici HTTPS tüneli üzerinden bağlıdır. Bilgisayar kapalıyken okuma çalışmaz. Kalıcı sunucu kurulumu ertelenmiştir. Açık test bağlantısında geri bildirim yönetimi kapalı, eşik ve görüntü iyileştirme ayarları kullanılabilir; yerel kalite panelinde anonim alan sonuçları kaydedilebilir. Eşik değişikliği model eğitimi değildir.

Aşağıdaki bölüm önceki, yalnız okunarak yapılan üretim uygulaması incelemesidir; bu sürümde `oto-tr.com` değiştirilmemiştir.

18 Ekim 2026 tarihinde yetkili kullanıcı oturumunda `https://oto-tr.com/Expertiz/Create` ekranı yalnız okunarak incelendi. Canlı iş emri oluşturulmadı; hosting, uygulama dosyaları ve veritabanı değiştirilmedi. GitHub Pages ERP prototipi ile bu canlı uygulama farklı sistemlerdir. Prototipteki aktarım, canlı uygulamada entegrasyon yapılmış olduğu anlamına gelmez.

## Kullanıcı akışı

1. Mevcut kısa iş emrinin Araç Bilgileri kartında “Ruhsattan doldur” ile fotoğraf çek/yükle.
2. OCR araç alanlarını çıkarır. Fotoğraf, sahip bilgileri ve ham OCR sadece geçici bellekte kalır.
3. Plaka/şasi ile araç bilgileri fotoğrafın ilgili bölgesiyle birlikte gösterilir. Düşük güven, biçim hatası veya iki motorun uyuşmazlığı açık onay gerektirir. Şasi hiçbir zaman tahminle düzeltilmez.
4. OCR yıl/marka/ticari ad sonuçları mevcut araç kataloğunda sırayla eşleştirilir. Katalog kimlikleri doğrulanmadan seçim yapılmaz. Ruhsatta bulunmayan tam donanım/seri otomatik uydurulmaz; eşleşme belirsizse kullanıcı seçer.
5. Şube mevcut kullanıcı bağlamından alınır veya kullanıcı seçer; hizmet/paket ruhsattan gelmez. Eksik zorunlu bilgiler tamamlanınca “Kontrol et ve iş emri aç” mevcut kayıt işlevini çağırır.
6. Mevcut sistem iş emri numarasını döndürür ve mevcut tam iş emri ekranına ilerler. Yeni bir iş emri veritabanı kurulmaz.

## Gözlenen form eşlemesi

| OCR alanı / kaynak | Mevcut kontrol | Uygulama |
|---|---|---|
| `plate` | `plaka` | Normalize et, kullanıcı karşılaştırması |
| `vin` | `sasiNo` | Biçim kontrolü ve kullanıcı onayı |
| `model_year` | `abaYil` | Katalogdaki yıl seçeneğine eşleştir |
| `vehicle_class` | `abaSinif` | Ruhsat sınıfı ile katalog sınıfının aynı anlamda olduğu doğrulanmalı |
| `brand` | `abaMarka` | Yıl/sınıf yüklemesi tamamlandıktan sonra katalog kimliği |
| `kind`, `type` | `abaModelGrubu` | Kesin ve tekil katalog eşleşmesi varsa kullan |
| Ruhsatta genelde yok | `abaSeri` | Tam donanımı kullanıcı seçer veya doğrulanmış ayrı kaynaktan al |
| Mevcut oturum / kullanıcı | `subeId` | Yetkili şube seçimi |
| Kullanıcı tercihi | Hizmet / Paket Seçimi | Mevcut paket ve fiyat hesaplamasını kullan |
| Mevcut kayıt düğmesi | `btnKaydet` | İş Emri Aç ve Tam İş Emrine Geç |

Motor no, yakıt, renk, tarihler, hacim, güç ve belge seri no OCR'da var; kısa formda görünen karşılıkları yok. Tam iş emri modelinin kaynak kodu incelenerek DTO ve doğrulama kurallarına göre taşınmalı. Form DOM'unda ayrıca alternatif marka/model/yıl kontrolleri bulunuyor; aktif katalog/fallback akışı kaynak koddan doğrulanmadan bu kontrollere veri yazılmamalı.

## Gözlenen engel

Yıl seçicisinde `OTOTR Araç Verisi API 401 durum kodu döndü.` hatası görüldü. Sebebi sadece bu ekrandan kesinleşmez. Mevcut yazılımcı ilgili sunucu entegrasyonunun yetkilendirmesini ve servis yapılandırmasını kontrol etmeli. Anahtarlar tarayıcıya veya sohbete çıkarılmamalı. Katalog eşlemesini kapalı listeye veya tahmine dönüştürerek hata gizlenmemeli.

## Teknik sınır

Mevcut sunucu kodu bu çalışma alanında doğrulanmış değil. Controller, DTO, oturum/rol kontrolü, kayıt endpoint'i ve işlem bütünlüğü görülmeden gerçek iş emri API'si varsayılmamalı. Gerekli değişiklik: mevcut oturumu kullanan sınırlı OCR adaptörü, form üzerindeki yükleme/kontrol bölümü ve doğrulanmış araç verisini mevcut kayda aktaran kod. OCR'ye ERP veritabanı erişimi verilmez.

Kaydetme çift tıklama ve ağ tekrarında aynı iş emrini iki kez açmamalı; mevcut sistemin idempotency/transaction imkânı incelenmeli. OCR sonucu tek başına paket satın alma, harici ücretli sorgu veya finans hareketi başlatmamalı; mevcut seçilmiş paket/ek test onayları korunmalı. Ruhsat sahibi satıcı olduğu varsayılmamalı. Sahip bilgileri geçici öneri olarak kalır; otomatik kalıcı kayda girmez.

Kabul testi önce staging ortamında yapılır: sentetik belge → araç alanları → yetkili şube/paket → tek kayıt → aynı iş emri numarası → tam iş emri. API 401/503, bozuk fotoğraf, şasi belirsizliği ve ikinci kaydetme isteğinde güvenli davranış ayrıca kontrol edilir. Kalıcı sunucu kurulumu kullanıcının isteğiyle şimdilik bekletiliyor.
