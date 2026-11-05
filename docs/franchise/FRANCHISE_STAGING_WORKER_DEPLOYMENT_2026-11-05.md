# Franchise staging worker dağıtımı — 2026-11-05

Hedef: Supabase `ototr-staging` (`bsjkohwbtrfwrqcyhsfz`).

## Dağıtılan işlevler

| İşlev | Sürüm | Durum | JWT | Bundle SHA-256 |
|---|---:|---|---|---|
| `franchise-outbox-worker` | 1 | ACTIVE | Zorunlu | `ad21b5d790341c4caab0ed52c5183dcb3758cb10f5d9b0d6a4e54f1c63850794` |
| `franchise-provider-worker` | 1 | ACTIVE | Zorunlu | `e64404eff3e9ec8e0f3ad7e151b46b0e35867284130b9df00d6033b0378d5446` |

Her iki uç nokta JWT olmadan yapılan sentetik POST isteğini HTTP 401 ile reddetti.

## Kontrollü sentetik HTTPS taşıma kabulü

- Worker ile aynı `handler.mjs` teslim katmanı, kalıcı yapılandırma oluşturmadan `https://httpbin.org/anything` kontrollü echo uç noktasına karşı çalıştırıldı.
- Finans, Hukuk, İK, Academy, Operasyon, Tedarik, BT, Pazarlama, Kalite, İSG, Mimari ve Görev Merkezi kaynaklarının her biri için birer sentetik olay gönderildi; 12/12 teslim ve 12/12 finish callback başarılı oldu.
- Uzaktaki echo yanıtında Bearer başlığı, `idempotency-key`, olay kimliği, franchise dosyası referansı ve sürümlü minimal sözleşme gövdesi doğrulandı. Token ve olay içeriği kanıt çıktısına yazılmadı.
- Olaylar yalnız sentetik referanslardan oluştu; gerçek aday, çalışan, şube, finans, sözleşme veya iletişim verisi gönderilmedi.
- Staging `franchise-outbox-worker` için JWT’siz POST tekrar HTTP 401 döndü.
- Makinece okunabilir kanıt `gm-franchise/adapter-transport-hosted-evidence.json` içindedir. Bu test gerçek ERP/departman sağlayıcısı değildir ve G12’yi tek başına kapatmaz.

## Güvenlik sınırı

- Provider secret'ları tanımlanmadı.
- Gerçek ERP veya iletişim endpoint'i tanımlanmadı.
- Worker tetikleme zamanlaması açılmadı.
- Gerçek mesaj, e-imza veya departman olayı gönderilmedi.
- Worker'lar JWT'ye ek olarak ayrı worker secret'ı doğrular; secret yokken işlem fail-closed kapanır.

Bu dağıtım Edge Runtime etkinliğini ve kontrollü HTTPS taşıma sözleşmesini kanıtlar. G12 ancak gerçek staging endpoint'leri, allowlist, kanal secret'ları ve departman sahiplerinin teslimat kabulü tamamlandığında geçebilir.
