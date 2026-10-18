# OTOTR İşler v24

Adres: https://samivolkan.github.io/Ototr/isler/

Kullanıcının GitHub ERP altyapısında yayımlama tercihiyle GitHub Pages + Supabase Edge Functions + PostgreSQL kullanılır. Ayrı Express/VPS, SSH, pm2/systemd veya Let's Encrypt kurulumu gerekmiyor: HTTPS ve servis yaşam döngüsünü mevcut yönetilen platformlar sağlar. `kokpit.ototr.com`, `/kokpit/` ve eski görev tabloları değiştirilmez. ERP menüsüne ayrı **Kokpit · İşler v24** bağlantısı eklenir. v24 kendi ortak panosuyla başlar; önceki panodaki işler JSON ile aktarılabilir.

## Kimlik ve güvenlik

Mevcut ERP e-posta adresi + parola ile giriş yapılır. Supabase Auth parolaları bcrypt ile saklar ve giriş/yenileme uç noktalarında IP tabanlı hız sınırı uygular. Uygulama ayrı parola kopyası tutmaz. Kaynaklar: [Password security](https://supabase.com/docs/guides/auth/password-security), [Rate limits](https://supabase.com/docs/guides/auth/rate-limits). Projenin mevcut kota değerleri bu dağıtımda değiştirilmez.

İş verisi, filtreler ve ekip otomasyon ayarları PostgreSQL'dedir. localStorage kullanılmaz. Yalnızca oturum anahtarları sekmeye özel sessionStorage'dadır; sekme kapanınca yeniden giriş gerekir. Yetki bilgileri kullanıcı metadata'sından değil aktif `app_users` kaydından ve mevcut `app_private.kokpit_roles` atamasından alınır. `CEO`, `GENERAL_MANAGER`, `BRANCH_MANAGER` yönetici; bilinen operasyon rolleri çalışan; diğerleri izleyicidir. Gerekirse yetkili DB operatörü `kokpit_roles` atamasını değiştirir. Bir pano aynı `branch_id` kapsamındadır; şubesi olmayan kullanıcılar `hq` kapsamını paylaşır.

- Yönetici kendi ekip panosundaki tüm işleri yönetir.
- Çalışan yalnızca oluşturduğu, sorumlusu veya yardımcısı olduğu işi değiştirir/siler/yorumlar.
- İzleyici okuyabilir, kendine özel filtre kaydedebilir; iş değiştiremez.
- Sorumlu ve yardımcılar aktif kayıtlı ekip kullanıcılarının UUID'leridir; görünen adlar kullanıcı listesinden gelir.

Edge API her istekte `auth.getUser()` ile kimliği doğrular. Veritabanı RPC'si ayrıca aktif hesap, şube, rol ve iş sahipliğini doğrular; RPC'ye doğrudan gitmek yetki kontrolünü atlatmaz. Özel tablolar RLS ile kapalıdır ve istemci rollerine doğrudan tablo izni verilmez. SECURITY DEFINER giriş fonksiyonu özel şemadadır, sabit boş search_path kullanır ve her çağrıda kimliği kontrol eder. Dinamik kullanıcı SQL'i yoktur; RPC argümanları parametreli aktarılır. Tüm iş alanları, kişi seçimi, tarih ve liste/metin uzunlukları doğrulanır; değişikliklerde sürüm zorunludur (çakışma: 409).

Cookie kimlik doğrulaması kullanılmaz. İstekler `credentials: omit`, açık Bearer başlığı, JSON içerik ve `X-Kokpit-Request: 1` kullanır. Değişikliklerde özel başlık zorunludur; CORS yalnızca `ISLER_ALLOWED_ORIGINS` içindeki tam origin'e izin verir. Bu düzen CSRF'ye karşı ambient cookie yetkisi oluşturmaz. GitHub Pages aynı origin'deki ERP sayfalarıyla güven sınırını paylaşır. Çıktılar HTML kaçışıyla yazılır, CSP uygulanır, CSV formül başlangıçları etkisizleştirilir. API yanıtları `Cache-Control: no-store` taşır.

## API

Taban: `https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/isler-api/api`

| Yol | Yöntem | İşlev |
| --- | --- | --- |
| `/me`, `/users` | GET | Oturum kimliği/sunucu saati; kayıtlı ekip |
| `/isler`, `/isler/:id` | GET | Görülebilen işler |
| `/isler` | POST | Yeni iş |
| `/isler/:id` | PUT / DELETE | Sürümlü güncelleme / soft delete |
| `/isler/:id/yorum` | POST | `{m,version}` sunucu yazarlı yorum |
| `/isler/:id/gecmis` | GET | Son 100 geçmiş kaydı |
| `/isler/:id/sayac` | POST | `{action: "start" veya "stop",version}` |
| `/isler/:id/geri-al` | POST | `{version}`; silmeden itibaren 7 saniye |
| `/isler/:id/sirala` | POST | `{before,status,version}` |
| `/isler/toplu` | POST | `{items:[{id,version}],action,value}` |
| `/filtreler` | GET / PUT | Kullanıcıya özel `{data,version}` |
| `/settings` | GET / PUT | Ekip otomasyonu `{late,done,version}` |
| `/import` | POST | En fazla 100 iş / 1 MB, atomik içe aktarma |

Toplu action: `status`, `pri`, `who`, `delete`, `restore`. Bir işte yetki/sürüm hatası varsa tüm toplu işlem geri alınır. Silme fiziksel kayıt silmez; 7 saniyeden sonra kullanıcı geri alamaz, kayıt denetim için saklanır. Geri alma silen kişiye veya yöneticiye açıktır; normal iş yetkisi de aranır.

Sayaç `clock_timestamp()` ile başlatılır/durdurulur; sayfa kapansa da sürer. İstemcinin gönderdiği `time`/`ts` normal düzenlemede kullanılmaz. İstemci canlı süreyi sunucu saati + monoton saatle gösterir. Tamamlama sayacı durdurur. Tekrarlar transaction içinde, benzersiz parent kaydıyla bir defa üretilir; ay sonları sonraki ayın son gününe sıkıştırılır. Günlük iş her gün İstanbul 03:10'da gecikmiş işleri yükseltir ve geçmiş kaydı bırakır. Ayarlar etkin olmayan ekipler etkilenmez.

Ekran 15 saniyede bir sunucuyu yoklar. Açık düzenleme formu veya yazılmakta olan yorum/alt görev varken kullanıcının metnini korumak için yoklama bekletilir; kayıt sonrasında güncel veri yüklenir. Aynı anda değiştirilen işlerde sessiz üzerine yazma yerine hata gösterilir.

## JSON, PWA ve e-posta

JSON dışa aktarma `{tasks,auto,saved}` biçimindedir. İçe aktarma bu biçimi ve eski iş dizisini kabul eder; mevcut işleri silmeden ekler. Kayıtlı kullanıcıya birebir eşleşmeyen eski kişi adları hata verir; önce JSON içindeki adları kayıtlı kullanıcı adı/UUID'siyle eşleştirin. Eski `me` değeri kimlik sayılmaz. Eski yorum/geçmiş metni "doğrulanmamış kaynak" olarak korunur; yeni yazar ve tarih sunucuda atanır. Çalışan eski ekip otomasyonunu değiştiremez. İşler atomik aktarılır; filtre/ayar aktarımı ayrı isteklerdir ve hata halinde toast gösterilir. localStorage kaydı varsa eski prototipten JSON indirin veya DevTools'ta `kokpit-isler-v2` kaydını JSON dosyası olarak kaydedip içe aktarın; yeni sayfa eski tarayıcı kaydını kendiliğinden okumaz.

PWA manifest, 192/512 PNG simgeler ve yalnızca statik dosya izin listesi kullanan service worker içerir. API, auth, iş verisi ve dışa aktarılan dosyalar önbelleğe alınmaz. Çevrimdışı uygulama kabuğu açılır; iş okumak/değiştirmek bağlantı ister. Yeni sürümde `sw.js` önbellek sürümünü artırın.

E-posta önceki kullanıcı tercihi nedeniyle kapalıdır; gönderim yapıldığı iddia edilmez. `isler-mail` worker ve outbox/claim/ack SQL'i hazırdır. SMTP ve worker zamanlaması yapılmadı. Daha sonra `.env.isler.example` dosyasını git tarafından yok sayılan `.env` dosyasına kopyalayın, SMTP sağlayıcısını ve rastgele `ISLER_MAIL_TOKEN` değerini doldurun, `supabase secrets set --env-file ...` ile Secrets'a yükleyin. Worker'ı deploy edip güvenli Vault/pg_net zamanlamasını ekleyin; bir test teslimini doğruladıktan sonra ekip bildirim ayarını açın. Gönderen `dijital@ototr.com`. SMTP TLS zorunlu, hatalarda alıcı/parola ifşa edilmez. Kuyruk yeniden deneyebilir; SMTP at-least-once teslimde nadir kopya ileti ihtimali vardır.

## Yerel test

Node.js 24 ve Edge/Chromium gerekir:

```powershell
cd tests/isler
npm ci
npm test
npm run serve
# İkinci terminalde:
npm run browser
```

Test sunucusu `http://127.0.0.1:43824/isler/`. PGlite üzerinde gerçek migration SQL'i, tamamen sentetik kullanıcılar ve izole DB çalıştırır; canlı Supabase'e bağlanmaz. Demo kullanıcılar `admin@example.invalid`, `worker@example.invalid`, `viewer@example.invalid`; yalnızca yerel test parolası `local-test-only`. Bunlar canlı hesap değildir. API Edge için `deno check supabase/functions/isler-api/index.ts` (ilgili klasörde çalıştırın).

## Dağıtım, yedek ve geri alma

1. Güncel `origin/main` değişikliklerini koruyarak çalışın; testleri geçirin. Gizli `.env`/DB dökümü repoya girmemeli.
2. Migration öncesi `supabase/ops/isler24-predeploy-backup.sql` dosyasını bir kez çalıştırın. `isler24_backup_20261019.manifest` ile tablo ve satır sayılarını doğrulayın. Bu özel, erişimi kapalı **aynı veritabanı içi uygulama verisi anlık görüntüsüdür**; offsite/PITR veya auth/storage yedeğinin yerini tutmaz. İşletme felaket kurtarma için Supabase platform yedekleme/PITR planını ayrıca yönetmelidir.
3. Sırayla `20261018212919_isler24_multiuser.sql`, `20261018213836_isler24_schedule.sql` uygulayın. Önceki Kokpit migration'ları bu ERP'de zaten uygulanmış ön koşuldur. DDL yeni ad alanına eklenir; eski tablolar değişmez.
4. `isler-api` fonksiyonunu deploy edin. `verify_jwt=false`, yalnızca fonksiyonun kendi `auth.getUser()` doğrulaması bulunduğu için kullanılır; kimlik doğrulama kaldırılmaz. `ISLER_ALLOWED_ORIGINS=https://samivolkan.github.io`. Tarayıcıda yalnızca mevcut publishable key kullanılır. SMTP worker bu dağıtıma dahil değildir.
5. Kod commit'ini güncel `main` üzerine push edin; mevcut `Deploy GitHub Pages` workflow'u otomatik yayımlar. Başarılı workflow, HTTPS giriş sayfası, ERP bağlantısı, 401 yetkisiz API yanıtı ve cron job doğrulanmalıdır.
6. Geri alma: ilgili uygulama commit'ini `git revert <release-commit>` ile geri alın ve `main`e normal push edin. `select cron.unschedule('isler24-overdue-daily');` ile yeni cron'u durdurun. Gerekirse isler-api'yi kaldırın veya eski sürümüne döndürün. Yeni tabloları/snapshot'ı silmeyin; kullanıcı kayıtlarını koruyun. Eski `/kokpit/` çalışmaya devam eder. Veri geri yükleme gerekirse önce yeni bir yedek alın, yazmayı durdurun, manifestteki yalnızca etkilenen tabloları açık kolon listeleriyle transaction içinde geri yükleyin; tüm DB'yi körlemesine eski snapshot'a döndürmeyin. Auth/storage bu snapshot'ta bulunmaz.

Canlı gerçek hesapla parola girişi ve SMTP teslimi otomasyon testlerinde taklit edilmez. Canlı kullanıcı iş akışı ayrıca ERP hesabıyla denenmelidir; yerel testlerde iş kuralları gerçek PostgreSQL motorunda sınanır.
