# Kokpit · İşler — OTOTR entegrasyonu

Türkçe prototipin CSS'i ve Pano / Liste / Takvim / Gantt görünümleri korunur. Görevler tarayıcıda değil PostgreSQL'de saklanır. ERP menüsündeki **Kokpit · İşler** bağlantısı bu modülü açar.

## Altyapı ve giriş

Sahibinin tercihiyle mevcut GitHub Pages + Supabase altyapısı kullanılır. Ayrı VPS, Express, pm2 veya Let's Encrypt süreci kurulmaz; HTTPS ve süreç işletimi mevcut sağlayıcılardadır.

- Arayüz: `https://samivolkan.github.io/Ototr/kokpit/`
- REST tabanı: `https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/kokpit-api/api`
- `GET/POST /isler`, `GET/PUT/DELETE /isler/:id`; `GET /me`, `GET /users`, `GET/PUT /settings`, `POST /import`.
- Giriş kullanıcı adı mevcut ERP e-posta adresidir. Parola doğrulaması ve hash saklama Supabase Auth tarafından yapılır. Yeni bir parola deposu veya ortak varsayılan parola yoktur.
- Mevcut ERP oturumu aynı origin'den devralınır. localStorage yalnızca Auth oturumu için kullanılır; iş verisi, roller ve otomasyonlar orada tutulmaz.
- İşler `app_users.branch_id` ile sınırlandırılır. Şubesi olmayan hesaplar ayrı `hq` alanındadır. Bu yeni ekran mevcut `task_tasks` / Aksiyon & Görev kayıtlarını dönüştürmez; aynı ERP hesaplarıyla çalışan ayrı Kokpit çalışma alanıdır.

## Roller

`CEO`, `GENERAL_MANAGER`, `BRANCH_MANAGER`: yönetici. `INSPECTION_TECHNICIAN`, `OPERATIONS`, `CRM_AGENT`, `MARKETING`, `HR`, `FRANCHISE_SALES`, `SUPPORT_AGENT`, `ACADEMY_MANAGER`: çalışan. Diğer roller: izleyici.

Yönetici otomasyonları ayarlar. Yönetici ve çalışan kendi çalışma alanında ekleme/düzenleme/silme yapabilir. İzleyici yalnızca okur ve dışa aktarır. Pasif veya ERP kullanıcı kaydı olmayan hesap reddedilir. Özel bir atama gerekirse yalnızca yetkili veritabanı yöneticisi `app_private.kokpit_roles(user_id,role)` tablosuna `yonetici`, `calisan`, `izleyici` değerlerinden birini yazar; frontend rol seçimi yetki vermez.

Veri tabloları private şemadadır; RLS açık, tarayıcı rollerinin doğrudan erişimi kapalıdır. Tek RPC girişinde kullanıcı, şube ve rol her istekte yeniden doğrulanır. Değerler parametreli RPC/SQL çağrılarıyla taşınır. Eşzamanlı değişiklikler `version` ile korunur (409). CORS yalnızca `KOKPIT_ALLOWED_ORIGINS` içindeki origin'leri kabul eder; varsayılan yayın origin'i `https://samivolkan.github.io`.

## Özellikler ve veri aktarımı

Alt görevler, sorumlu/yardımcı/oluşturan filtreleri, proje/etiket, öncelik, sürükle-bırak, sayaç, tema, arama, sıralama ve JSON aktarımı korunur. Formdan veya sürükleyerek tamamlamak aynı sunucu iş akışını çalıştırır. Aylık tekrar ayın son gününü aşmaz. Tekrar ve bildirim kuyruğu aynı veritabanı işlemi içinde oluşturulur. Günlük gecikme görevi İstanbul saatiyle **03:05**'te çalışır; tarayıcının açık olması gerekmez.

Eski prototipte **Dışa aktar** ile JSON indirin; yeni ekranda **İçe aktar** ile ekleyin. 1 MB / 100 iş sınırı vardır. Aktarım mevcut işleri silmez, yeni sunucu ID'leri verir ve giriş yapan kişiyi oluşturan olarak kaydeder. Başarısız aktarımın tamamı geri alınır. Geçmiş tamamlanmış işler içe aktarılırken e-posta/tekrar tetiklenmez. Aynı dosyayı ikinci kez yüklemek yeni kayıtlar ekler. Tarayıcıdaki eski kayıtlar otomatik silinmez. Demo işler canlıya eklenmez.

## Yerel test ve kurulum

Node.js 22+ ve Microsoft Edge kurulu bir bilgisayarda:

```sh
cd tests/kokpit
npm ci
npm test
npm run serve
# Ayrı terminal:
npm run browser
```

Yerel adres `http://127.0.0.1:43819/kokpit/`. Test sunucusu bellekte izole bir PostgreSQL/PGlite veritabanı kullanır. **Yalnızca test sunucusunda** kullanıcılar `admin@example.invalid`, `worker@example.invalid`, `viewer@example.invalid`; test parolası `local-test-only`. Üretim kodu bu hesapları/parolayı kabul etmez. Test sunucusu durunca sentetik test verileri silinir. Tarayıcı testi Edge'in headless sürümünü kullanır. Ortamda paket zaten varsa `PLAYWRIGHT_PATH` ile paket konumu verilebilir.

## Dağıtım ve yedek

