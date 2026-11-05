# Canlı Franchise başvuru hattı boşluk kaydı — 2026-11-05

## Gözlenen mevcut durum

- `https://ototr.com/franchise` HTTP 200 dönüyor ve `data-demo-form="franchise"` formunu gösteriyor.
- Form `assets/js/app.js` üzerinden aynı origin `/form-handler.php` adresine POST ediyor; Supabase `public-api/franchise-applications` hattını kullanmıyor.
- Canlı formda KVKK aydınlatma, veri işleme ve ticari ileti için üç ayrı seçim alanı bulunmuyor.
- PHP handler ve canlı sayfa kaynakları erişilebilen `samivolkan` GitHub depolarında ve yerel çalışma alanında bulunamadı.
- Supabase staging tarafındaki ayrı izin, sunucu SHA-256 kanıtı ve fail-closed bridge doğrulandı; bu kanıt canlı PHP hattını kanıtlamaz.

## Zorunlu kapanış kanıtı

Bu kapı ancak aşağıdakilerin tamamı kanıtlandığında `PASS` olabilir:

1. Canlı formda aydınlatma metni sürümü, zorunlu veri işleme kararı ve isteğe bağlı ticari ileti kararı ayrı alanlardır.
2. PHP handler üç kararı ayrı alanlar olarak doğrular; ticari ileti reddi başvuruyu reddetmez.
3. İstemci tarafından gönderilen kanıt özeti güvenilir sayılmaz; sunucu zamanı ve metin sürümüyle bağlanmış kanıt üretilir.
4. Eski/eksik istemci kaydı otomatik kanonik dosyaya çevrilmez.
5. Sentetik HTTP kabul testi, veritabanı sonucu ve test verisi temizliği birlikte kaydedilir.
6. Canlı kaynak commit/deployment kimliği ile rollback yöntemi sabitlenir.

## Karar

Durum: `BLOCKED`. Canlı PHP kaynak deposu veya kontrollü deployment erişimi olmadan değişiklik yapılmayacak. Bu boşluk kapanmadan üretim kararı `GO` olamaz.
