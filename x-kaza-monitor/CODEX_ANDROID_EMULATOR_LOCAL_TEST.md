# OtoTR Olay Merkezi — Windows/Android Emulator Yerel Test Görevi

Amaç: `codex/olay-merkezi-android-apk` dalındaki OtoTR Olay Merkezi Android uygulamasını kullanıcının Windows PC’sinde gerçek Android Emulator ile açmak, backend’i yerelde çalıştırmak ve demo + canlı API akışlarını elle gözlemlenebilir şekilde test etmek.

## Zorunlu ilkeler

- Kullanıcının mevcut OtoTR çalışma dosyalarını bozma.
- Çalışmayı `codex/olay-merkezi-android-apk` dalında yap.
- Gerekmedikçe mevcut Flutter ana uygulamasını değiştirme; Olay Merkezi entrypoint’i `lib/incident_app_main.dart` olarak kalmalı.
- X API tokenı isteme; haber sitesi/TRT Haber akışını kullan.
- Test sırasında terminal ve Android Emulator penceresi açık kalsın; kullanıcı uygulamayı elle tıklayabilsin.
- Mevcut test edilmiş APK: `OtoTR-Olay-Merkezi-v0.1.3.apk`. Yerelde yeniden build edersen hash ve yolunu raporla.

## 1. Ortam tanısı

PowerShell/CMD üzerinde şunları doğrula ve eksik olanları mümkünse düzelt:

```powershell
flutter doctor -v
adb version
flutter devices
node --version
npm --version
```

Android SDK/ADB yolu bulunamıyorsa Android Studio kurulumunu ve `%LOCALAPPDATA%\Android\Sdk` yolunu otomatik tespit et. `adb.exe` için tipik yol `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`.

## 2. Android Emulator aç

Mevcut AVD varsa onu kullan. Yoksa Android Studio/SDK araçları mevcutsa Pixel 6 benzeri bir AVD oluştur. Tercih:

- API 35
- x86_64
- Pixel 6

Emülatörü **görünür pencereyle** başlat. Headless kullanma.

Doğrula:

```powershell
adb devices
```

En az bir `emulator-... device` görünmeli.

## 3. Backend’i Windows PC’de başlat

Repo içinde:

```powershell
cd x-kaza-monitor\server
npm install
npm run check
npm test
npm start
```

Backend `127.0.0.1:8787` üzerinde ayağa kalkmalı.

Doğrula:

```powershell
curl.exe http://127.0.0.1:8787/api/health
curl.exe http://127.0.0.1:8787/api/sources
```

Emülatörden Windows hostuna erişim için Android Emulator adresi `10.0.2.2` kullanılmalı. Uygulamadaki sunucu alanı:

```text
http://10.0.2.2:8787
```

olmalı.

## 4. Uygulamayı emülatöre kur/aç

Önce mümkünse kaynak koddan release APK üret:

```powershell
flutter pub get
flutter analyze --no-fatal-infos lib/incident_app_main.dart
flutter build apk --release --target lib/incident_app_main.dart
```

Üretilen APK tipik olarak:

```text
build\app\outputs\flutter-apk\app-release.apk
```

Kur:

```powershell
adb install -r build\app\outputs\flutter-apk\app-release.apk
```

Uygulamayı aç. Gerekirse paket adı:

```text
com.example.ototr_branch_app
```

Kullanıcı Android Emulator penceresinde ana ekranı görmeli.

## 5. Elle görülebilir test senaryoları

### Test A — Demo plaka sorgusu

1. Uygulama ilk açılışta DEMO durumunda olabilir.
2. Plaka alanında `06 KAZ 26` bırak.
3. `Doğrulanmış kaydı ara` butonuna bas.
4. Beklenen:
   - `Demo: 1 doğrulanmış eşleşme bulundu`
   - `06 KAZ 26`
   - `TRT Haber — Türkiye`
   - `OCR %91`

### Test B — TRT demo taraması

1. Kaynaklar bölümüne kaydır.
2. `TRT Haber’i şimdi tara` butonuna bas.
3. Demo modundaysa beklenen:

```text
Demo: TRT taraması simüle edildi • 4 plaka adayı
```

### Test C — Canlı yerel backend bağlantısı

1. Sunucu adresini `http://10.0.2.2:8787` yap.
2. `Bağlantıyı test et` butonuna bas.
3. Beklenen: DEMO etiketi CANLI’ya dönmeli ve sağlık durumu başarı göstermeli.
4. `/api/sources` sonucu TRT Haber kaynağını göstermeli.

### Test D — TRT Haber gerçek backend taraması

Canlı bağlantı kurulduktan sonra:

1. `TRT Haber’i şimdi tara` butonuna bas.
2. Backend terminal loglarını izle.
3. Uygulama donmamalı/çökmemeli.
4. Tarama tamamlanırsa kaynak KPI’ları güncellenmeli.
5. Ağ/RSS/OCR hatası varsa hatayı kullanıcıya okunur biçimde göster; uygulama açık kalmalı.

### Test E — Plaka sorgusu canlı API

Backend’de onaylı/demo seeded kayıt varsa `06 KAZ 26` veya mevcut onaylı plakayı sorgula. Yalnız tam/onaylı eşleşmenin gösterildiğini doğrula.

## 6. Kanıtlar

Test boyunca şu ekran görüntülerini repo dışındaki geçici bir klasöre kaydet:

- Emulator ana ekran
- Demo plaka eşleşmesi
- TRT tarama sonucu
- CANLI backend bağlantısı
- Varsa canlı TRT kaynak KPI ekranı

Ayrıca terminal çıktılarını `x-kaza-monitor/local-test-output/` altında `.gitignore` kapsamına girecek şekilde veya `%TEMP%` altında tut; büyük logları commit etme.

## 7. Sorun çıkarsa düzelt

Özellikle kontrol et:

- Windows Firewall port 8787
- `HOST=127.0.0.1` emülatör erişimini engelliyorsa backend’i güvenli biçimde `0.0.0.0` üzerinde çalıştırma ihtiyacı. Bu durumda güvenlik mekanizmasının `ADMIN_API_TOKEN` gereksinimini dikkate al; tokenı repo içine yazma.
- Android cleartext HTTP izni
- `10.0.2.2` erişimi
- Port çakışması
- Flutter/Gradle/SDK uyumsuzluğu
- Uygulama splash’ta takılı kalması

Gerekirse yalnız gerekli minimal kod/yapılandırma düzeltmesini yap, `flutter analyze`, backend `npm run check`, `npm test` ve Android build’i yeniden çalıştır.

## 8. Teslim

Sonunda kullanıcıya terminalde kısa bir rapor göster:

```text
OtoTR Olay Merkezi Yerel Emulator Testi
----------------------------------------
Emulator: PASS/FAIL
APK install: PASS/FAIL
App launch: PASS/FAIL
Backend health: PASS/FAIL
Android -> backend: PASS/FAIL
Demo plate lookup: PASS/FAIL
TRT scan button: PASS/FAIL
Live source connection: PASS/FAIL

APK: <tam yol>
Backend: http://127.0.0.1:8787
Emulator API: http://10.0.2.2:8787
```

Test bittikten sonra **emülatörü ve backend terminalini kapatma**; kullanıcı elle denemeye devam etsin.
