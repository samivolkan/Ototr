# Canlı Franchise başvuru hattı boşluk kaydı — 2026-11-05

## Gözlenen mevcut durum

Son salt-okunur yeniden doğrulama: **2026-11-06 14:56 TSİ**. `gm-franchise/public-intake-readiness.mjs` sayfa ve güncel uygulama JavaScript kaynaklarını yalnız GET ile denetledi; canlı forma POST göndermedi. Makinece okunabilir sonuç `gm-franchise/live-public-intake-readiness-evidence.json` içindedir. ERP yayın ekranı 24 saatten eski denetim kanıtını fail-closed reddeder.

- `https://ototr.com/franchise` HTTP 200 dönüyor ve `data-demo-form="franchise"` formunu gösteriyor.
- Form `assets/js/app.js` üzerinden aynı origin `/form-handler.php` adresine POST ediyor; Supabase `public-api/franchise-applications` hattını kullanmıyor.
- Canlı formda KVKK aydınlatma, veri işleme ve ticari ileti için üç ayrı seçim alanı bulunmuyor.
- PHP handler ve canlı sayfa kaynakları erişilebilen `samivolkan` GitHub depolarında ve yerel çalışma alanında bulunamadı.
- Supabase staging tarafındaki ayrı izin, sunucu SHA-256 kanıtı ve fail-closed bridge doğrulandı; bu kanıt canlı PHP hattını kanıtlamaz.
- Güncel canlı `assets/js/app.js?v=1791147589` hâlâ `/form-handler.php` kullanıyor; Edge intake, deployment commit kimliği ve rollback referansı bulunamadı.
- 2026-11-06 salt-okunur hosting keşfinde sayfa Cloudflare üzerinden HTTP 200 döndü; Cloudflare ad sunucuları ve `PHPSESSID` oturum çerezi gözlendi. Vercel/Netlify deployment başlığı, kaynak depo kimliği veya origin hosting sağlayıcısı açıklanmadı. Bu nedenle gereken erişim bir GitHub Pages dalı değil, Cloudflare arkasındaki PHP uygulamasının kaynak deposu veya kontrollü hosting deployment kanalıdır. Kanıt: `gm-franchise/live-site-hosting-discovery-evidence.json`.

## Staging önizleme kabulü

- `20261105320000_public_franchise_profile_handoff.sql` staging veritabanına, `public-api` Edge Function sürüm 11 olarak yayımlandı.
- RawGitHack önizleme kaynağı daha önce CORS tarafından reddediliyordu; yalnız tam `raw.githack.com` hostu staging form kabulü için izin listesine eklendi.
- Gerçek Edge HTTP isteğiyle sentetik başvuru referansı üretildi. Bütçe, öz kaynak, yönetim ve sektör deneyimi, şirket, lokasyon ve ortaklık alanları yapılandırılmış biçimde saklandı.
- KVKK/aydınlatma ve veri işleme izinleri `true`, isteğe bağlı ticari ileti `false` gönderildi; üç sunucu bağlı SHA-256 makbuzu oluştu ve başvuru `ready_for_canonicalization` durumuna geçti.
- Geçici Franchise uzmanı JWT’siyle kuyruk okundu; ham ad-soyad, telefon, payload veya istek metadatası dönmeden güvenli profil alanları GM formunu ön-dolduracak şekilde taşındı.
- Başvuru tekil kanonik franchise dosyasına çevrildi, ticari ileti reddi `withdrawn` makbuzu olarak korundu ve kaynak kayıt açık kuyruktan çıktı.
- Kabul sonrasında public başvuru, bridge, franchise dosyası, profil, izin makbuzları ve geçici Auth kullanıcıları silindi; altı grubun kalan sayısı `0` doğrulandı. Kanıt: `gm-franchise/public-handoff-hosted-evidence.json`.
- `public-api` Edge Function v14 staging'e yayımlandı. `https://ototr.com` ve `https://www.ototr.com` origin'leri açıkça kabul edilirken `https://evil.ototr.com` reddedildi; wildcard alt alan izni kullanılmadı. Sürümlü sözleşmede veri işleme kararı eksik veya reddedilmiş iki sentetik istek HTTP 400 ile fail-closed reddedildi. Canlı kaynak için deployment commit kimliği eksik, rollback referansı eksik ve commit kimliği geçersiz üç ek istek de HTTP 400 döndü; bu bağlama denemelerinden veritabanında kalan satır sayısı `0` doğrulandı. Ticari ileti kararı zorunlu yapılmadı. Kanıt: `gm-franchise/public-api-live-origin-hosted-evidence.json`.
- Bu kabul RawGitHack + Supabase staging hattını kanıtlar; mevcut `ototr.com` PHP formunu değiştirmez ve aşağıdaki canlı kapıyı kapatmaz.

