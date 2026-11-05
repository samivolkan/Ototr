# Franchise staging worker dağıtımı — 2026-11-05

Hedef: Supabase `ototr-staging` (`bsjkohwbtrfwrqcyhsfz`).

## Dağıtılan işlevler

| İşlev | Sürüm | Durum | JWT | Bundle SHA-256 |
|---|---:|---|---|---|
| `franchise-outbox-worker` | 2 | ACTIVE | Zorunlu | `1847505c84d4b8bd7363b07b19643469298bb5f94f40d3f808b6558e37e82726` |
| `franchise-provider-worker` | 1 | ACTIVE | Zorunlu | `e64404eff3e9ec8e0f3ad7e151b46b0e35867284130b9df00d6033b0378d5446` |

Her iki uç nokta JWT olmadan yapılan sentetik POST isteğini HTTP 401 ile reddetti.

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
- `20261105380000_franchise_outbox_scheduler.sql` ile dakikalık `franchise-outbox-dispatch` cron işi kuruldu; dispatcher Data API dışındaki `app_private` şemasındadır.
- Scheduler konfigürasyonu varsayılan ve mevcut durumda `enabled=false`, `worker_url=null` olduğu için cron çağrısı güvenli `null` no-op döner. Gerçek gönderim etkin değildir.
- Worker secret değeri tabloda tutulmaz; etkinleştirme sonrasında yalnız Supabase Vault içindeki `franchise_worker_secret` adıyla okunur. Secret en az 32 karakter değilse dispatcher fail-closed hata verir.
- `anon` ve `authenticated` dispatcher çalıştıramaz; yalnız `service_role` yetkilidir. Hosted kontrolde cron kurulu, disabled no-op ve rol yetkileri birlikte doğrulandı.
- Staging outbox ve provider kuyruklarında kalıcı kayıt yok.
- Gerçek mesaj, e-imza veya departman olayı gönderilmedi.
- Worker'lar JWT'ye ek olarak ayrı worker secret'ı doğrular; secret yokken işlem fail-closed kapanır.

Bu dağıtım Edge Runtime etkinliğini ve kontrollü HTTPS taşıma sözleşmesini kanıtlar. G12 ancak gerçek staging endpoint'leri, allowlist, kanal secret'ları ve departman sahiplerinin teslimat kabulü tamamlandığında geçebilir.
