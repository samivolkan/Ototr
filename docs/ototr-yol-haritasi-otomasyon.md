# OTOTR Yol Haritasi ve Otomasyon Plani

Guncelleme tarihi: 2026-05-25

Bu dosya OTOTR projesinde eksikleri rastgele degil, otomatik kontrol edilen kalite kapilariyla adim adim kapatmak icin ana takip dosyasidir. Gercek musteri verisi, kimlik bilgisi, API key, bayi gizli bilgisi veya canli finans verisi bu repoya eklenmemelidir.

## Mevcut Durum

Proje iki ana yuzeyden olusuyor:

- Flutter sube operasyon MVP'si: is emri, teknisyen akisi, kanit, rapor kapisi, rol/yetki ve Supabase hazirliklari.
- HTML/JS ERP-CRM prototipi: CEO kokpiti, bayi portali, franchise, finans, kalite, hukuk ve demo veri servisleri.

2026-05-25 kalite kontrol sonucu:

- Gecti: `flutter pub get`
- Gecti: `flutter analyze`
- Gecti: `flutter test`
- Gecti: `node tools/test-demo-data.mjs`
- Gecti: `node tools/test-vin-service.mjs`
- Kaldi: `node tools/test-vin-ui.mjs`
- Kaldi: `node tools/test-android-preview.mjs`
- Kaldi: `node tools/test-index.mjs`

Kalite kapisi tek komut:

```powershell
.\tools\ototr_quality_gate.cmd
```

Script son calisma raporunu `docs/ototr-quality-gate-latest.json` dosyasina yazar.

## P0 - Kontrol Kulesi

Amac: Her degisikligin minimum kalite kontrolunden gecmesini saglamak.

- [x] Flutter analyze/test kapisi dogrulandi.
- [x] Demo data ve VIN servis testleri dogrulandi.
- [x] Tek komut kalite kapisi eklendi: `tools/ototr_quality_gate.ps1`.
- [ ] Playwright runtime yolu README veya runbook icinde netlestirilecek.
- [ ] `tools/test-vin-ui.mjs` regresyonu giderilecek: VIN inputu 17 karakteri korumali.
- [ ] `tools/test-android-preview.mjs` regresyonu giderilecek: preview icinde `data-screen="intake"` akisi tekrar bulunur olmali.
- [ ] `tools/test-index.mjs` regresyonu giderilecek: bayi/dealer route tekrar `#page-dealer.active` durumuna gelmeli.
- [ ] Turkce karakter/encoding bozulmalari taranacak ve kaynak dosyalarda standart UTF-8 kararina baglanacak.
- [ ] Kirli calisma agacindaki silinmis/degismis dosyalar ayrica degerlendirilecek; kullanici onayi olmadan revert yapilmayacak.

## P1 - Sube Operasyon Mobil MVP

Amac: Bayide gunluk ekspertiz operasyonunu hizlandiran ilk guvenilir mobil akisi kapatmak.

- [ ] Is emri olusturma, sahiplenme, birakma, mudur atamasi ve audit log kurallari uctan uca stabilize edilecek.
- [ ] Arac kabul, musteri bilgisi, paket secimi, ekspertiz modulu, kanit ve rapor kapisi tek ana senaryoda testlenecek.
- [ ] Offline taslak ve senkron kuyrugu hata durumlariyla birlikte testlenecek.
- [ ] Fotograf kaniti icin minimum metadata, zorunlu kanit ve yukleme kuyruge alma kurallari netlestirilecek.
- [ ] Supabase baglantisi icin demo/canli ayrimi, RLS ve rol bazli ekran erisimi denetlenecek.
- [ ] Android emulator uzerinde kritik akisin manuel QA checklist'i tamamlanacak.

## P2 - ERP/CRM Web MVP

Amac: Tek dosyalik demo prototipini gercek merkezi yonetim sistemine tasimak.

- [ ] Ana veri modeli sabitlenecek: branch, user, customer, vehicle, work order, report, franchise lead, finance, quality ticket.
- [ ] CRM lead ve randevu akisi gercek repository/API katmanina baglanacak.
- [ ] Bayi/sube karti Google profil, kalite, ciro, royalty ve risk alanlariyla tek kaynak haline getirilecek.
- [ ] Franchise satis hunisi icin not, takip tarihi, sozlesme ve kurulum asamalari kalici kayda baglanacak.
- [ ] Finans/royalty hesaplari ve gecikme alarmlari test verisiyle dogrulanacak.
- [ ] Kalite/kriz alarmi sikayet, NPS, Google yorum ve rapor kalite sinyallerini birlestirecek.

## P3 - Rapor, Guven ve Musteri Teslimi

Amac: Ekspertiz raporunu hem bayi operasyonu hem de musteri guveni icin kanitlanabilir hale getirmek.

- [ ] Rapor veri omurgasi ile Flutter rapor onizleme birebir eslenecek.
- [ ] Riskli bulgularda fotograf kaniti ve musteri dili ozeti zorunluluklari netlestirilecek.
- [ ] PDF/HTML rapor tasarimi tek rapor modelinden uretilecek.
- [ ] QR ile rapor dogrulama ve public report link guvenligi RLS ile kontrol edilecek.
- [ ] Rapor tutarlilik validatoru canli senaryolara gore genisletilecek.

## P4 - Entegrasyonlar ve Canliya Hazirlik

Amac: MVP dogrulandiktan sonra operasyonu pazarlama, finans ve musteri ile baglamak.

- [ ] WhatsApp/SMS izin ve bildirim altyapisi eklenecek.
- [ ] Odeme, e-fatura/e-arsiv ve royalty tahsilat entegrasyonlari planlanacak.
- [ ] Google Isletme Profili sahiplik ve yorum takip akisi merkez kontrolune alinacak.
- [ ] Yetki, audit, KVKK, log ve yedekleme kontrolleri canliya gecis checklist'ine baglanacak.
- [ ] Pilot bayi icin demo veri temizleme ve test dagitim plani hazirlanacak.

## Adim Adim Eksik Kapatma Dongusu

Her calisma turunda ayni disiplin uygulanacak:

1. `.\tools\ototr_quality_gate.cmd` calistirilir.
2. Ilk P0 hata secilir; ayni anda birden fazla kritik yuzey dagitilmaz.
3. Hata kodda giderilir ve ilgili regression testi guclendirilir.
4. Kalite kapisi tekrar calistirilir.
5. Bu dosyadaki durum ve `docs/ototr-quality-gate-latest.json` raporu guncel kalir.
6. P0 temizlenmeden P1/P2 buyuk ozelliklere gecilmez.

## Ilk Siradaki Net Aksiyonlar

1. VIN UI regresyonunu duzelt: `tools/test-vin-ui.mjs` 17 karakter normalizasyon beklentisini gecmeli.
2. Android preview route/regresyonunu duzelt: `data-screen="intake"` hedefi test tarafinda veya preview HTML tarafinda tekrar tutarli olmali.
3. ERP/CRM dealer route regresyonunu duzelt: `tools/test-index.mjs` bayi route gecisini `#page-dealer.active` olarak gorebilmeli.
4. Playwright NODE_PATH gereksinimini kalite scripti ve README ile tek standarda indir.
5. P0 temizlendikten sonra Supabase/RLS ve mobil offline senkron P1 islerine gec.
