# Looker yerel test ortamı

Bu ortam gerçek Looker hesabı, API anahtarı veya müşteri verisi kullanmaz. Üç ERP rolü ve mock Looker iframe'i ile uçtan uca entegrasyon akışını doğrular.

## Çalıştırma

```powershell
cd tests\looker
npm install
npx playwright install chromium
npm test
```

Elle incelemek için:

```powershell
npm run serve
```

Ardından `http://127.0.0.1:43821/index.html#looker` adresini açın. Varsayılan rol CEO'dur.

Test rolünü değiştirmek için önce aşağıdaki adreslerden birini açın, ardından Looker sayfasını yenileyin:

- `/__test__/session?role=CEO`
- `/__test__/session?role=REGION_MANAGER`
- `/__test__/session?role=BRANCH_MANAGER`

## Kapsam

- Dokuz pano kartının görünmesi
- CEO mock panosunun iframe içinde açılması
- Şube müdürünün yalnız kendi şube kapsamını görmesi
- Şube müdürünün finans panosundan 403 alması
- Mevcut sunucu servisinin birim testleri
