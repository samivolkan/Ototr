# Canlı Franchise başvuru hattı boşluk kaydı — 2026-11-05

## Gözlenen mevcut durum

Son salt-okunur yeniden doğrulama: **2026-11-06**. `gm-franchise/public-intake-readiness.mjs` sayfa ve güncel uygulama JavaScript kaynağını GET ile denetledi; canlı forma POST göndermedi. Makinece okunabilir sonuç `gm-franchise/live-public-intake-readiness-evidence.json` içindedir.

- `https://ototr.com/franchise` HTTP 200 dönüyor ve `data-demo-form="franchise"` formunu gösteriyor.
- Form `assets/js/app.js` üzerinden aynı origin `/form-handler.php` adresine POST ediyor; Supabase `public-api/franchise-applications` hattını kullanmıyor.
- Canlı formda KVKK aydınlatma, veri işleme ve ticari ileti için üç ayrı seçim alanı bulunmuyor.
- PHP handler ve canlı sayfa kaynakları erişilebilen `samivolkan` GitHub depolarında ve yerel çalışma alanında bulunamadı.
- Supabase staging tarafındaki ayrı izin, sunucu SHA-256 kanıtı ve fail-closed bridge doğrulandı; bu kanıt canlı PHP hattını kanıtlamaz.
- Güncel canlı `assets/js/app.js?v=1791147589` hâlâ `/form-handler.php` kullanıyor; Edge intake, deployment commit kimliği ve rollback referansı bulunamadı.

## Staging önizleme kabulü

- `20261105320000_public_franchise_profile_handoff.sql` staging veritabanına, `public-api` Edge Function sürüm 11 olarak yayımlandı.
- RawGitHack önizleme kaynağı daha önce CORS tarafından reddediliyordu; yalnız tam `raw.githack.com` hostu staging form kabulü için izin listesine eklendi.
- Gerçek Edge HTTP isteğiyle sentetik başvuru referansı üretildi. Bütçe, öz kaynak, yönetim ve sektör deneyimi, şirket, lokasyon ve ortaklık alanları yapılandırılmış biçimde saklandı.
- KVKK/aydınlatma ve veri işleme izinleri `true`, isteğe bağlı ticari ileti `false` gönderildi; üç sunucu bağlı SHA-256 makbuzu oluştu ve başvuru `ready_for_canonicalization` durumuna geçti.
- Geçici Franchise uzmanı JWT’siyle kuyruk okundu; ham ad-soyad, telefon, payload veya istek metadatası dönmeden güvenli profil alanları GM formunu ön-dolduracak şekilde taşındı.
- Başvuru tekil kanonik franchise dosyasına çevrildi, ticari ileti reddi `withdrawn` makbuzu olarak korundu ve kaynak kayıt açık kuyruktan çıktı.
- Kabul sonrasında public başvuru, bridge, franchise dosyası, profil, izin makbuzları ve geçici Auth kullanıcıları silindi; altı grubun kalan sayısı `0` doğrulandı. Kanıt: `gm-franchise/public-handoff-hosted-evidence.json`.
- `public-api` Edge Function v12 staging'e yayımlandı. `https://ototr.com` ve `https://www.ototr.com` origin'leri açıkça kabul edilirken `https://evil.ototr.com` reddedildi; wildcard alt alan izni kullanılmadı. Bu doğrulamada `OPTIONS` isteği kullanıldı, form `POST` edilmedi ve veri oluşturulmadı. Kanıt: `gm-franchise/public-api-live-origin-hosted-evidence.json`.
- Bu kabul RawGitHack + Supabase staging hattını kanıtlar; mevcut `ototr.com` PHP formunu değiştirmez ve aşağıdaki canlı kapıyı kapatmaz.

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
