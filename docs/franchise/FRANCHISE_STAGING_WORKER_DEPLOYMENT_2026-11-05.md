# Franchise staging worker dağıtımı — 2026-11-05

Hedef: Supabase `ototr-staging` (`bsjkohwbtrfwrqcyhsfz`).

## Dağıtılan işlevler

| İşlev | Sürüm | Durum | JWT | Bundle SHA-256 |
|---|---:|---|---|---|
| `franchise-outbox-worker` | 1 | ACTIVE | Zorunlu | `ad21b5d790341c4caab0ed52c5183dcb3758cb10f5d9b0d6a4e54f1c63850794` |
| `franchise-provider-worker` | 1 | ACTIVE | Zorunlu | `e64404eff3e9ec8e0f3ad7e151b46b0e35867284130b9df00d6033b0378d5446` |

Her iki uç nokta JWT olmadan yapılan sentetik POST isteğini HTTP 401 ile reddetti.

## Güvenlik sınırı

- Provider secret'ları tanımlanmadı.
- Gerçek ERP veya iletişim endpoint'i tanımlanmadı.
- Worker tetikleme zamanlaması açılmadı.
- Gerçek mesaj, e-imza veya departman olayı gönderilmedi.
- Worker'lar JWT'ye ek olarak ayrı worker secret'ı doğrular; secret yokken işlem fail-closed kapanır.

Bu dağıtım yalnız kod paketinin staging Edge Runtime üzerinde derlenip aktifleştiğini kanıtlar. G12 ancak gerçek staging endpoint'leri, allowlist, kanal secret'ları ve kontrollü sentetik teslimat kanıtları tamamlandığında geçebilir.
