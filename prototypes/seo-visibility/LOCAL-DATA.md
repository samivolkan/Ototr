# Özel yerel Google raporları

Bu bağlantı yalnız yerel test içindir. Canlı kokpit ve reklam ayarlarını değiştirmez.

## Çalıştırma

1. Bağımlılıkları `npm install` ile kurun.
2. Kaynak deposunun dışında özel bir klasör hazırlayın. Google masaüstü OAuth istemcisinin indirilen JSON dosyasını burada `oauth-client.json` adıyla saklayın.
3. PowerShell: `$env:SEO_PRIVATE_DIR='özel klasörün mutlak yolu'`; ardından `node server/local.mjs`.
4. Ayrı terminalde `npm run dev -- --host 127.0.0.1 --port 4173`.
5. `http://127.0.0.1:4173/?design=studio&view=live` adresinde Google’a bağlanın ve Verileri şimdi al düğmesine basın.

Servis 127.0.0.1:4174 ile sınırlıdır. OAuth geri dönüşü `/oauth/callback` yoludur. Search Console ve Analytics Data API etkin olmalı; hesap ilgili mülklere erişebilmelidir. Bu OTOTR prototipinde mülk seçimi servis kodunda tanımlıdır.

## Gizlilik ve sınırlar

- Yalnız `webmasters.readonly` ve `analytics.readonly` izinleri kullanılır.
- Erişim/yenileme tokenları sadece sunucu belleğinde tutulur. Servis kapanınca tekrar giriş gerekir.
- Rapor önbelleği özel klasöre `api-cache.json` olarak yazılır. Bu klasörü, OAuth dosyasını veya gerçek raporları Git'e ya da genel yayına eklemeyin.
- Otomatik yenileme isteğe bağlıdır: panel açık ve görünürken saatte bir. Sayfa yenilenince seçim sıfırlanır; bilgisayar kapalıyken çalışan kalıcı görev yoktur.
- Search Console ve GA4 API ile alınır. Ads ve İşletme Profili bu sürümde geçmiş rapor dosyalarıdır; otomatik API bağlantıları yoktur.
- Ads ayrıntıları ve üst özetlerin tarih kapsamı farklı olabilir; dönemleri ekranda ayrı gösterilir ve birleştirilmez.
- Dönüşüm ayarları kısmen incelenmiştir. Canlı etiket tetikleme, izin yönetimi ve mükerrerlik kontrolü tamamlanmamıştır.
- CRM/gelir ertelendi. İletişim tıklamaları satış sayılmaz; ROAS üretilmez.
- Statik Sites/GitHub yayını özel servise veya gerçek verilere sahip değildir.

## Kontroller

`npm test`, `npm run test:sites`, `npm run build`.
