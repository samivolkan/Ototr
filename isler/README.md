# TASK2 · OTOTR Görev ve Proje Merkezi

TASK2, Gr8r Studio görev arayüzünü OTOTR ERP içine taşır. Sayfa Türkçedir; mevcut ERP oturumunu kullanır ve görev/proje çalışma alanını Supabase PostgreSQL'de şube kapsamında saklar. `/isler/` eski görev sayfası yerine yeni uygulamaya yönlenir. Görev verisi tarayıcı `localStorage`'ına yazılmaz.

## Yapı

- `gr8r/src/`: uygulama kaynak kodu ve Türkçe arayüz uyarlaması.
- `gr8r/public/manifest.webmanifest`: PWA bildirimi ve 192/512 simgeler.
- `app/`: GitHub Pages'e gönderilen derlenmiş statik uygulama.
- `index.html`: `/isler/` adresini `app/` sürümüne yönlendirir.
- `sw.js`: statik dosyaları önbelleğe alır; API, kimlik doğrulama ve iş verisini hiçbir zaman önbelleğe almaz.
- `../supabase/migrations/20261121090000_task2_workspace.sql`: özel şema, sunucu tarafı workspace API'si, sürüm kontrolü ve rol denetimleri.
- `../supabase/functions/isler-api/`: mevcut ERP Edge Function; `workspace` çağrılarını TASK2 RPC'sine yönlendirir.

## Kimlik ve erişim

Kullanıcı ERP'ye giriş yaptıktan sonra `/isler/` doğrudan açılır. Görev uygulaması yeni parola veya kullanıcı seçimi ekranı göstermez. Kimlik, aktif ERP hesabı ve mevcut `kokpit_roles` kaydından alınır. Bir pano ERP `branch_id` değerine göre ayrılır.

- Yönetici ekipteki tüm görev ve projeleri yönetebilir.
- Çalışan kendi oluşturduğu, sorumlu olduğu veya yardımcısı olduğu görevleri değiştirebilir. Bu kontrol PostgreSQL RPC'sinde yeniden yapılır.
- İzleyici panoyu okuyabilir; sunucuda yazma isteği reddedilir.
- Yeni yorum yazarı sunucuda oturum açmış ERP kullanıcısına bağlanır.
- Güncellemeler sürümlüdür. Çakışan yazma 409 döndürür ve istemci toast gösterir.

## Önceki görevlerin aktarımı

TASK2 ilk kez boş bir workspace gördüğünde mevcut `/api/isler` kayıtlarını okur; başlık, açıklama, sorumlu, yardımcılar, proje, etiketler, tarihler, öncelik, durum, alt görev, tekrar, yorum ve geçmişi TASK2 biçimine taşır. İlk düzenleme bu veriyi ortak workspace olarak kaydeder. Bu yol eski API kayıtlarını silmez. Önceki prototipin `kokpit-isler-v2` localStorage kaydı sunucudan okunamayacağı için JSON dışa aktarma/içe aktarma yoluyla ayrıca alınmalıdır.

## Yerelde çalıştırma ve doğrulama

Node.js 24 ve Microsoft Edge/Chromium gerekir. Komutlar depo köküne göre:

```powershell
cd tests/isler
npm ci
npm test
npm run serve
# İkinci terminalde:
npm run browser
```

Test sunucusu `http://127.0.0.1:43824/isler/` adresinde sentetik ERP kullanıcıları ve izole PGlite veritabanı açar. Canlı Supabase'e bağlanmaz. Tarayıcı testi Türkçe navigasyonu, Pano/Liste/Takvim/Zaman Çizelgesi görünümlerini, görev ve XSS girdisini, alt görev/yorum eklemeyi, ERP oturumunu, eski görev aktarımını, sunucuya kaydetme/yeniden yükleme ve iki kullanıcı arasında güncelleme almayı kontrol eder.

Gr8r kaynak kontrolleri:

```powershell
cd isler/gr8r
npm ci
npm run lint
npm run build
```

Build çıktısı `isler/app/` konumuna yazılır. Mevcut dağıtımda Vite, dış runtime config ve ortak render modülünün import şekli için uyarı; JavaScript paketi için 500 KB üzeri uyarısı verir. Build ve lint yine başarılı olmalıdır.

## Sunucu ve GitHub Pages dağıtımı

GitHub Pages statik içeriği barındırır; çalışma alanı verisi mevcut Supabase altyapısında kalır. `TASK2` dalına push tek başına yayını değiştirmez: `.github/workflows/deploy-pages.yml` yalnızca `main` dalında dağıtım yapar. Canlıya almadan önce aşağıdaki adımlar release/merge aşamasında yürütülmelidir:

1. Supabase projesinden şifreli, doğrulanmış bir veritabanı yedeği alın. Görev tablosu özel RLS altında olduğundan yedeğin kapsamına `app_private` şemasını ve ilgili kayıtları dahil edin.
2. `20261121090000_task2_workspace.sql` migration'ını Supabase veritabanına uygulayın. Aynı dağıtımda `isler-api` Edge Function değişikliklerini deploy edin.
3. `ISLER_ALLOWED_ORIGINS` değerinin yalnızca ERP'nin gerçek HTTPS origin'ini içerdiğini doğrulayın. Gizli anahtarları Git'e veya statik dosyalara koymayın.
4. Yerel testleri ve migration sonrası canlı API smoke testlerini çalıştırın. Sonra TASK2 değişikliklerini `main`e alın; GitHub Pages workflow'u statik uygulamayı HTTPS ile yayımlar.
5. ERP oturumuyla `/isler/` açıldığını, mevcut görevlerin aktarıldığını, yönetici/çalışan/izleyici yetkilerini ve ikinci kullanıcıda güncelleme görünmesini kontrol edin.

GitHub Pages'de mevcut proje HTTPS kullanır. VPS, SSH, pm2, systemd veya Let's Encrypt bu dağıtım yolunda kullanılmaz. E-posta bildirimleri bu sürümde açılmamıştır; SMTP bilgisi sağlanmadığı için e-posta gönderildiği iddia edilmez.

## Yedek ve geri alma

- Migration öncesi Supabase yedeğinin dosyasını, zamanını ve tablo kapsamını kaydedin; geri yüklemeyi yeni bir yedek almadan başlatmayın.
- Arayüzü geri almak için release commit'ini revert edip normal Pages dağıtımını çalıştırın. Yeni TASK2 tablosunu otomatik silmeyin; veriyi koruyun.
- Eski statik sayfaya geçiş gerekiyorsa yalnızca uygulama yönlendirmesini/menüsünü geri alın. `kokpit.ototr.com` veya diğer ERP sayfalarını değiştirmeyin.
- Veritabanı fonksiyonlarını geri almak gerekiyorsa eski Edge Function sürümünü yeniden deploy edin. TASK2 tablosunu silmek yerine erişimi kapalı bırakın; kayıtlar yedekte tutulur.

## Şu anki yayın sınırı

Bu dalın yerel uygulaması ve testleri Supabase şema/Edge değişikliklerini içerir; GitHub Pages workflow'u feature branch'ten dağıtım yapmaz ve bu dal canlı veritabanına migration uygulamaz. Canlı ekran ancak migration ve Edge Function üretim projesine uygulanıp değişiklikler `main`e alındıktan sonra TASK2 olur.
