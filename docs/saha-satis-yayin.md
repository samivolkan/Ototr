# Saha Satış kontrol sürümü

18 Ekim 2026

- Menü: Müşteri & Satış → Saha Satış. Aynı sekmede açılır; uygulamadaki “ERP’ye dön” bağlantısı ana menüye döner.
- Adres: https://samivolkan.github.io/Ototr/saha-satis/
- Kaynak: `samivolkan/ototr-saha-satis`, `4871f91cb9befaf3baa362e00da21e54e30ab103`.
- Galeri kaydı, üç günlük ziyaret takvimi, erteleme/iptal, ziyaret sonucu, referans takibi ve galeriye dönüşüm içerir. Örnek kayıt üretilmez.

## Veri sınırı

Bu yayın arayüz kontrolü içindir. Gerçek 468 galerilik özel katalog, telefonlar, kaynak Excel dosyaları ve araştırma raporu pakete dahil değildir. Yeni tarayıcıda liste boş açılır. Deneme kayıtları yalnızca o tarayıcının `localStorage` alanında saklanır; ERP veritabanına veya ekip hesaplarına bağlanmaz. Yerel bilgisayardaki katalog ve ziyaretler bu adrese otomatik taşınmaz.

## Paketleme

Kaynak repo commit’inin yalnızca Git’teki `app/` klasörü `git archive` ile temiz dizine çıkarıldı; böylece `src/private/`, mevcut `dist/`, ortam dosyaları ve tarayıcı kayıtları dışarıda kaldı.

1. Temiz kaynakta `npm ci`, `npm run check:runtime`, `npx tsc`.
2. `node --experimental-strip-types --test tests/catalog.test.ts tests/visits.test.ts tests/referrals.test.ts`.
3. `npx vite build --base=/Ototr/saha-satis/`.
4. `dist/client` içeriği `saha-satis/` dizinine alındı. Yalnızca üretilmiş dosyalardaki `/assets/iphone/`, `/assets/android/`, `/assets/status/` ve `/brand/` URL’leri bu alt yolun başına göre uyarlandı; mobil kaynak dosyaları değişmedi. Üretilen JS adı yeni içeriğin SHA-256 özetine göre yenilendi.
5. HTML’e ERP dönüş bağlantısı ve noindex eklendi. `release.json` kaynak sürümünü ve özel katalog bulunmadığını kaydeder.

## Kontroller

- 20 veri/ziyaret/referans testi geçti; TypeScript ve Vite derlemesi geçti.
- 28 korunan mobil çalışma zamanı dosyasının kontrolü geçti.
- Yayın dosyaları özel katalogdaki 468 kimlik ve kaynak dosya adlarıyla karşılaştırıldı; eşleşme yok. Kaynakta özel katalog klasörü yok.
- ERP alt yolunda logo, iPhone/Pixel görselleri, gezinme, üç günlük takvim ve boş liste için galeri ekleme yönlendirmesi tarayıcıda kontrol edilir.
- GitHub Pages’in mevcut `Deploy GitHub Pages` akışı main push’u ile yayınlar. Başka modüllerin dosyaları veya verileri bu çalışma kapsamında güncellenmez.

## Geri alma

Bu yayının commit’ini `git revert` ile geri alın. Bu işlem Saha Satış menü eklemesini ve eklenen statik paketi geri alır; tarayıcıdaki kayıtları silmez.
