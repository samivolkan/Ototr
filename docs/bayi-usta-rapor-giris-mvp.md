# Bayi / Usta Rapor Giris MVP

Bu dokuman, sube acilisinda bayi personelinin kullanacagi ilk rapor giris ekraninin urun kapsamidir. Amac; paket ve arac kabulunden baslayan kaydin, usta tablet girisleriyle OTOTR raporuna kanitli ve kontrollu sekilde akmasidir.

## Karar

Mevcut OTOTR rapor bolum basliklari MVP icin yeterlidir. Diger bayiilerin doldurdugu rapor ornekleri su anda zorunlu degildir; ikinci turda eksik kontrol noktasi, farkli paket dili ve saha aliskanliklarini yakalamak icin faydali olur.

## Ana Akis

1. CRM/randevu kaydi gelir.
2. Sekreterya veya musteri kabul personeli is emri acar.
3. Paket, arac ve taraf bilgileri girilir.
4. Sistem `expertise_case` dosyasini olusturur.
5. Usta tablet istasyonlari sirayla doldurur.
6. Islemli/kritik bulgular fotograf ve olcum kaniti ister.
7. Sube muduru yayin kilitlerini kontrol eder.
8. Onaylanan rapor sekreterya basim ve QR teslim kuyruguna duser.

## Ekran Bolumleri

### 1. Is Emri, Paket ve Operasyon

- Is emri no
- Rapor no
- Randevu kaynagi
- Sube
- Paket
- Paket tutari
- Odeme durumu
- Rapor nushasi
- Acilis, kabul, kontrol baslangic ve teslim saatleri

### 2. Arac, Taraflar ve Riza

- Plaka
- Sasi no
- Motor no
- Marka/model
- Model yili
- Yakit, vites, giris km
- Yedek anahtar
- Ruhsat asli
- Yakit seviyesi
- Arac temizlik durumu
- Talep eden, alici, satici, ruhsat sahibi
- Rapor erisim yetkisi
- KVKK/riza
- Yol testi onayi
- Arac sahibi beyani

### 3. Usta Tablet Istasyonlari

- Arac kabul
- Kaporta/boya
- Sasi/direk/podye
- Motor/mekanik
- OBD/elektronik
- Fren/suspansiyon/lastik

Her istasyon ayni veri formatini kullanir:

- Durum kodu
- Onem seviyesi
- Olcum degeri
- Cihaz/seri no
- Fotograf/video kaniti
- Usta ham notu
- Musteri dili
- Tavsiye edilen aksiyon

### 4. Kaporta/Boya 58 Nokta

Kaporta girisi parca bazli olmalidir. Islemli nokta fotograf olmadan kapanmamalidir.

Baslangic kodlari:

- O: Orijinal panel
- B: Boyali panel
- LB: Lokal boyali
- D: Degisen
- PP: Plastik parca
- EM: Ezik mevcut
- KCBD: Kaporta boya detay
- 2K: Ikinci usta kontrolu

### 5. Yayin Kilitleri

Rapor su sartlar saglanmadan basima dusmemelidir:

- Plaka, sasi ve motor no eslesmesi tamam.
- Islemli kaporta noktalarinda fotograf kaniti var.
- KVKK, yol testi ve paket kapsam riza kaydi var.
- OBD/dyno/fren gibi cihaz ekranlari veya yapilamadi nedeni var.
- Usta ham notu musteri diline cevrildi.
- Riskli ifade veya agir islem varsa sube muduru/ikinci usta onayi var.

### 6. Sekreterya Basim

Sekreterya teknik veriyi degistirmez. Sadece onaylanan veriden ciktisini uretir:

- Musteri raporu
- Bayide kalacak nusha
- Fotograf albumu
- Garanti/kapsam eki
- QR dogrulama linki
- Teslim imzasi

## Sonraki Uygulama Adimi

1. Ekrandaki form alanlarini localStorage demo kaydina bagla. **Yapildi:** `ototr-dealer-live-workorders-v1` anahtariyla demo is emri, paket ve usta gorevleri saklaniyor.
2. `expertiseCases`, `inspectionTasks`, `inspectionResults`, `bodyPaintResults`, `mediaAssets` demo verilerini olustur. **Ilk prototip yapildi:** tek bir demo obje icinde is emri, gorevler, sonuc ve kanitlar tutuluyor.
3. Rapor tasarim ekranini bu demo veriden besle. **Ilk baglanti yapildi:** aktif is emrindeki usta sonuclari `reportData` icine isleniyor; kaporta, mekanik, OBD ve fren satirlari rapor onizlemesine yansiyor.
4. Yayina engel kurallari icin gercek validasyon fonksiyonu yaz.
5. Sonraki fazda backend API ve PostgreSQL tablo yapisina tasi.

## Canli Demo Akisi

Mevcut prototipte bayi ekranindan su akis denenebilir:

1. Bayi Paneli acilir.
2. `Canli Demo Is Emri Acilisi` formunda musteri, arac ve paket secilir.
3. `Is Emri Olustur` butonu yeni `IE-*` kaydi acar.
4. Secilen pakete gore usta gorevleri otomatik olusur:
   - Standart: kabul, kaporta/boya, motor/mekanik, fren/suspansiyon.
   - Full: Standart kapsama ek olarak sasi/direk ve OBD/elektronik.
   - Premium 360: Full kapsama ek olarak alt takim, donanim/kondisyon ve kayit sorgulari.
5. `Usta Girisini Kaydet` aksiyonu ilgili goreve ornek teknik sonuc, kanit ve musteri dili ekler.
6. Tum paket gorevleri tamamlaninca `Mudur Onayi Ver` raporu sekreterya kuyruğuna dusurur.
7. `Rapor Bas` raporu teslim edildi durumuna alir.

Bu akista backend yoktur; amac canli sistem davranisini dogru tasarlamak ve ekranda gostermektir.