## Zorunlu kapanış kanıtı

Bu kapı ancak aşağıdakilerin tamamı kanıtlandığında `PASS` olabilir:

1. Canlı formda aydınlatma metni sürümü, zorunlu veri işleme kararı ve isteğe bağlı ticari ileti kararı ayrı alanlardır.
2. PHP handler üç kararı ayrı alanlar olarak doğrular; ticari ileti reddi başvuruyu reddetmez.
3. İstemci tarafından gönderilen kanıt özeti güvenilir sayılmaz; sunucu zamanı ve metin sürümüyle bağlanmış kanıt üretilir.
4. Eski/eksik istemci kaydı otomatik kanonik dosyaya çevrilmez.
5. Sentetik HTTP kabul testi, veritabanı sonucu ve test verisi temizliği birlikte kaydedilir.
6. Canlı kaynak commit/deployment kimliği ile rollback yöntemi sabitlenir.

## Dağıtıma hazır entegrasyon paketi

Canlı site kaynak deposu bulunduğunda uygulanacak iki bağımsız parça hazırdır:

- `franchise-basvuru/live-form-consent-fragment.html`: mevcut forma öz kaynak, sayısal yönetim deneyimi, şirket statüsü ve ortaklık alanlarını; ayrıca honeypot, zorunlu aydınlatma teyidi, zorunlu veri işleme izni, isteğe bağlı ticari ileti kararı, özel portal gizlilik açıklaması ve erişilebilir durum alanını ekler.
- `franchise-basvuru/live-franchise-adapter.mjs`: mevcut `name`, `phone`, `city`, `district`, `budget`, `experience`, `company`, `location_status`, `area`, `timeline` ve `message` alanlarını sürümlü Edge sözleşmesine dönüştürür. Şirket/marka metnini açıklama olarak korur; şirket statüsünü ayrı kodlu alandan alır ve eski Türkçe sektör/lokasyon seçeneklerini PostgreSQL sözleşme kodlarına çevirir. Yalnız tam Supabase Franchise Edge URL'sini kabul eder; endpoint, KVKK sürümü, deployment commit kimliği veya rollback referansı eksikse fail-closed durur. Bu iki dağıtım alanını istek gövdesine de bağlar; servis anahtarı kullanmaz ve TCKN/finans belgesi taşımaz.
- `supabase/functions/public-api/index.ts`: canlı kaynak için öz kaynak, sektör, şirket statüsü, ortaklık, lokasyon ve 0–80 tam sayı yönetim deneyimini PostgreSQL insertinden önce doğrular; geçersiz kullanıcı girdisini genel HTTP 500 yerine açıklayıcı HTTP 400 ile reddeder. Franchise kaydında ham JSON gövdesi, user-agent ve referer saklamaz; yalnız release/rollback bağı, origin ve izinli UTM alanlarını korur. Bu kaynak sertleştirmesi test edilmiştir ancak mevcut v14 fonksiyonuna kontrollü release/UAT onayı olmadan deploy edilmemiştir.

Kaynak uygulamada Franchise formunun `data-demo-form="franchise"` işareti `data-live-franchise-form` olarak değiştirilerek genel `/form-handler.php` dinleyicisinden ayrılmalıdır. `live-franchise-bootstrap.mjs` modülü yüklenmeli; `OTOTR_FRANCHISE_PUBLIC_CONFIG` içinde tam `apiUrl`, 40 karakterli `deploymentIdentity` ve `revert:<40 karakterli commit>` biçiminde `rollbackReference` verilmelidir. Bootstrap gönder düğmesini istek boyunca kilitler ve yalnız `WEB-FR-XXXXXXXX` biçimindeki sunucu referansını başarı sayar. Bu paket hazırlanmış olsa da kaynak commitine uygulanıp sentetik canlı kabul testi yapılmadan G16 `PASS` olmaz.

## Karar

Durum: `BLOCKED`. Cloudflare arkasındaki canlı PHP kaynak deposu veya kontrollü hosting deployment erişimi olmadan değişiklik yapılmayacak. Bu boşluk kapanmadan üretim kararı `GO` olamaz.
