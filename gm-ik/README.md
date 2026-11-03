# OTOTR GM İK Sistemi

Bu klasör, kullanıcı tarafından sağlanan Claude HTML prototipinin güvenli pilot olarak içe alınmış kanonik kaynağıdır.

- `index.html`: yalnızca kurgusal verilerle çalışan, tarayıcı `localStorage` alanında saklanan bağımsız pilot.
- `erp-nav-integration.js`: canlı ERP sol menüsüne **GM İK Sistemi** başlığını ve **İK Yönetim Merkezi** bağlantısını ekleyen küçük bağlayıcı.
- Üretim boşlukları ve kabul kriterleri: `docs/hr/GM_HR_SYSTEM_ANALYSIS_2026-11-03.md`.
- Dağıtımda ortak ERP oturum kapısı her HTML girişine eklenir. CSP yalnızca mevcut OTOTR Supabase oturum uçlarına ağ izni verir; pilotun İK verileri yine sadece yerel, kurgusal örnektir.

## Güvenlik sınırı

Bu pilot gerçek çalışan verisi için uygun değildir. Auth/RLS, şifreli belge saklama, özel nitelikli kişisel veri ayrımı, değiştirilemez denetim izi, bordro/SGK entegrasyonu, yedekleme ve hukuki/KVKK onayları tamamlanmadan üretim İK sistemi olarak kullanılmamalıdır.

## Yayın yolu

GitHub Pages dağıtımında klasör köke `gm-ik/` olarak kopyalanır. ERP kök `index.html` dosyası, `assets/app-core.min.js` sonrasında şu bağı yükler:

```html
<script src="gm-ik/erp-nav-integration.js?v=20261103"></script>
```