1. Yerel SQL/API ve tarayıcı testlerini çalıştırın. `git diff --check` yapın.
2. Üretimde bağımsız `pg_dump` veya sağlayıcı PITR yedeği önerilir. Bu sürüm için `supabase/ops/kokpit-predeploy-backup.sql` ile `public` / `app_private` uygulama tablolarının sunucu içi veri kopyası alınır. `kokpit_backup_20261018.manifest` satır sayılarını içerir. Bu **aynı veritabanındaki geri dönüş kopyasıdır**; auth, dosya depolama ve tüm veritabanını yeniden kurabilecek harici yedek değildir. Yedek private şemada, RLS ve erişim iptaliyle korunur. Git'e müşteri verisi eklenmez.
3. Önce `20261018204541_kokpit_isler.sql`, sonra `20261018205152_kokpit_schedule.sql` migration'larını uygulayın. İkinci migration pg_cron gerektirir.
4. `kokpit-api` Edge Function'ını dağıtın. Fonksiyon kendi içinde `auth.getUser` ile token doğruladığı için Supabase gateway `verify_jwt=false` kullanılır; bu, modern publishable key ve tarayıcı OPTIONS istekleriyle uyumu sağlar. SQL katmanı ayrıca `auth.uid()` ve aktif ERP hesabını zorunlu tutar. Anonim veri erişimi yoktur.
5. Gerekliyse izin verilen origin'leri Supabase secrets üzerinde ayarlayın. Yerelde `.env` kullanın; `.env.kokpit.example` yalnızca şablondur. Gerçek değerleri commit etmeyin.
6. Test edilen değişiklikleri `main` dalına push edin. `Deploy GitHub Pages` workflow sonucunu ve canlı `/kokpit/`, `app.js`, yetkisiz API=401, yabancı origin=403 kontrollerini doğrulayın.

## E-posta — kullanıcı talebiyle ertelendi

Gönderen `dijital@ototr.com`. `kokpit-mail` SMTP worker kaynağı ve özel bildirim kuyruğu hazırdır; bu sürümde SMTP secret'ları ve gönderim cron'u kurulmaz. Ekran bunu açıkça belirtir. Tamamlama sırasında etkin kurallar kuyruğa kayıt ekleyebilir; e-posta gönderildiği iddia edilmez.

Daha sonra `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, rastgele `KOKPIT_MAIL_TOKEN` değerlerini güvenli `.env` üzerinden Supabase secrets'a aktarın. `kokpit-mail` fonksiyonunu kendi token kontrolüyle (`verify_jwt=false`) dağıtın. Token yalnızca sunucu secret/Vault'ta bulunmalı; cron isteği `Authorization: Bearer <KOKPIT_MAIL_TOKEN>` ile POST yapmalıdır. **Etkinleştirmeden önce geçmiş kuyruk kayıtlarını inceleyin**; aksi hâlde eski tamamlamaların e-postaları da gönderilir. İlk doğrulamayı kontrollü alıcıyla yapın.

SMTP TLS zorunludur (465 implicit TLS; diğer portlarda STARTTLS). Hatalar alıcı/parola/provider ayrıntıları dışarı sızmadan kaydedilir. Kuyruk kilitlenerek alınır, başarısızlıklar yeniden denenir (en fazla 10 deneme). E-posta teslimi en az bir kez semantiğindedir: SMTP kabulü ile veritabanı onayı arasındaki kesintide tekrar teslim mümkündür; sabit Message-ID kullanılır.

## Geri alma

1. İlgili Kokpit yayın commit'ini `git revert <commit>` ile geri alın ve `main` dalına push edin. Başka ERP değişikliklerini resetlemeyin.
2. `select cron.unschedule('kokpit-overdue-daily');` ile yalnızca Kokpit günlük görevini durdurun.
3. Gerekirse `kokpit-api` fonksiyonunu önceki sürümüne döndürün veya devre dışı bırakın. Yeni tabloları hemen silmeyin; kullanıcıların canlıda girdiği kayıtları önce güvenli yedekleyin.
4. Bu migration'lar mevcut ERP tablolarını değiştirmez. Dolayısıyla normal geri almada eski ERP verisini geri yüklemek gerekmez. Veri kurtarma gerekirse private snapshot'tan sadece gereken satırları, kolon listeleri ve parametreli sorgularla yöneticinin incelemesi sonrası alın; güncel tabloları topluca silmeyin.

## Doğrulama kapsamı

Otomatik SQL/API testleri: kimlik, üç rol, şube sınırı, pasif hesap, doğrudan tablo erişimi, tüm alanların doğrulaması, SQL metni güvenliği, sürüm çakışmaları, silme, aylık tekrar, kuyruk, günlük otomasyon, atomik içe aktarma, REST/CORS/istek boyutu.

Tarayıcı: giriş/çıkış, görev/alt görev, sayaç, dört görünüm, arama, yeniden yükleme, tekrar, HTML kaçışları, hata toast'ı, izleyici kilidi ve mobil taşma. Üretimde mevcut gerçek ERP parola bilgileri kullanılmadan yetkisiz erişim ve transaction rollback testleri yapılır; gerçek kullanıcıyla uçtan uca canlı giriş testi ayrı kapsamdır.

19 Ekim 2026 yayın kontrolünde canlı SQL rollback testi geçti; kalıcı test satırı sayısı 0, günlük cron aktif. Yayın öncesi kopya 79 tablo / 6.578 satır içerir.

Supabase güvenlik taramasında Kokpit'e ait WARN/ERROR yoktur. Private modül ve yedek tablolarında **RLS açık / politika yok** bilgi kaydı beklenen kapalı erişim tasarımıdır; doğrudan tablo erişimi verilmez. Projede önceden bulunan 4 [search_path uyarısı](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), 39 [authenticated SECURITY DEFINER inceleme uyarısı](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) ve [sızdırılmış parola korumasının kapalı olması](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ayrıca incelenmelidir. Bunlar bu değişiklikte eski ERP fonksiyonlarını topluca değiştirmek için kullanılmadı.
