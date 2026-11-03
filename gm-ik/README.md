# OTOTR GM İK Sistemi

Bu klasör, kullanıcı tarafından sağlanan Claude HTML prototipinin güvenli pilot olarak içe alınmış kanonik kaynağıdır.

- `index.html`: yalnızca kurgusal verilerle çalışan, tarayıcı `localStorage` alanında saklanan bağımsız pilot.
- `erp-nav-integration.js`: canlı ERP sol menüsüne **GM İK Sistemi** başlığını ve **İK Yönetim Merkezi** bağlantısını ekleyen küçük bağlayıcı.
- `hr-api-bridge.mjs`: yalnız allowlist'teki salt-okunur GM İK RPC'lerini publishable key + mevcut ERP oturumuyla çağıran fail-closed istemci.
- `hr-live-controller.mjs`: sunucu readiness/dashboard durumunu gösterir; tarayıcı demosunu sunucuya taşımaz.
- `hr-runtime-config.js`: kaynak depoda boş ve güvenli runtime config; yayın ortamı yalnız public URL ve `sb_publishable_` anahtarla değiştirebilir.
- Üretim boşlukları ve kabul kriterleri: `docs/hr/GM_HR_SYSTEM_ANALYSIS_2026-11-03.md`.
- Dağıtımda ortak ERP oturum kapısı her HTML girişine eklenir. CSP yalnızca mevcut OTOTR Supabase oturum uçlarına ağ izni verir; pilotun İK verileri yine sadece yerel, kurgusal örnektir.

## Güvenlik sınırı

Bu pilot gerçek çalışan verisi için uygun değildir. Auth/RLS, private belge metadata sınırı, değiştirilemez audit, gölge bordro/SGK kanıtı ve sentetik yedek/geri yükleme temeli kodlanmıştır. Ancak 2. madde (KVKK/veri sınıflandırması) kullanıcı kararıyla kapsam dışıdır; veritabanı gerçek kişi ve hassas belge yazımını reddeder, production kapısı bloklu kalır.

Yerel kabul: `npm run test:gm-hr`.

## Yayın yolu

GitHub Pages dağıtımında klasör köke `gm-ik/` olarak kopyalanır. ERP kök `index.html` dosyası, `assets/app-core.min.js` sonrasında şu bağı yükler:

```html
<script src="gm-ik/erp-nav-integration.js?v=20261103"></script>
```
