# Franchise staging worker dağıtımı — 2026-11-05

Hedef: Supabase `ototr-staging` (`bsjkohwbtrfwrqcyhsfz`).

## Dağıtılan işlevler

| İşlev | Sürüm | Durum | JWT | Bundle SHA-256 |
|---|---:|---|---|---|
| `franchise-outbox-worker` | 2 | ACTIVE | Zorunlu | `1847505c84d4b8bd7363b07b19643469298bb5f94f40d3f808b6558e37e82726` |
| `franchise-provider-worker` | 1 | ACTIVE | Zorunlu | `e64404eff3e9ec8e0f3ad7e151b46b0e35867284130b9df00d6033b0378d5446` |

Her iki uç nokta JWT olmadan yapılan sentetik POST isteğini HTTP 401 ile reddetti.

İkinci kimlik katmanı ayrıca hosted olarak doğrulandı: geçerli staging publishable JWT ile gateway geçildi, ancak bilerek yanlış `x-franchise-worker-secret` / `x-franchise-provider-secret` gönderildiğinde her iki işlev de kendi uygulama katmanında `Yetkisiz worker çağrısı` ve HTTP 401 döndürdü. Readiness manifesti hem başlıksız gateway 401 hem JWT'li yanlış-secret 401 kanıtını zorunlu tutar.

Muhasebe, Finans'tan bağımsız `accounting` kaynağına ayrıldı. Üç sürümlü Muhasebe olay sözleşmesi staging veritabanına uygulandı; Edge Function v2 bundle içinde `FRANCHISE_ACCOUNTING_ADAPTER_URL/TOKEN` ve Muhasebe sözleşmeleri doğrulandı.

## Kontrollü sentetik HTTPS taşıma kabulü

- Worker ile aynı `handler.mjs` teslim katmanı, kalıcı yapılandırma oluşturmadan `https://httpbin.org/anything` kontrollü echo uç noktasına karşı çalıştırıldı.
- Finans, Muhasebe, Hukuk, İK, Academy, Operasyon, Tedarik, BT, Pazarlama, Kalite, İSG, Mimari ve Görev Merkezi kaynaklarının her biri için birer sentetik olay gönderildi; 13/13 teslim ve 13/13 finish callback başarılı oldu.
- Uzaktaki echo yanıtında Bearer başlığı, `idempotency-key`, olay kimliği, franchise dosyası referansı ve sürümlü minimal sözleşme gövdesi doğrulandı. Token ve olay içeriği kanıt çıktısına yazılmadı.
- Olaylar yalnız sentetik referanslardan oluştu; gerçek aday, çalışan, şube, finans, sözleşme veya iletişim verisi gönderilmedi.
- Staging `franchise-outbox-worker` için JWT’siz POST tekrar HTTP 401 döndü.
- Makinece okunabilir kanıt `gm-franchise/adapter-transport-hosted-evidence.json` içindedir. Bu test gerçek ERP/departman sağlayıcısı değildir ve G12’yi tek başına kapatmaz.

## Güvenlik sınırı

- Provider secret'ları tanımlanmadı.
- Gerçek ERP veya iletişim endpoint'i tanımlanmadı.
- Tek bir genel hazır bayrağı G12'yi geçiremez. On üç departman kaynağı ve dört sağlayıcı kanalı ayrı ayrı `configured`, başarılı HTTP probe durumu, kanıt SHA-256 özeti, kabul sahibi ve UTC kabul zamanı taşımadıkça readiness fail-closed kalır.
- Kabul kanıtı `gm-franchise/integration-acceptance-evidence.mjs` ile önce dry-run doğrulanır. Araç yalnız staging, sentetik veri, HTTPS, 2xx probe, idempotency/yanıt özetleri ve temizlenmiş kanıt dosyasını kabul eder; token, Authorization, secret, ham payload veya kişisel veri anahtarlarını reddeder. Probe çalıştıran ve kabul eden iki ayrı Supabase kullanıcı UUID'si zorunludur; kişi kendi sonucunu onaylayamaz. Özel kanıt dosyası public repository dışında tutulur; manifestte ham UUID yerine yalnız SHA-256 aktör referansları saklanır. `--write` verilmeden deployment manifestini değiştirmez.
- `20261105380000_franchise_outbox_scheduler.sql` ve `20261105410000_franchise_provider_scheduler.sql` ile dakikalık `franchise-outbox-dispatch` ve `franchise-provider-dispatch` cron işleri kuruldu; iki dispatcher da Data API dışındaki `app_private` şemasındadır.
- Her iki scheduler konfigürasyonu varsayılan ve mevcut durumda `enabled=false`, `worker_url=null` olduğu için cron çağrıları güvenli `null` no-op döner. Departman outbox ve iletişim/e-imza provider gönderimleri etkin değildir.
- Worker secret değeri tabloda tutulmaz; etkinleştirme sonrasında yalnız Supabase Vault içindeki `franchise_worker_secret` adıyla okunur. Secret en az 32 karakter değilse dispatcher fail-closed hata verir.
- Edge Function `verifyJwt=true` kapısı için uygulama worker secret'ından bağımsız `franchise_worker_invoke_jwt` Vault kaydı zorunludur. Cron isteği hem `Authorization: Bearer …` hem `x-franchise-worker-secret` başlığını taşır; service-role anahtarı migration veya konfigürasyon tablosunda tutulmaz.
- `20261105400000_franchise_scheduler_jwt_regex_fix.sql` ile JWT biçim kontrolü PostgreSQL kaçışından bağımsız `[.]` ayırıcısına geçirildi. Hosted doğrulamada örnek üç parçalı JWT biçimi kabul, geçersiz biçim ret, iki ayrı kimlik başlığı mevcut ve disabled scheduler no-op sonucu birlikte `PASS` verdi.
- `anon` ve `authenticated` dispatcher çalıştıramaz; yalnız `service_role` yetkilidir. Hosted kontrolde iki cron kurulu, iki disabled no-op ve provider rol yetkileri birlikte doğrulandı.
- Staging outbox ve provider kuyruklarında kalıcı kayıt yok.
- Gerçek mesaj, e-imza veya departman olayı gönderilmedi.
- Worker'lar JWT'ye ek olarak ayrı worker secret'ı doğrular; secret yokken işlem fail-closed kapanır.

Bu dağıtım Edge Runtime etkinliğini ve kontrollü HTTPS taşıma sözleşmesini kanıtlar. G12 ancak gerçek staging endpoint'leri, allowlist, kanal secret'ları ve departman sahiplerinin teslimat kabulü tamamlandığında geçebilir.
