# OTOTR Rapor Web

CRM içinde düzenlenebilir, A4 yazdırılabilir 19 sayfalık web rapor editörü.

## Açılış
- `docs/rapor-web/index.html`
- CRM parametreli: `docs/rapor-web/index.html?workOrderId=<UUID/IE-NO>`
- Kısa kök rota: `crm-rapor-web.html?workOrderId=<ID>`
- Bayi portal rotası: `bayi-portal/?report=web&workOrderId=<ID>`

## Veri davranışı
1. URL'deki `workOrderId` okunur.
2. Aynı origin'deki `ototr-dealer-live-workorders-v1` demo kaydından araç/rapor bilgileri hydrate edilmeye çalışılır.
3. Web rapor taslağı `ototr-report-web-v1:<workOrderId>` anahtarında saklanır.
4. `CRM'e Kaydet` mevcut demo iş emrine `webReport.payload` olarak taslak ekler.
5. Production entegrasyonu için `postMessage` (`ototr:report-web:ready`, `ototr:report-web:save`, `ototr:report-web:hydrate`) ve `window.OTOTR_REPORT_WEB_ADAPTER` hook'u bulunur.

## Düzenleme
- Her metin `contenteditable` ve `data-path` ile veri modeline bağlıdır.
- Sağ panel seçilen metni ayrıca düzenler.
- Görsel alanlar tıklanıp değiştirilebilir.
- JSON içe/dışa aktarım vardır.
- Tutarlılık kontrolü, bilinen rapor çelişkilerini otomatik işaretler.
- `PDF / Yazdır` A4 olarak 19 sayfayı üretir.

## Antet
Sayfa zemini mevcut `docs/ototr-a4-master-locked-300dpi.png` dosyasını kullanır. Böylece rapor web'e taşınırken antet tek merkezden korunur.
